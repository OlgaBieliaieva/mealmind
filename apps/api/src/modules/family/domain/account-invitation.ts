export type AccountInvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

export interface AccountInvitationView {
  readonly recipientEmail: string;
  readonly status: AccountInvitationStatus;
  readonly expiresAt: string;
  readonly sentAt: string | null;
}

export interface AccountInvitationInspection {
  readonly status: AccountInvitationStatus | "INVALID";
  readonly recipientEmailHint: string | null;
}

export interface AccountInvitationRepository {
  create(input: {
    readonly actorUserId: string;
    readonly memberId: string;
    readonly recipientEmail: string;
    readonly tokenHash: string;
    readonly expiresAt: Date;
  }): Promise<{ readonly id: string; readonly view: AccountInvitationView }>;
  readForMember(actorUserId: string, memberId: string): Promise<AccountInvitationView | null>;
  rotate(input: {
    readonly actorUserId: string;
    readonly memberId: string;
    readonly tokenHash: string;
    readonly expiresAt: Date;
  }): Promise<{
    readonly id: string;
    readonly recipientEmail: string;
    readonly view: AccountInvitationView;
  }>;
  markSent(invitationId: string, sentAt: Date): Promise<void>;
  revoke(actorUserId: string, memberId: string): Promise<void>;
  inspect(tokenHash: string): Promise<AccountInvitationInspection>;
  claim(input: {
    readonly tokenHash: string;
    readonly userId: string;
    readonly verifiedEmail: string;
  }): Promise<void>;
}

export interface AccountInvitationDelivery {
  send(input: {
    readonly recipientEmail: string;
    readonly activationUrl: string;
    readonly idempotencyKey: string;
  }): Promise<void>;
}
