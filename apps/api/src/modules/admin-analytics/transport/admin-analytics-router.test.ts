import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticationService } from "../../../application/authentication/authentication-service.js";
import { createNoopLogger } from "../../../application/logging/logger.js";
import { errorHandler } from "../../../http/middleware/error-handler.js";
import { createRequestContextMiddleware } from "../../../http/middleware/request-context.js";
import type { AdminAnalyticsService } from "../application/admin-analytics-service.js";
import { createAdminAnalyticsController } from "./admin-analytics-controller.js";
import { createAdminAnalyticsRouter } from "./admin-analytics-router.js";

function authenticationService(role: "USER" | "ADMIN"): AuthenticationService {
  return {
    async authenticateAccessToken() {
      return {
        userId: "64b79ffc-e6af-440c-ae38-8cd37c22be1c",
        externalSubject: "subject",
        email: "admin@example.com",
        applicationRole: role,
      };
    },
  };
}

function service(): AdminAnalyticsService {
  return {
    getUsers: vi.fn<AdminAnalyticsService["getUsers"]>(async () => ({
      meta: {
        from: "2026-09-01",
        to: "2026-09-30",
        granularity: "day",
        timezone: "Europe/Kyiv",
        generatedAt: "2026-09-24T10:00:00.000Z",
      },
      totals: {
        activeUsers: 1,
        deletedUsers: 0,
        activeFamilies: 1,
        archivedFamilies: 0,
        activeProfiles: 1,
        archivedProfiles: 0,
      },
      completion: {
        onboarding: { completed: 1, total: 1, percent: 100 },
        profiles: { completed: 1, total: 1, percent: 100 },
      },
      averages: { activeUsersPerFamily: 1, activeProfilesPerFamily: 1 },
      created: {
        users: { value: 1, previousValue: 0, delta: 1, deltaPercent: null },
        families: { value: 1, previousValue: 0, delta: 1, deltaPercent: null },
        profiles: { value: 1, previousValue: 0, delta: 1, deltaPercent: null },
      },
      series: [],
    })),
  };
}

function app(role: "USER" | "ADMIN", analyticsService = service()) {
  const application = express();
  application.use(createRequestContextMiddleware(createNoopLogger()));
  application.use(
    "/api/v1",
    createAdminAnalyticsRouter(
      createAdminAnalyticsController(analyticsService),
      authenticationService(role),
    ),
  );
  application.use(errorHandler);
  return application;
}

describe("admin analytics router", () => {
  it("allows ADMIN and passes validated period", async () => {
    const analyticsService = service();
    const response = await request(app("ADMIN", analyticsService))
      .get("/api/v1/admin/analytics/users")
      .query({ from: "2026-09-01", to: "2026-09-30", granularity: "day", timezone: "Europe/Kyiv" })
      .set("authorization", "Bearer token");

    expect(response.status).toBe(200);
    expect(analyticsService.getUsers).toHaveBeenCalledWith({
      from: "2026-09-01",
      to: "2026-09-30",
      granularity: "day",
      timezone: "Europe/Kyiv",
    });
    expect(response.headers["cache-control"]).toBe("private, no-store");
  });

  it("forbids a regular USER", async () => {
    const response = await request(app("USER"))
      .get("/api/v1/admin/analytics/users")
      .set("authorization", "Bearer token");
    expect(response.status).toBe(403);
  });

  it("rejects an incomplete or invalid period", async () => {
    const response = await request(app("ADMIN"))
      .get("/api/v1/admin/analytics/users")
      .query({ from: "2026-09-30", to: "2026-09-01" })
      .set("authorization", "Bearer token");
    expect(response.status).toBe(400);
  });
});
