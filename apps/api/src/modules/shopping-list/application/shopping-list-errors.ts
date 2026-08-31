import { AppError } from "../../../application/errors/app-error.js";

export class ShoppingListValidationError extends AppError {
  constructor(message: string, code = "SHOPPING_LIST_VALIDATION_FAILED") {
    super({ code, statusCode: 422, message });
  }
}

export class ShoppingListPeriodInPastError extends AppError {
  constructor() {
    super({
      code: "SHOPPING_LIST_PERIOD_IN_PAST",
      statusCode: 422,
      message: "Shopping list period cannot start in the past",
    });
  }
}

export class ShoppingListNotFoundError extends AppError {
  constructor() {
    super({
      code: "SHOPPING_LIST_NOT_FOUND",
      statusCode: 404,
      message: "Shopping list was not found",
    });
  }
}

export class ShoppingListConflictError extends AppError {
  constructor(message = "Shopping list was changed by another request") {
    super({ code: "SHOPPING_LIST_CONFLICT", statusCode: 409, message });
  }
}

export class ShoppingListReadOnlyError extends AppError {
  constructor() {
    super({
      code: "SHOPPING_LIST_READ_ONLY",
      statusCode: 409,
      message: "Completed or archived shopping list is read-only",
    });
  }
}
