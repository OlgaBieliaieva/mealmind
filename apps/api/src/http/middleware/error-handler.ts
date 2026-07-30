import type { ErrorRequestHandler } from "express";

import { AppError } from "../../application/errors/app-error.js";
import { createErrorResponse } from "../errors/error-response.js";
import { InvalidJsonError } from "../errors/invalid-json-error.js";
import { PayloadTooLargeError } from "../errors/payload-too-large-error.js";
import { RequestValidationError } from "../errors/request-validation-error.js";

interface BodyParserError {
  readonly status?: unknown;
  readonly type?: unknown;
}

function isBodyParserError(error: unknown, status: number, type: string): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const bodyParserError = error as BodyParserError;

  return bodyParserError.status === status && bodyParserError.type === type;
}

function normalizeError(error: unknown): unknown {
  if (isBodyParserError(error, 400, "entity.parse.failed")) {
    return new InvalidJsonError(error);
  }

  if (isBodyParserError(error, 413, "entity.too.large")) {
    return new PayloadTooLargeError(error);
  }

  return error;
}

export const errorHandler: ErrorRequestHandler = (error: unknown, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const normalizedError = normalizeError(error);

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

  request.logger?.error(
    {
      errorName: normalizedError instanceof Error ? normalizedError.name : "UnknownError",
    },
    "Unhandled request error",
  );

  response
    .status(500)
    .json(createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred"));
};
