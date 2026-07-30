import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AppLogger } from "../../application/logging/logger.js";
import { createRequestContextMiddleware } from "./request-context.js";

function createLogger() {
  const info = vi.fn();
  const warn = vi.fn();
  const error = vi.fn();

  const requestLogger: AppLogger = {
    debug: vi.fn(),
    info,
    warn,
    error,
    child: vi.fn(() => requestLogger),
  };

  const child = vi.fn(() => requestLogger);

  const logger: AppLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child,
  };

  return {
    logger,
    info,
    child,
  };
}

describe("request context middleware", () => {
  it("propagates a valid request ID without logging query values", async () => {
    const { logger, info, child } = createLogger();
    const app = express();

    app.use(createRequestContextMiddleware(logger));

    app.get("/example", (_request, response) => {
      response.status(200).json({
        status: "ok",
      });
    });

    const response = await request(app)
      .get("/example?token=secret-query-value")
      .set("x-request-id", "request-123");

    expect(response.status).toBe(200);
    expect(response.headers["x-request-id"]).toBe("request-123");

    expect(child).toHaveBeenCalledOnce();
    expect(child).toHaveBeenCalledWith({
      requestId: "request-123",
    });

    expect(info).toHaveBeenCalledOnce();
    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        path: "/example",
        statusCode: 200,
        durationMs: expect.any(Number),
      }),
      "HTTP request completed",
    );

    const serializedLogs = JSON.stringify(info.mock.calls);

    expect(serializedLogs).not.toContain("secret-query-value");
    expect(serializedLogs).not.toContain("token");
  });

  it("replaces an unsafe request ID", async () => {
    const { logger, child } = createLogger();
    const app = express();

    app.use(createRequestContextMiddleware(logger));

    app.get("/example", (_request, response) => {
      response.status(204).end();
    });

    const response = await request(app).get("/example").set("x-request-id", "invalid request id");

    expect(response.status).toBe(204);

    const generatedRequestId = response.headers["x-request-id"];

    expect(generatedRequestId).toEqual(expect.any(String));
    expect(generatedRequestId).not.toBe("invalid request id");
    expect(generatedRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    expect(child).toHaveBeenCalledOnce();
    expect(child).toHaveBeenCalledWith({
      requestId: generatedRequestId,
    });
  });
});
