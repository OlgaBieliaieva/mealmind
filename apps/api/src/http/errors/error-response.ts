import type { ValidationIssue } from "./request-validation-error.js";

export interface ErrorResponseBody {
  readonly code: string;
  readonly message: string;
  readonly issues?: readonly ValidationIssue[];
}

export interface ErrorResponse {
  readonly error: ErrorResponseBody;
}

export function createErrorResponse(
  code: string,
  message: string,
  issues?: readonly ValidationIssue[],
): ErrorResponse {
  const error: ErrorResponseBody =
    issues === undefined
      ? {
          code,
          message,
        }
      : {
          code,
          message,
          issues,
        };

  return {
    error,
  };
}
