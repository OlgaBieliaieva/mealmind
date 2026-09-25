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
    getOverview: vi.fn<AdminAnalyticsService["getOverview"]>(async () => ({
      meta: {
        from: "2026-09-01",
        to: "2026-09-30",
        granularity: "day",
        timezone: "Europe/Kyiv",
        generatedAt: "2026-09-24T10:00:00.000Z",
      },
      users: { active: 1, created: 1 },
      families: { active: 1, created: 1 },
      products: { total: 1, awaitingVerification: 0 },
      recipes: { total: 1, drafts: 0 },
      activity: {
        scheduledMealPlans: 0,
        completedCookingSessions: 0,
        confirmedConsumptionEntries: 0,
      },
    })),
    getProducts: vi.fn<AdminAnalyticsService["getProducts"]>(async () => ({
      meta: {
        from: "2026-09-01",
        to: "2026-09-30",
        granularity: "day",
        timezone: "Europe/Kyiv",
        generatedAt: "2026-09-24T10:00:00.000Z",
      },
      totals: { all: 0, createdLast24Hours: 0, awaitingVerification: 0, drafts: 0 },
      created: { value: 0, previousValue: 0, delta: 0, deltaPercent: null },
      breakdowns: {
        types: { GENERIC: 0, BRANDED: 0 },
        foodStates: { UNSPECIFIED: 0, RAW: 0, COOKED: 0, PROCESSED: 0, READY_TO_EAT: 0 },
        statuses: { DRAFT: 0, ACTIVE: 0, ARCHIVED: 0 },
        verification: { UNVERIFIED: 0, VERIFIED: 0, REJECTED: 0 },
        sources: { USDA: 0, MEALMIND_ADMIN: 0, MEALMIND_USER: 0, UNASSIGNED: 0 },
      },
      rankings: { categories: [], brands: [], favorites: [] },
      series: [],
    })),
    getRecipes: vi.fn<AdminAnalyticsService["getRecipes"]>(async () => ({
      meta: {
        from: "2026-09-01",
        to: "2026-09-30",
        granularity: "day",
        timezone: "Europe/Kyiv",
        generatedAt: "2026-09-24T10:00:00.000Z",
      },
      totals: { all: 0, drafts: 0, familyOnly: 0 },
      created: { value: 0, previousValue: 0, delta: 0, deltaPercent: null },
      breakdowns: {
        statuses: { DRAFT: 0, READY: 0, PUBLISHED: 0, ARCHIVED: 0 },
        visibility: { FAMILY: 0, PUBLIC: 0 },
        difficulties: { EASY: 0, MEDIUM: 0, HARD: 0, UNASSIGNED: 0 },
        authorTypes: { MEALMIND: 0, EXPERT: 0, BLOGGER: 0, USER: 0, UNASSIGNED: 0 },
        creatorOrigins: { USER: 0, SYSTEM: 0 },
      },
      rankings: { recipeTypes: [], cuisines: [], dietaryTags: [], authors: [], favorites: [] },
      series: [],
    })),
    getReferences: vi.fn(async () => ({
      generatedAt: "2026-09-24T10:00:00.000Z",
      resources: [],
      brands: {
        statuses: { DRAFT: 0, ACTIVE: 0, ARCHIVED: 0 },
        verification: { UNVERIFIED: 0, VERIFIED: 0, REJECTED: 0 },
      },
      authors: { types: { MEALMIND: 0, EXPERT: 0, BLOGGER: 0, USER: 0 } },
      quality: {
        brandsAwaitingVerification: 0,
        draftBrands: 0,
        categoriesWithoutProducts: 0,
        recipeTypesWithoutRecipes: 0,
        cuisinesWithoutRecipes: 0,
        dietaryTagsWithoutUsage: 0,
      },
    })),
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
  it("returns overview with a validated period", async () => {
    const analyticsService = service();
    const response = await request(app("ADMIN", analyticsService))
      .get("/api/v1/admin/analytics/overview")
      .query({ from: "2026-09-01", to: "2026-09-30", timezone: "Europe/Kyiv" })
      .set("authorization", "Bearer token");

    expect(response.status).toBe(200);
    expect(analyticsService.getOverview).toHaveBeenCalledWith({
      from: "2026-09-01",
      to: "2026-09-30",
      timezone: "Europe/Kyiv",
    });
    expect(response.body.data.users.active).toBe(1);
  });

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

  it("returns reference analytics only to ADMIN", async () => {
    const response = await request(app("ADMIN"))
      .get("/api/v1/admin/analytics/references")
      .set("authorization", "Bearer token");
    expect(response.status).toBe(200);
    expect(response.body.data.resources).toEqual([]);
  });

  it("returns product analytics with a validated period", async () => {
    const analyticsService = service();
    const response = await request(app("ADMIN", analyticsService))
      .get("/api/v1/admin/analytics/products")
      .query({ from: "2026-09-01", to: "2026-09-30", granularity: "week" })
      .set("authorization", "Bearer token");

    expect(response.status).toBe(200);
    expect(analyticsService.getProducts).toHaveBeenCalledWith({
      from: "2026-09-01",
      to: "2026-09-30",
      granularity: "week",
    });
  });

  it("returns recipe analytics with a validated period", async () => {
    const analyticsService = service();
    const response = await request(app("ADMIN", analyticsService))
      .get("/api/v1/admin/analytics/recipes")
      .query({ from: "2026-09-01", to: "2026-09-30", granularity: "week" })
      .set("authorization", "Bearer token");

    expect(response.status).toBe(200);
    expect(analyticsService.getRecipes).toHaveBeenCalledWith({
      from: "2026-09-01",
      to: "2026-09-30",
      granularity: "week",
    });
  });

  it("rejects an incomplete or invalid period", async () => {
    const response = await request(app("ADMIN"))
      .get("/api/v1/admin/analytics/users")
      .query({ from: "2026-09-30", to: "2026-09-01" })
      .set("authorization", "Bearer token");
    expect(response.status).toBe(400);
  });
});
