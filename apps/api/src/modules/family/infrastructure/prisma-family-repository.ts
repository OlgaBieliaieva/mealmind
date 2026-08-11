import type { DatabaseClient } from "@mealmind/db";

import {
  DependentMemberRequiredError,
  FamilyMemberNotFoundError,
  FamilyOwnerRequiredError,
  InvalidFamilyContextError,
  OnboardingRequiredError,
  PersonProfileNotFoundError,
} from "../application/family-errors.js";
import type {
  FamilyMemberView,
  FamilyRepository,
  FamilyRole,
  FamilyView,
  OnboardingInput,
  ProfilePatchInput,
  SessionContext,
} from "../domain/family-repository.js";

type Db = DatabaseClient;

function dateOnly(value: Date | null): string | null {
  return value?.toISOString().slice(0, 10) ?? null;
}

function memberView(member: {
  id: string;
  personProfile: {
    id: string;
    userId: string | null;
    firstName: string;
    lastName: string | null;
    birthDate: Date | null;
    biologicalSex: "MALE" | "FEMALE" | "UNSPECIFIED" | null;
  };
}): FamilyMemberView {
  return Object.freeze({
    id: member.id,
    profileId: member.personProfile.id,
    firstName: member.personProfile.firstName,
    lastName: member.personProfile.lastName,
    birthDate: dateOnly(member.personProfile.birthDate),
    biologicalSex: member.personProfile.biologicalSex,
    isAccountOwner: member.personProfile.userId !== null,
  });
}

async function memberships(database: Db, userId: string) {
  return database.familyMembership.findMany({
    where: { userId, status: "ACTIVE", endedAt: null, family: { archivedAt: null } },
    take: 2,
    include: { family: true },
  });
}

async function currentMembership(database: Db, userId: string) {
  const found = await memberships(database, userId);
  if (found.length === 0) throw new OnboardingRequiredError();
  if (found.length !== 1) throw new InvalidFamilyContextError();
  return found[0]!;
}

function familyView(membership: Awaited<ReturnType<typeof currentMembership>>): FamilyView {
  return Object.freeze({
    id: membership.family.id,
    name: membership.family.name,
    timeZone: membership.family.timeZone,
    weekStartsOn: membership.family.weekStartsOn,
    role: membership.role as FamilyRole,
  });
}

async function ownerMembership(database: Db, userId: string) {
  const membership = await currentMembership(database, userId);
  if (membership.role !== "OWNER") throw new FamilyOwnerRequiredError();
  return membership;
}

const profileSelect = {
  id: true,
  userId: true,
  firstName: true,
  lastName: true,
  birthDate: true,
  biologicalSex: true,
} as const;

async function findMember(database: Db, familyId: string, memberId: string) {
  const member = await database.familyMember.findFirst({
    where: { id: memberId, familyId, archivedAt: null },
    include: { personProfile: { select: profileSelect } },
  });
  if (member === null) throw new FamilyMemberNotFoundError();
  return member;
}

function profileData(input: ProfilePatchInput) {
  return {
    ...(input.firstName === undefined ? {} : { firstName: input.firstName }),
    ...(input.lastName === undefined ? {} : { lastName: input.lastName }),
    ...(input.birthDate === undefined
      ? {}
      : {
          birthDate: input.birthDate === null ? null : new Date(`${input.birthDate}T00:00:00.000Z`),
        }),
    ...(input.biologicalSex === undefined ? {} : { biologicalSex: input.biologicalSex }),
  };
}

