import { AppError } from "../../../application/errors/app-error.js";

export class ReferenceHierarchyError extends AppError {
  constructor(message: string) {
    super({
      code: "INVALID_REFERENCE_HIERARCHY",
      statusCode: 500,
      message,
    });
  }
}

export class ReferenceNotFoundError extends AppError {
  constructor(resource: string) {
    super({
      code: "REFERENCE_NOT_FOUND",
      statusCode: 404,
      message: `${resource} reference was not found`,
    });
  }
}

export class ReferenceConflictError extends AppError {
  constructor(resource: string) {
    super({
      code: "REFERENCE_CONFLICT",
      statusCode: 409,
      message: `${resource} contains a value that must be unique`,
    });
  }
}

export class ReferenceRelationError extends AppError {
  constructor(message: string) {
    super({
      code: "INVALID_REFERENCE_RELATION",
      statusCode: 400,
      message,
    });
  }
}
