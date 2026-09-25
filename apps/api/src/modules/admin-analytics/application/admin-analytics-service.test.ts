import { describe, expect, it, vi } from "vitest";

import type { AdminAnalyticsRepository } from "../domain/admin-analytics-repository.js";
import { createAdminAnalyticsService, resolveAnalyticsPeriod } from "./admin-analytics-service.js";

describe("admin analytics service", () => {
  it("resolves a custom period and equal previous period", () => {
    expect(
      resolveAnalyticsPeriod(
        { from: "2026-09-01", to: "2026-09-07", timezone: "Europe/Kyiv" },
        new Date("2026-09-24T10:00:00Z"),
      ),
    ).toEqual({
      from: "2026-09-01",
      to: "2026-09-07",
      previousFrom: "2026-08-25",
      granularity: "day",
      timezone: "Europe/Kyiv",
    });
  });

  it("maps stable completion, averages and comparison values", async () => {
    const repository: AdminAnalyticsRepository = {
      getProducts: vi.fn(),
      getRecipes: vi.fn(),
      getReferences: vi.fn(),
      getUsers: vi.fn(async () => ({
        activeUsers: 4,
        deletedUsers: 1,
        activeFamilies: 2,
        archivedFamilies: 1,
        activeProfiles: 5,
        archivedProfiles: 2,
        completedOnboarding: 3,
        completedProfiles: 4,
        activeMemberships: 3,
        activeFamilyMembers: 5,
        currentCreatedUsers: 3,
        previousCreatedUsers: 2,
        currentCreatedFamilies: 1,
        previousCreatedFamilies: 0,
        currentCreatedProfiles: 4,
        previousCreatedProfiles: 4,
        series: [{ period: "2026-09-01", users: 3, families: 1, profiles: 4 }],
      })),
    };
    const service = createAdminAnalyticsService(
      repository,
      () => new Date("2026-09-24T10:00:00.000Z"),
    );

    const result = await service.getUsers({ from: "2026-09-01", to: "2026-09-07" });

    expect(result.completion.onboarding).toEqual({ completed: 3, total: 4, percent: 75 });
    expect(result.averages).toEqual({ activeUsersPerFamily: 1.5, activeProfilesPerFamily: 2.5 });
    expect(result.created.users).toEqual({
      value: 3,
      previousValue: 2,
      delta: 1,
      deltaPercent: 50,
    });
    expect(result.created.families.deltaPercent).toBeNull();
    expect(result.meta.generatedAt).toBe("2026-09-24T10:00:00.000Z");
  });

  it("maps products totals and creation comparison", async () => {
    const repository: AdminAnalyticsRepository = {
      getUsers: vi.fn(),
      getRecipes: vi.fn(),
      getReferences: vi.fn(),
      getProducts: vi.fn(async () => ({
        total: 12,
        createdLast24Hours: 2,
        awaitingVerification: 3,
        drafts: 4,
        currentCreated: 5,
        previousCreated: 2,
        types: { GENERIC: 7, BRANDED: 5 },
        foodStates: { UNSPECIFIED: 1, RAW: 4, COOKED: 2, PROCESSED: 3, READY_TO_EAT: 2 },
        statuses: { DRAFT: 4, ACTIVE: 7, ARCHIVED: 1 },
        verification: { UNVERIFIED: 3, VERIFIED: 8, REJECTED: 1 },
        sources: { USDA: 6, MEALMIND_ADMIN: 3, MEALMIND_USER: 2, UNASSIGNED: 1 },
        categories: [],
        brands: [],
        favorites: [],
        series: [{ period: "2026-09-01", value: 5 }],
      })),
    };
    const service = createAdminAnalyticsService(
      repository,
      () => new Date("2026-09-24T10:00:00.000Z"),
    );

    const result = await service.getProducts({ from: "2026-09-01", to: "2026-09-30" });

    expect(result.totals).toEqual({
      all: 12,
      createdLast24Hours: 2,
      awaitingVerification: 3,
      drafts: 4,
    });
    expect(result.created).toEqual({
      value: 5,
      previousValue: 2,
      delta: 3,
      deltaPercent: 150,
    });
  });

  it("keeps recipe author and creator semantics separate", async () => {
    const repository: AdminAnalyticsRepository = {
      getUsers: vi.fn(),
      getProducts: vi.fn(),
      getReferences: vi.fn(),
      getRecipes: vi.fn(async () => ({
        total: 8,
        drafts: 2,
        familyOnly: 3,
        currentCreated: 4,
        previousCreated: 2,
        statuses: { DRAFT: 2, READY: 1, PUBLISHED: 4, ARCHIVED: 1 },
        visibility: { FAMILY: 3, PUBLIC: 5 },
        difficulties: { EASY: 2, MEDIUM: 2, HARD: 1, UNASSIGNED: 3 },
        authorTypes: { MEALMIND: 2, EXPERT: 1, BLOGGER: 1, USER: 2, UNASSIGNED: 2 },
        creatorOrigins: { USER: 5, SYSTEM: 3 },
        recipeTypes: [],
        cuisines: [],
        dietaryTags: [],
        authors: [],
        favorites: [],
        series: [{ period: "2026-09-01", value: 4 }],
      })),
    };
    const service = createAdminAnalyticsService(
      repository,
      () => new Date("2026-09-24T10:00:00.000Z"),
    );

    const result = await service.getRecipes({ from: "2026-09-01", to: "2026-09-30" });

    expect(result.breakdowns.authorTypes.USER).toBe(2);
    expect(result.breakdowns.creatorOrigins).toEqual({ USER: 5, SYSTEM: 3 });
    expect(result.created.deltaPercent).toBe(100);
  });
});
