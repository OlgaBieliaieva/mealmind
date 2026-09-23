import { AppError } from "../../../application/errors/app-error.js";

export class CookingNotFoundError extends AppError {
  constructor() {
    super({ code: "COOKING_NOT_FOUND", statusCode: 404, message: "Cooking session was not found" });
  }
}

export class CookingConflictError extends AppError {
  readonly details: Readonly<Record<string, number>> | undefined;

  constructor(
    message = "Cooking state conflicts with the current request",
    details?: Record<string, number>,
  ) {
    super({ code: "COOKING_CONFLICT", statusCode: 409, message });
    this.details = details === undefined ? undefined : Object.freeze(details);
  }
}

export class CookingValidationError extends AppError {
  constructor(message: string) {
    super({ code: "COOKING_VALIDATION_FAILED", statusCode: 422, message });
  }
}
