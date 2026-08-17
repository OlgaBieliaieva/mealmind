import { Prisma, type DatabaseClient } from "@mealmind/db";
import { invitationErrors } from "../application/account-invitation-errors.js";
import {
  FamilyMemberNotFoundError,
  FamilyOwnerRequiredError,
} from "../application/family-errors.js";
import type {
  AccountInvitationInspection,
  AccountInvitationRepository,
  AccountInvitationStatus,
  AccountInvitationView,
} from "../domain/account-invitation.js";

type Db = DatabaseClient;
type InvitationRow = {
  recipientEmail: string;
  status: AccountInvitationStatus;
  expiresAt: Date;
  sentAt: Date | null;
};

function effectiveStatus(row: InvitationRow): AccountInvitationStatus {
  return row.status === "PENDING" && row.expiresAt <= new Date() ? "EXPIRED" : row.status;
}

function view(row: InvitationRow): AccountInvitationView {
  return Object.freeze({
    recipientEmail: row.recipientEmail,
    status: effectiveStatus(row),
    expiresAt: row.expiresAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
  });
}

function emailHint(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

async function ownerContext(database: Db, userId: string) {
  const memberships = await database.familyMembership.findMany({
    where: { userId, status: "ACTIVE", endedAt: null, family: { archivedAt: null } },
    take: 2,
  });
  if (memberships.length !== 1 || memberships[0]?.role !== "OWNER") {
    throw new FamilyOwnerRequiredError();
  }
  return memberships[0];
}

async function dependent(database: Db, familyId: string, memberId: string) {
  const member = await database.familyMember.findFirst({
    where: {
      id: memberId,
      familyId,
      archivedAt: null,
      personProfile: { archivedAt: null, userId: null },
    },
    select: { personProfileId: true },
  });
  if (member === null) throw new FamilyMemberNotFoundError();
  return member;
}

function isUniqueConstraint(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

const SERIALIZABLE_TRANSACTION_ATTEMPTS = 3;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSerializationConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code === "P2034") {
    return true;
  }

  if (error.code !== "P2010" || !isRecord(error.meta)) {
    return false;
  }

  const driverAdapterError = error.meta.driverAdapterError;

  if (!isRecord(driverAdapterError) || !isRecord(driverAdapterError.cause)) {
    return false;
  }

  return (
    driverAdapterError.cause.originalCode === "40001" ||
    driverAdapterError.cause.kind === "TransactionWriteConflict"
  );
}

async function withSerializableRetry(operation: () => Promise<void>): Promise<void> {
  for (let attempt = 1; attempt <= SERIALIZABLE_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      await operation();
      return;
    } catch (error) {
      const isLastAttempt = attempt === SERIALIZABLE_TRANSACTION_ATTEMPTS;
      if (!isSerializationConflict(error) || isLastAttempt) {
        throw error;
      }
    }
  }
}

