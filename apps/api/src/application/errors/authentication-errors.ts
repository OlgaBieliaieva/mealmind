import { AppError } from "./app-error.js";

export class AuthenticationRequiredError extends AppError {
  constructor() {
    super({
      code: "AUTHENTICATION_REQUIRED",
      statusCode: 401,
      message: "Authentication is required",
    });
  }
}

export class AccountAccessDeniedError extends AppError {
  constructor() {
    super({
      code: "ACCOUNT_ACCESS_DENIED",
      statusCode: 403,
      message: "The application account is not available",
    });
  }
}

export class FamilyAccessDeniedError extends AppError {
  constructor() {
    super({
      code: "FAMILY_ACCESS_DENIED",
      statusCode: 403,
      message: "Access to the family is denied",
    });
  }
}

export class IdentityProviderUnavailableError extends AppError {
  constructor(cause?: unknown) {
    super({
      code: "IDENTITY_PROVIDER_UNAVAILABLE",
      statusCode: 503,
      message: "Identity provider is temporarily unavailable",
      cause,
    });
  }
}
