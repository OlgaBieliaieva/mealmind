import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp, type AppDependencies } from "../../app.js";
import type { AuthenticationService } from "../../application/authentication/authentication-service.js";
import { AuthenticationRequiredError } from "../../application/errors/authentication-errors.js";
import { createHealthService } from "../../application/health.js";
import { createNoopLogger } from "../../application/logging/logger.js";
import { createReadinessService } from "../../application/readiness.js";

const applicationUserId = "cbf7c697-b7fa-4f10-beb7-43e272fcaa12";
const forgedHeaderUserId = "8a82aac7-a3a5-497a-adfb-9965dd69db28";

describe("session router", () => {
  it("returns 401 without a Bearer token", async () => {
    const authenticationService: AuthenticationService = {
      authenticateAccessToken: vi.fn(),
    };

    const response = await request(createApp(createTestDependencies(authenticationService))).get(
      "/api/v1/session",
    );

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication is required",
      },
    });
    expect(authenticationService.authenticateAccessToken).not.toHaveBeenCalled();
  });

  it("rejects a non-Bearer authorization scheme", async () => {
    const authenticationService: AuthenticationService = {
      authenticateAccessToken: vi.fn(),
    };

    const response = await request(createApp(createTestDependencies(authenticationService)))
      .get("/api/v1/session")
      .set("authorization", "Basic dXNlcjpwYXNzd29yZA==");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication is required",
      },
    });
    expect(authenticationService.authenticateAccessToken).not.toHaveBeenCalled();
  });

  it("returns 401 for a rejected Bearer token", async () => {
    const authenticationService: AuthenticationService = {
      authenticateAccessToken: vi.fn(async () => {
        throw new AuthenticationRequiredError();
      }),
    };

    const response = await request(createApp(createTestDependencies(authenticationService)))
      .get("/api/v1/session")
      .set("authorization", "Bearer rejected-token");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication is required",
      },
    });
  });

  it("returns the authenticated application user and ignores a forged user header", async () => {
    const authenticateAccessToken = vi.fn(async () => ({
      userId: applicationUserId,
      externalSubject: "252b50f0-47a3-4444-b40a-02f84fbb86a4",
      email: "user@example.com",
      applicationRole: "USER" as const,
    }));

    const authenticationService: AuthenticationService = {
      authenticateAccessToken,
    };

    const response = await request(createApp(createTestDependencies(authenticationService)))
      .get("/api/v1/session")
      .set("authorization", "Bearer valid-access-token")
      .set("x-user-id", forgedHeaderUserId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        user: {
          id: applicationUserId,
          email: "user@example.com",
          applicationRole: "USER",
        },
      },
    });
    expect(authenticateAccessToken).toHaveBeenCalledOnce();
    expect(authenticateAccessToken).toHaveBeenCalledWith("valid-access-token");
  });
});

function createTestDependencies(authenticationService: AuthenticationService): AppDependencies {
  return {
    healthService: createHealthService(),
    readinessService: createReadinessService({
      async check() {},
    }),
    authenticationService,
    logger: createNoopLogger(),
    corsAllowedOrigins: ["http://127.0.0.1:3000"],
  };
}
