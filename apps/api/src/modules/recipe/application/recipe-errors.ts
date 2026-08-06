import { AppError } from "../../../application/errors/app-error.js";

export class RecipeNotFoundError extends AppError {
  constructor() {
    super({ code: "RECIPE_NOT_FOUND", statusCode: 404, message: "Recipe not found" });
  }
}

export class RecipeInvariantError extends AppError {
  constructor(message: string) {
    super({ code: "RECIPE_INVARIANT_VIOLATION", statusCode: 400, message });
  }
}

export class RecipeConflictError extends AppError {
  constructor(message = "Recipe conflicts with an existing record") {
    super({ code: "RECIPE_CONFLICT", statusCode: 409, message });
  }
}
