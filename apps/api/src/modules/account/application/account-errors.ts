import { AppError } from "../../../application/errors/app-error.js";

export class AuthEmailNotVerifiedError extends AppError {
  constructor() {
    super({
      code: "AUTH_EMAIL_NOT_VERIFIED",
      statusCode: 403,
      message: "A verified email address is required",
    });
  }
}

export class AccountEmailConflictError extends AppError {
  constructor() {
    super({
      code: "ACCOUNT_EMAIL_CONFLICT",
      statusCode: 409,
      message: "The verified email cannot be linked to this account",
    });
  }
}

export class AccountUnavailableError extends AppError {
  constructor() {
    super({
      code: "ACCOUNT_ACCESS_DENIED",
      statusCode: 403,
      message: "The application account is not available",
    });
  }
}
