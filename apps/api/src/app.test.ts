import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp, type AppDependencies } from "./app.js";
import type { AuthenticationService } from "./application/authentication/authentication-service.js";
import { createHealthService } from "./application/health.js";

import { createNoopLogger } from "./application/logging/logger.js";
import { createReadinessService } from "./application/readiness.js";

const unusedAuthenticationService: AuthenticationService = {
  async authenticateAccessToken() {
    throw new Error("Authentication was not expected in this test");
  },
};

describe("MealMind API application", () => {
  let dependencies: AppDependencies;

  beforeEach(() => {
    dependencies = {
      healthService: createHealthService(),
      readinessService: createReadinessService({
        async check() {},
      }),
      authenticationService: unusedAuthenticationService,
      logger: createNoopLogger(),
      corsAllowedOrigins: ["http://127.0.0.1:3000", "http://127.0.0.1:3001"],
    };
  });

  it("returns the API health status", async () => {
    const response = await request(createApp(dependencies)).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
    });
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("returns the API readiness status", async () => {
    const response = await request(createApp(dependencies)).get("/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ready",
      checks: {
        database: "up",
      },
    });
  });

  it("returns 503 when the database is unavailable", async () => {
    dependencies = {
      ...dependencies,
      readinessService: createReadinessService({
        async check() {
          throw new Error("Database unavailable");
        },
      }),
    };

    const response = await request(createApp(dependencies)).get("/ready");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: "not_ready",
      checks: {
        database: "down",
      },
    });
  });

  it("returns the stable error contract for an unknown route", async () => {
    const response = await request(createApp(dependencies)).get("/unknown-route");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "ROUTE_NOT_FOUND",
        message: "Route not found",
      },
    });
  });

  it("returns a stable error for malformed JSON", async () => {
    const response = await request(createApp(dependencies))
      .post("/unknown-route")
      .set("content-type", "application/json")
      .send('{"invalidJson":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_JSON",
        message: "Request body contains invalid JSON",
      },
    });
  });
});
