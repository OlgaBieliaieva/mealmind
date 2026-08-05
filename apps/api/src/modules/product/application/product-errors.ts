import { AppError } from "../../../application/errors/app-error.js";

export class ProductNotFoundError extends AppError {
  constructor() {
    super({ code: "PRODUCT_NOT_FOUND", statusCode: 404, message: "Product not found" });
  }
}

export class ProductConflictError extends AppError {
  constructor(message = "Product conflicts with an existing record") {
    super({ code: "PRODUCT_CONFLICT", statusCode: 409, message });
  }
}

export class ProductInvariantError extends AppError {
  constructor(message: string) {
    super({ code: "PRODUCT_INVARIANT_VIOLATION", statusCode: 400, message });
  }
}

export class ProductMediaNotFoundError extends AppError {
  constructor() {
    super({ code: "PRODUCT_MEDIA_NOT_FOUND", statusCode: 404, message: "Product photo not found" });
  }
}

export class ProductMediaProcessingError extends AppError {
  constructor(message: string, cause?: unknown) {
    super({ code: "PRODUCT_MEDIA_PROCESSING_FAILED", statusCode: 422, message, cause });
  }
}
