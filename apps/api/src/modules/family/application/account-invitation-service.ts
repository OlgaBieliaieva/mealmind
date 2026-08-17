import { createHash, randomBytes } from "node:crypto";
import type {
  AccountInvitationDelivery,
  AccountInvitationRepository,
} from "../domain/account-invitation.js";
import { invitationErrors } from "./account-invitation-errors.js";

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createSecret() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function createAccountInvitationService(
  repository: AccountInvitationRepository,
  delivery: AccountInvitationDelivery,
  options: { readonly appOrigin: string; readonly ttlHours: number },
) {
  const expiresAt = () => new Date(Date.now() + options.ttlHours * 60 * 60 * 1_000);
  const activationUrl = (token: string) => {
    const url = new URL("/account-activation/start", options.appOrigin);
    url.searchParams.set("token", token);
    return url.toString();
  };
  async function deliver(id: string, recipientEmail: string, token: string) {
    try {
      await delivery.send({
        recipientEmail,
        activationUrl: activationUrl(token),
        idempotencyKey: `family-account-invitation/${id}/${hashToken(token).slice(0, 16)}`,
      });
      await repository.markSent(id, new Date());
    } catch {
      throw invitationErrors.deliveryUnavailable();
    }
  }
  return Object.freeze({
    async create(actorUserId: string, memberId: string, recipientEmail: string) {
      const email = normalizeEmail(recipientEmail);
      const secret = createSecret();
      const invitation = await repository.create({
        actorUserId,
        memberId,
        recipientEmail: email,
        tokenHash: secret.tokenHash,
        expiresAt: expiresAt(),
      });
      await deliver(invitation.id, email, secret.token);
      return repository.readForMember(actorUserId, memberId);
    },
    read: (actorUserId: string, memberId: string) =>
      repository.readForMember(actorUserId, memberId),
    async resend(actorUserId: string, memberId: string) {
      const secret = createSecret();
      const invitation = await repository.rotate({
        actorUserId,
        memberId,
        tokenHash: secret.tokenHash,
        expiresAt: expiresAt(),
      });
      await deliver(invitation.id, invitation.recipientEmail, secret.token);
      return repository.readForMember(actorUserId, memberId);
    },
    revoke: (actorUserId: string, memberId: string) => repository.revoke(actorUserId, memberId),
    inspect(token: string) {
      return repository.inspect(hashToken(token));
    },
    claim(token: string, userId: string, verifiedEmail: string) {
      return repository.claim({
        tokenHash: hashToken(token),
        userId,
        verifiedEmail: normalizeEmail(verifiedEmail),
      });
    },
  });
}

export type AccountInvitationService = ReturnType<typeof createAccountInvitationService>;
