import type { ErrorRequestHandler } from "express";

import { AppError } from "../../application/errors/app-error.js";
import { createErrorResponse } from "../errors/error-response.js";
import { InvalidJsonError } from "../errors/invalid-json-error.js";
import { RequestValidationError } from "../errors/request-validation-error.js";

interface BodyParserError {
  readonly status?: unknown;
  readonly type?: unknown;
}

function isInvalidJsonError(error: unknown): boolean {
  if (!(error instanceof SyntaxError)) {
    return false;
  }

  const bodyParserError = error as BodyParserError;

  return bodyParserError.status === 400 && bodyParserError.type === "entity.parse.failed";
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const normalizedError = isInvalidJsonError(error) ? new InvalidJsonError(error) : error;

  if (normalizedError instanceof RequestValidationError) {
    response
      .status(normalizedError.statusCode)
      .json(
        createErrorResponse(normalizedError.code, normalizedError.message, normalizedError.issues),
      );

    return;
  }

  if (normalizedError instanceof AppError) {
    response
      .status(normalizedError.statusCode)
      .json(createErrorResponse(normalizedError.code, normalizedError.message));

    return;
  }

  response
    .status(500)
    .json(createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred"));
};
