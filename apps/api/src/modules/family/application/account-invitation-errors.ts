import { AppError } from "../../../application/errors/app-error.js";

class AccountInvitationError extends AppError {
  constructor(code: string, statusCode: number, message: string) {
    super({ code, statusCode, message });
  }
}

export const invitationErrors = Object.freeze({
  alreadyPending: () =>
    new AccountInvitationError(
      "INVITATION_ALREADY_PENDING",
      409,
      "An invitation is already pending",
    ),
  notFound: () =>
    new AccountInvitationError(
      "ACCOUNT_INVITATION_NOT_FOUND",
      404,
      "Account invitation was not found",
    ),
  invalid: () =>
    new AccountInvitationError("ACCOUNT_INVITATION_INVALID", 404, "Account invitation is invalid"),
  expired: () =>
    new AccountInvitationError("ACCOUNT_INVITATION_EXPIRED", 410, "Account invitation has expired"),
  inactive: () =>
    new AccountInvitationError(
      "ACCOUNT_INVITATION_INACTIVE",
      409,
      "Account invitation is no longer active",
    ),
  emailMismatch: () =>
    new AccountInvitationError(
      "INVITATION_EMAIL_MISMATCH",
      403,
      "The authenticated email does not match the invitation",
    ),
  emailUnverified: () =>
    new AccountInvitationError("VERIFIED_EMAIL_REQUIRED", 403, "A verified email is required"),
  existingAccount: () =>
    new AccountInvitationError(
      "EXISTING_ACCOUNT_NOT_SUPPORTED",
      409,
      "An existing MealMind account cannot use this invitation flow",
    ),
  incompatibleContext: () =>
    new AccountInvitationError(
      "INVITATION_ACCOUNT_CONTEXT_CONFLICT",
      409,
      "The account already has an incompatible family context",
    ),
  deliveryUnavailable: () =>
    new AccountInvitationError(
      "INVITATION_DELIVERY_UNAVAILABLE",
      503,
      "Invitation email delivery is temporarily unavailable",
    ),
});