export function createPrismaAccountInvitationRepository(
  database: DatabaseClient,
): AccountInvitationRepository {
  const repository: AccountInvitationRepository = {
    async create(input) {
      const membership = await ownerContext(database, input.actorUserId);
      const member = await dependent(database, membership.familyId, input.memberId);
      const existingUser = await database.user.findFirst({
        where: { email: { equals: input.recipientEmail, mode: "insensitive" }, deletedAt: null },
        select: { id: true },
      });
      if (existingUser !== null) throw invitationErrors.existingAccount();

      await database.familyMemberAccountInvitation.updateMany({
        where: {
          personProfileId: member.personProfileId,
          status: "PENDING",
          expiresAt: { lte: new Date() },
        },
        data: { status: "EXPIRED" },
      });
      try {
        const created = await database.familyMemberAccountInvitation.create({
          data: {
            familyId: membership.familyId,
            personProfileId: member.personProfileId,
            invitedByUserId: input.actorUserId,
            recipientEmail: input.recipientEmail,
            tokenHash: input.tokenHash,
            expiresAt: input.expiresAt,
          },
        });
        return { id: created.id, view: view(created) };
      } catch (error) {
        if (isUniqueConstraint(error)) throw invitationErrors.alreadyPending();
        throw error;
      }
    },

    async readForMember(actorUserId, memberId) {
      const membership = await ownerContext(database, actorUserId);
      const member = await dependent(database, membership.familyId, memberId);
      const invitation = await database.familyMemberAccountInvitation.findFirst({
        where: { familyId: membership.familyId, personProfileId: member.personProfileId },
        orderBy: { createdAt: "desc" },
      });
      return invitation === null ? null : view(invitation);
    },

    async rotate(input) {
      const membership = await ownerContext(database, input.actorUserId);
      const member = await dependent(database, membership.familyId, input.memberId);
      const invitation = await database.familyMemberAccountInvitation.findFirst({
        where: {
          familyId: membership.familyId,
          personProfileId: member.personProfileId,
          status: "PENDING",
        },
        orderBy: { createdAt: "desc" },
      });
      if (invitation === null) throw invitationErrors.notFound();
      const updated = await database.familyMemberAccountInvitation.update({
        where: { id: invitation.id },
        data: { tokenHash: input.tokenHash, expiresAt: input.expiresAt, sentAt: null },
      });
      return { id: updated.id, recipientEmail: updated.recipientEmail, view: view(updated) };
    },

    async markSent(invitationId, sentAt) {
      await database.familyMemberAccountInvitation.updateMany({
        where: { id: invitationId, status: "PENDING" },
        data: { sentAt },
      });
    },

    async revoke(actorUserId, memberId) {
      const membership = await ownerContext(database, actorUserId);
      const member = await dependent(database, membership.familyId, memberId);
      const result = await database.familyMemberAccountInvitation.updateMany({
        where: {
          familyId: membership.familyId,
          personProfileId: member.personProfileId,
          status: "PENDING",
        },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
      if (result.count === 0) throw invitationErrors.notFound();
    },

    async inspect(tokenHash): Promise<AccountInvitationInspection> {
      const invitation = await database.familyMemberAccountInvitation.findUnique({
        where: { tokenHash },
      });
      if (invitation === null) return { status: "INVALID", recipientEmailHint: null };
      const status = effectiveStatus(invitation);
      if (status === "EXPIRED" && invitation.status === "PENDING") {
        await database.familyMemberAccountInvitation.updateMany({
          where: { id: invitation.id, status: "PENDING" },
          data: { status: "EXPIRED" },
        });
      }
      return Object.freeze({ status, recipientEmailHint: emailHint(invitation.recipientEmail) });
    },

    async claim(input) {
      await withSerializableRetry(() =>
        database.$transaction(
          async (tx) => {
            const locked = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM family_member_account_invitations
            WHERE token_hash = ${input.tokenHash}
            FOR UPDATE
          `;
            const invitationId = locked[0]?.id;
            if (invitationId === undefined) throw invitationErrors.invalid();
            const invitation = await tx.familyMemberAccountInvitation.findUnique({
              where: { id: invitationId },
              include: {
                personProfile: { select: { id: true, userId: true, archivedAt: true } },
                family: { select: { archivedAt: true } },
              },
            });
            if (invitation === null) throw invitationErrors.invalid();
            const currentUser = await tx.user.findUnique({
              where: { id: input.userId },
              select: {
                email: true,
                onboardingCompletedAt: true,
                personProfile: { select: { id: true } },
              },
            });
            if (currentUser === null) throw invitationErrors.invalid();

            if (
              invitation.status === "ACCEPTED" &&
              invitation.personProfile.userId === input.userId
            )
              return;
            if (invitation.status !== "PENDING") throw invitationErrors.inactive();
            if (invitation.expiresAt <= new Date()) {
              await tx.familyMemberAccountInvitation.update({
                where: { id: invitation.id },
                data: { status: "EXPIRED" },
              });
              throw invitationErrors.expired();
            }
            if (invitation.recipientEmail.toLowerCase() !== input.verifiedEmail.toLowerCase()) {
              throw invitationErrors.emailMismatch();
            }
            if (currentUser.email.toLowerCase() !== input.verifiedEmail.toLowerCase()) {
              throw invitationErrors.emailMismatch();
            }
            const member = await tx.familyMember.findFirst({
              where: {
                familyId: invitation.familyId,
                personProfileId: invitation.personProfileId,
                archivedAt: null,
              },
              select: { id: true },
            });
            if (
              member === null ||
              invitation.family.archivedAt !== null ||
              invitation.personProfile.archivedAt !== null
            )
              throw invitationErrors.inactive();
            if (invitation.personProfile.userId !== null) throw invitationErrors.existingAccount();

            const activeMemberships = await tx.familyMembership.count({
              where: { userId: input.userId, status: "ACTIVE", endedAt: null },
            });
            if (
              activeMemberships !== 0 ||
              currentUser.onboardingCompletedAt !== null ||
              currentUser.personProfile !== null
            )
              throw invitationErrors.incompatibleContext();

            await tx.personProfile.update({
              where: { id: invitation.personProfileId },
              data: { userId: input.userId },
            });
            await tx.familyMembership.create({
              data: {
                familyId: invitation.familyId,
                userId: input.userId,
                role: "MEMBER",
                status: "ACTIVE",
              },
            });
            const now = new Date();
            await tx.user.update({
              where: { id: input.userId },
              data: { onboardingCompletedAt: now },
            });
            await tx.familyMemberAccountInvitation.update({
              where: { id: invitation.id },
              data: { status: "ACCEPTED", acceptedAt: now },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        ),
      );
    },
  };
  return Object.freeze(repository);
}
