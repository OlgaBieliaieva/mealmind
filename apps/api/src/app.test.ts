import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp, type AppDependencies } from "./app.js";
import type { AuthenticationService } from "./application/authentication/authentication-service.js";
import { createHealthService } from "./application/health.js";
import { createNoopLogger } from "./application/logging/logger.js";
import { createReadinessService } from "./application/readiness.js";
import { API_RATE_LIMIT_LIMIT } from "./http/middleware/rate-limit.js";

const allowedClientOrigin = "http://127.0.0.1:3000";

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
      corsAllowedOrigins: [allowedClientOrigin, "http://127.0.0.1:3001"],
    };
  });

  describe("operational endpoints", () => {
    it("returns the API health status without checking the database", async () => {
      const databaseCheck = vi.fn(async () => {});

      dependencies = {
        ...dependencies,
        readinessService: createReadinessService({
          check: databaseCheck,
        }),
      };

      const response = await request(createApp(dependencies)).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: "ok",
      });
      expect(response.headers["x-powered-by"]).toBeUndefined();
      expect(databaseCheck).not.toHaveBeenCalled();
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

    it("returns a redacted 503 response when the database is unavailable", async () => {
      dependencies = {
        ...dependencies,
        readinessService: createReadinessService({
          async check() {
            throw new Error("DATABASE_URL=postgresql://user:secret@database.internal/mealmind");
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

      const serializedResponse = JSON.stringify(response.body);

      expect(serializedResponse).not.toContain("DATABASE_URL");
      expect(serializedResponse).not.toContain("postgresql://");
      expect(serializedResponse).not.toContain("secret");
    });

    it("does not rate limit health checks", async () => {
      const app = createApp(dependencies);

      for (let requestNumber = 0; requestNumber <= API_RATE_LIMIT_LIMIT; requestNumber += 1) {
        const response = await request(app).get("/health");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          status: "ok",
        });
        expect(response.headers.ratelimit).toBeUndefined();
      }
    });
  });

  describe("request context and CORS", () => {
    it("propagates a safe request ID", async () => {
      const response = await request(createApp(dependencies))
        .get("/health")
        .set("x-request-id", "contract-request-123");

      expect(response.status).toBe(200);
      expect(response.headers["x-request-id"]).toBe("contract-request-123");
    });

    it("allows a configured browser origin", async () => {
      const response = await request(createApp(dependencies))
        .get("/health")
        .set("origin", allowedClientOrigin);

      expect(response.status).toBe(200);
      expect(response.headers["access-control-allow-origin"]).toBe(allowedClientOrigin);
      expect(response.headers["access-control-allow-credentials"]).toBeUndefined();
    });

    it("does not grant CORS access to an unconfigured origin", async () => {
      const response = await request(createApp(dependencies))
        .get("/health")
        .set("origin", "https://untrusted.example");

      expect(response.status).toBe(200);
      expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("handles an allowed CORS preflight request", async () => {
      const response = await request(createApp(dependencies))
        .options("/api/v1/session")
        .set("origin", allowedClientOrigin)
        .set("access-control-request-method", "GET")
        .set("access-control-request-headers", "authorization,x-request-id");

      expect(response.status).toBe(204);
      expect(response.headers["access-control-allow-origin"]).toBe(allowedClientOrigin);
      expect(response.headers["access-control-allow-methods"]).toContain("GET");
      expect(response.headers["access-control-max-age"]).toBe("600");
    });
  });

  describe("error contracts", () => {
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

    it("rejects a JSON body larger than the configured limit", async () => {
      const response = await request(createApp(dependencies))
        .post("/unknown-route")
        .set("content-type", "application/json")
        .send(
          JSON.stringify({
            payload: "x".repeat(300 * 1024),
          }),
        );

      expect(response.status).toBe(413);
      expect(response.body).toEqual({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "Request body exceeds the allowed size",
        },
      });
    });
  });
});
