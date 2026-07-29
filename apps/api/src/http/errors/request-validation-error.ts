import type { ZodError } from "zod";

import { AppError } from "../../application/errors/app-error.js";

export interface ValidationIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export class RequestValidationError extends AppError {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[], cause?: unknown) {
    super({
      code: "VALIDATION_ERROR",
      statusCode: 400,
      message: "Request validation failed",
      cause,
    });

    this.issues = Object.freeze([...issues]);
  }

  static fromZodError(error: ZodError): RequestValidationError {
    const issues = error.issues.map((issue) =>
      Object.freeze({
        path: issue.path.map(String).join("."),
        code: issue.code,
        message: issue.message,
      }),
    );

    return new RequestValidationError(issues, error);
  }
}
