import express, { type Request, type RequestHandler, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { errorHandler } from "./error-handler.js";
import { createApiRateLimitOptions } from "./rate-limit.js";

function createRateLimitTestApp(limit: number) {
  const app = express();

  const protectedHandler: RequestHandler = vi.fn((_request: Request, response: Response) => {
    response.status(200).json({
      status: "ok",
    });
  });

  app.use(
    rateLimit(
      createApiRateLimitOptions({
        windowMs: 60_000,
        limit,
      }),
    ),
  );

  app.get("/protected", protectedHandler);

  app.use(errorHandler);

  return {
    app,
    protectedHandler,
  };
}

describe("API rate limiter", () => {
  it("allows requests within the configured limit", async () => {
    const { app, protectedHandler } = createRateLimitTestApp(2);

    const firstResponse = await request(app).get("/protected");
    const secondResponse = await request(app).get("/protected");

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);

    expect(firstResponse.headers.ratelimit).toEqual(expect.any(String));
    expect(firstResponse.headers["ratelimit-policy"]).toEqual(expect.any(String));

    expect(protectedHandler).toHaveBeenCalledTimes(2);
  });

  it("returns the stable 429 contract before calling the protected handler", async () => {
    const { app, protectedHandler } = createRateLimitTestApp(2);

    await request(app).get("/protected");
    await request(app).get("/protected");

    const blockedResponse = await request(app).get("/protected");

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.body).toEqual({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests",
      },
    });

    expect(blockedResponse.headers.ratelimit).toEqual(expect.any(String));
    expect(blockedResponse.headers["ratelimit-policy"]).toEqual(expect.any(String));
    expect(blockedResponse.headers["retry-after"]).toEqual(expect.any(String));

    expect(protectedHandler).toHaveBeenCalledTimes(2);
  });
});
