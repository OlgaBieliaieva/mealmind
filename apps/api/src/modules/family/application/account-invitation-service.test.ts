import { describe, expect, it, vi } from "vitest";
import type {
  AccountInvitationDelivery,
  AccountInvitationRepository,
} from "../domain/account-invitation.js";
import { createAccountInvitationService } from "./account-invitation-service.js";

function dependencies() {
  const invitation = {
    recipientEmail: "person@example.com",
    status: "PENDING" as const,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    sentAt: null,
  };
  const repository: AccountInvitationRepository = {
    create: vi.fn(async () => ({ id: "invitation-id", view: invitation })),
    readForMember: vi.fn(async () => invitation),
    rotate: vi.fn(async () => ({
      id: "invitation-id",
      recipientEmail: invitation.recipientEmail,
      view: invitation,
    })),
    markSent: vi.fn(async () => undefined),
    revoke: vi.fn(async () => undefined),
    inspect: vi.fn(async () => ({
      status: "PENDING" as const,
      recipientEmailHint: "pe***@example.com",
    })),
    claim: vi.fn(async () => undefined),
  };
  const delivery: AccountInvitationDelivery = { send: vi.fn(async () => undefined) };
  return { repository, delivery };
}

describe("account invitation service", () => {
  it("normalizes email, persists only a token hash and sends the raw token to the allowed origin", async () => {
    const { repository, delivery } = dependencies();
    const service = createAccountInvitationService(repository, delivery, {
      appOrigin: "http://localhost:3000",
      ttlHours: 72,
    });
    await service.create("user-id", "member-id", " Person@Example.COM ");
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: "person@example.com",
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    const persisted = vi.mocked(repository.create).mock.calls[0]![0];
    const delivered = vi.mocked(delivery.send).mock.calls[0]![0];
    expect(delivered.activationUrl).toMatch(
      /^http:\/\/localhost:3000\/account-activation\/start\?token=/,
    );
    expect(delivered.activationUrl).not.toContain(persisted.tokenHash);
    expect(repository.markSent).toHaveBeenCalledWith("invitation-id", expect.any(Date));
  });

  it("hashes claim tokens before repository access", async () => {
    const { repository, delivery } = dependencies();
    const service = createAccountInvitationService(repository, delivery, {
      appOrigin: "http://localhost:3000",
      ttlHours: 72,
    });
    await service.claim("a".repeat(43), "user-id", " Person@Example.COM ");
    expect(repository.claim).toHaveBeenCalledWith({
      tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      userId: "user-id",
      verifiedEmail: "person@example.com",
    });
    expect(vi.mocked(repository.claim).mock.calls[0]![0].tokenHash).not.toBe("a".repeat(43));
  });
});
