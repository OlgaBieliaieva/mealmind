import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AppLogger } from "../../application/logging/logger.js";
import { errorHandler } from "./error-handler.js";
import { createRequestContextMiddleware } from "./request-context.js";

function createLogger() {
  const error = vi.fn();

  const requestLogger: AppLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error,
    child: vi.fn(() => requestLogger),
  };

  const rootLogger: AppLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => requestLogger),
  };

  return {
    rootLogger,
    error,
  };
}

function createErrorTestApp(logger: AppLogger) {
  const app = express();

  app.use(createRequestContextMiddleware(logger));

  app.get("/unexpected", () => {
    throw new Error("DATABASE_URL=postgresql://user:secret@database.internal/mealmind");
  });

  app.use(errorHandler);

  return app;
}

describe("error handler", () => {
  it("redacts unexpected errors from the response and structured logs", async () => {
    const { rootLogger, error } = createLogger();

    const response = await request(createErrorTestApp(rootLogger)).get("/unexpected");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      },
    });

    expect(error).toHaveBeenCalledWith(
      {
        errorName: "Error",
      },
      "Unhandled request error",
    );

    const serializedResponse = JSON.stringify(response.body);
    const serializedLogs = JSON.stringify(error.mock.calls);

    expect(serializedResponse).not.toContain("DATABASE_URL");
    expect(serializedResponse).not.toContain("postgresql://");
    expect(serializedResponse).not.toContain("secret");
    expect(serializedResponse).not.toContain("stack");

    expect(serializedLogs).not.toContain("DATABASE_URL");
    expect(serializedLogs).not.toContain("postgresql://");
    expect(serializedLogs).not.toContain("secret");
  });
});
