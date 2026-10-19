import { AppError } from "../../../application/errors/app-error.js";

export class ProductImportCandidateNotFoundError extends AppError {
  constructor() {
    super({
      code: "PRODUCT_IMPORT_CANDIDATE_NOT_FOUND",
      statusCode: 404,
      message: "Product import candidate not found",
    });
  }
}

export class ProductImportReviewConflictError extends AppError {
  constructor(message: string) {
    super({ code: "PRODUCT_IMPORT_REVIEW_CONFLICT", statusCode: 409, message });
  }
}

export class ProductImportReviewInvariantError extends AppError {
  constructor(message: string) {
    super({ code: "PRODUCT_IMPORT_REVIEW_INVARIANT_VIOLATION", statusCode: 422, message });
  }
}
