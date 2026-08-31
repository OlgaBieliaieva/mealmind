import { AppError } from "../../../application/errors/app-error.js";

export class MealPlanValidationError extends AppError {
  constructor(message = "Meal plan data is not available") {
    super({ code: "MEAL_PLAN_VALIDATION_FAILED", statusCode: 422, message });
  }
}

export class MealPlanAccessDeniedError extends AppError {
  constructor() {
    super({
      code: "MEAL_PLAN_ACCESS_DENIED",
      statusCode: 403,
      message: "Meal plan access is denied",
    });
  }
}

export class MealEntryNotFoundError extends AppError {
  constructor() {
    super({ code: "MEAL_ENTRY_NOT_FOUND", statusCode: 404, message: "Meal entry was not found" });
  }
}

export class MealPlanConflictError extends AppError {
  constructor(message = "Meal plan was changed by another request") {
    super({ code: "MEAL_PLAN_CONFLICT", statusCode: 409, message });
  }
}

export class MealPlanIdempotencyConflictError extends AppError {
  constructor() {
    super({
      code: "MEAL_PLAN_IDEMPOTENCY_CONFLICT",
      statusCode: 409,
      message: "Request id was already used for different data",
    });
  }
}