export function createPrismaFamilyRepository(database: DatabaseClient): FamilyRepository {
  const repository: FamilyRepository = {
    async readSession(userId): Promise<SessionContext> {
      const user = await database.user.findUnique({
        where: { id: userId },
        select: {
          onboardingCompletedAt: true,
          personProfile: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      if (user === null) throw new OnboardingRequiredError();
      const found = await memberships(database, userId);
      if (found.length > 1) throw new InvalidFamilyContextError();
      if (user.onboardingCompletedAt !== null && found.length !== 1)
        throw new InvalidFamilyContextError();
      const membership = found[0];
      return Object.freeze({
        onboardingCompleted: user.onboardingCompletedAt !== null,
        profile: user.personProfile,
        family: membership === undefined ? null : familyView(membership),
      });
    },

    async completeOnboarding(userId, input: OnboardingInput) {
      await database.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { onboardingCompletedAt: true },
        });
        if (user === null) throw new OnboardingRequiredError();
        const active = await memberships(tx as Db, userId);
        if (
          active.length > 1 ||
          (user.onboardingCompletedAt !== null && active.length !== 1) ||
          (user.onboardingCompletedAt === null &&
            active.length === 1 &&
            active[0]?.role !== "OWNER")
        )
          throw new InvalidFamilyContextError();
        if (user.onboardingCompletedAt !== null) return;

        const completeProfile =
          input.birthDate !== undefined &&
          input.biologicalSex !== undefined &&
          input.heightCm !== undefined &&
          input.weightKg !== undefined &&
          input.activityLevel !== undefined &&
          input.weightGoalType !== undefined;
        const profile = await tx.personProfile.upsert({
          where: { userId },
          create: {
            userId,
            firstName: input.firstName,
            ...(input.lastName === undefined ? {} : { lastName: input.lastName }),
            ...(input.birthDate === undefined
              ? {}
              : { birthDate: new Date(`${input.birthDate}T00:00:00.000Z`) }),
            ...(input.biologicalSex === undefined ? {} : { biologicalSex: input.biologicalSex }),
            profileCompletedAt: completeProfile ? new Date() : null,
          },
          update: {
            ...profileData(input),
            archivedAt: null,
            ...(completeProfile ? { profileCompletedAt: new Date() } : {}),
          },
        });
        if (input.heightCm !== undefined || input.weightKg !== undefined)
          await tx.bodyMeasurement.create({
            data: {
              personProfileId: profile.id,
              ...(input.heightCm === undefined ? {} : { heightCm: input.heightCm }),
              ...(input.weightKg === undefined ? {} : { weightKg: input.weightKg }),
              measuredAt: new Date(),
              source: "MANUAL",
            },
          });
        if (input.activityLevel !== undefined)
          await tx.personActivityPeriod.create({
            data: {
              personProfileId: profile.id,
              activityLevel: input.activityLevel,
              effectiveFrom: new Date(),
              source: "MANUAL",
            },
          });
        if (input.weightGoalType !== undefined)
          await tx.personWeightGoal.create({
            data: {
              personProfileId: profile.id,
              type: input.weightGoalType,
              status: "ACTIVE",
              source: "MANUAL",
            },
          });

        let familyId = active[0]?.familyId;
        if (familyId === undefined) {
          const family = await tx.family.create({
            data: {
              name: "Моя сім'я",
              createdByUserId: userId,
              timeZone: "Europe/Kyiv",
              weekStartsOn: "MONDAY",
            },
          });
          familyId = family.id;
          await tx.familyMembership.create({
            data: { familyId, userId, role: "OWNER", status: "ACTIVE" },
          });
        }
        await tx.familyMember.upsert({
          where: { familyId_personProfileId: { familyId, personProfileId: profile.id } },
          create: { familyId, personProfileId: profile.id },
          update: { archivedAt: null },
        });
        await tx.user.update({
          where: { id: userId },
          data: { onboardingCompletedAt: new Date() },
        });
      });
      return repository.readSession(userId);
    },

    async readFamily(userId) {
      return familyView(await currentMembership(database, userId));
    },
    async updateFamily(userId, input) {
      const membership = await ownerMembership(database, userId);
      const family = await database.family.update({
        where: { id: membership.familyId },
        data: {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.timeZone === undefined ? {} : { timeZone: input.timeZone }),
          ...(input.weekStartsOn === undefined
            ? {}
            : { weekStartsOn: input.weekStartsOn as "MONDAY" }),
        },
      });
      return Object.freeze({
        id: family.id,
        name: family.name,
        timeZone: family.timeZone,
        weekStartsOn: family.weekStartsOn,
        role: "OWNER" as const,
      });
    },
    async listMembers(userId) {
      const membership = await currentMembership(database, userId);
      const found = await database.familyMember.findMany({
        where: { familyId: membership.familyId, archivedAt: null },
        include: { personProfile: { select: profileSelect } },
        orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
      });
      return found.map(memberView);
    },
    async createDependent(userId, input) {
      const membership = await ownerMembership(database, userId);
      const created = await database.$transaction(async (tx) => {
        const profile = await tx.personProfile.create({ data: profileData(input) as never });
        return tx.familyMember.create({
          data: { familyId: membership.familyId, personProfileId: profile.id },
          include: { personProfile: { select: profileSelect } },
        });
      });
      return memberView(created);
    },
    async updateDependent(userId, memberId, input) {
      const membership = await ownerMembership(database, userId);
      const member = await findMember(database, membership.familyId, memberId);
      if (member.personProfile.userId !== null) throw new DependentMemberRequiredError();
      const profile = await database.personProfile.update({
        where: { id: member.personProfile.id },
        data: profileData(input),
      });
      return memberView({ ...member, personProfile: profile });
    },
    async archiveDependent(userId, memberId) {
      const membership = await ownerMembership(database, userId);
      const member = await findMember(database, membership.familyId, memberId);
      if (member.personProfile.userId !== null) throw new DependentMemberRequiredError();
      const now = new Date();
      await database.$transaction([
        database.familyMember.update({ where: { id: member.id }, data: { archivedAt: now } }),
        database.personProfile.update({
          where: { id: member.personProfile.id },
          data: { archivedAt: now },
        }),
      ]);
    },
    async readOwnProfile(userId) {
      const profile = await database.personProfile.findUnique({
        where: { userId },
        select: profileSelect,
      });
      if (profile === null) throw new PersonProfileNotFoundError();
      const membership = await currentMembership(database, userId);
      const member = await database.familyMember.findFirst({
        where: { familyId: membership.familyId, personProfileId: profile.id, archivedAt: null },
        include: { personProfile: { select: profileSelect } },
      });
      if (member === null) throw new PersonProfileNotFoundError();
      return memberView(member);
    },
    async updateOwnProfile(userId, input) {
      const profile = await database.personProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (profile === null) throw new PersonProfileNotFoundError();
      await database.personProfile.update({ where: { id: profile.id }, data: profileData(input) });
      return repository.readOwnProfile(userId);
    },
  };
  return Object.freeze(repository);
}
