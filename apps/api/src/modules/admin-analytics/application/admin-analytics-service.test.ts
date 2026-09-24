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
});
