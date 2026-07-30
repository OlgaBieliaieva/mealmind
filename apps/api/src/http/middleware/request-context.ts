import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

import type { Request, RequestHandler } from "express";

import type { AppLogger, LogFields } from "../../application/logging/logger.js";

const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function resolveRequestId(request: Request): string {
  const suppliedRequestId = request.get("x-request-id");

  if (suppliedRequestId !== undefined && requestIdPattern.test(suppliedRequestId)) {
    return suppliedRequestId;
  }

  return randomUUID();
}

function createCompletionFields(
  request: Request,
  statusCode: number,
  durationMs: number,
): LogFields {
  return {
    method: request.method,
    path: request.path,
    statusCode,
    durationMs,
    userId: request.authenticatedUser?.userId,
  };
}

export function createRequestContextMiddleware(rootLogger: AppLogger): RequestHandler {
  return (request, response, next): void => {
    const requestId = resolveRequestId(request);
    const requestLogger = rootLogger.child({
      requestId,
    });
    const startedAt = performance.now();

    request.requestId = requestId;
    request.logger = requestLogger;

    response.setHeader("x-request-id", requestId);

    let completed = false;

    response.once("finish", () => {
      if (completed) {
        return;
      }

      completed = true;

      const durationMs = Number((performance.now() - startedAt).toFixed(2));
      const fields = createCompletionFields(request, response.statusCode, durationMs);

      if (response.statusCode >= 500) {
        requestLogger.error(fields, "HTTP request completed");
      } else if (response.statusCode >= 400) {
        requestLogger.warn(fields, "HTTP request completed");
      } else {
        requestLogger.info(fields, "HTTP request completed");
      }
    });

    response.once("close", () => {
      if (completed || response.writableFinished) {
        return;
      }

      completed = true;

      requestLogger.warn(
        createCompletionFields(
          request,
          response.statusCode,
          Number((performance.now() - startedAt).toFixed(2)),
        ),
        "HTTP request aborted",
      );
    });

    next();
  };
}
