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

export class RecipeMediaNotFoundError extends AppError {
  constructor() {
    super({ code: "RECIPE_MEDIA_NOT_FOUND", statusCode: 404, message: "Recipe image not found" });
  }
}

export class RecipeMediaProcessingError extends AppError {
  constructor(message: string, cause?: unknown) {
    super({ code: "RECIPE_MEDIA_PROCESSING_FAILED", statusCode: 422, message, cause });
  }
}
