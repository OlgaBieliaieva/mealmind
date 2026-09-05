import { AppError } from "../../../application/errors/app-error.js";

export class ConsumptionNotFoundError extends AppError {
  constructor() {
    super({
      code: "CONSUMPTION_NOT_FOUND",
      statusCode: 404,
      message: "Consumption record was not found",
    });
  }
}

export class ConsumptionForbiddenError extends AppError {
  constructor() {
    super({
      code: "CONSUMPTION_FORBIDDEN",
      statusCode: 403,
      message: "Consumption profile is not editable",
    });
  }
}

export class ConsumptionConflictError extends AppError {
  constructor(message = "Consumption record was changed by another request") {
    super({ code: "CONSUMPTION_CONFLICT", statusCode: 409, message });
  }
}

export class ConsumptionValidationError extends AppError {
  constructor(message: string) {
    super({ code: "CONSUMPTION_VALIDATION_FAILED", statusCode: 422, message });
  }
}
