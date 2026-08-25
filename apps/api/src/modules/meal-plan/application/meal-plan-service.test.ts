import { describe, expect, it, vi } from "vitest";

import type { ActiveFamilyContextResolver } from "../../../application/family-context/active-family-context.js";
import type { MealPlanRepository } from "../domain/meal-plan-repository.js";
import { createMealPlanService } from "./meal-plan-service.js";

describe("meal plan service", () => {
  it("resolves the canonical week using the family week-start policy", async () => {
    const repository: MealPlanRepository = {
      readWeek: vi.fn(async (_familyId, query) => ({
        planId: null,
        familyName: "Родина",
        weekStart: query.weekStart.toISOString().slice(0, 10),
        weekEnd: query.weekEnd.toISOString().slice(0, 10),
        weekStartsOn: "MONDAY",
        timeZone: "Europe/Kyiv",
        days: [],
        members: [],
      })),
    };
    const familyContext: ActiveFamilyContextResolver = {
      resolve: vi.fn(
        async () =>
          ({
            id: "family-id",
            name: "Родина",
            timeZone: "Europe/Kyiv",
            weekStartsOn: "MONDAY",
            role: "OWNER",
          }) as const,
      ),
    };

    const result = await createMealPlanService(repository, familyContext).readWeek(
      "user-id",
      "2026-08-21",
    );

    expect(repository.readWeek).toHaveBeenCalledWith("family-id", {
      weekStart: new Date("2026-08-17T00:00:00.000Z"),
      weekEnd: new Date("2026-08-23T00:00:00.000Z"),
    });
    expect(result.weekStart).toBe("2026-08-17");
  });

  it("supports a non-Monday family week without depending on server timezone", async () => {
    const repository: MealPlanRepository = {
      readWeek: vi.fn(async (_familyId, query) => ({
        planId: null,
        familyName: "Family",
        weekStart: query.weekStart.toISOString().slice(0, 10),
        weekEnd: query.weekEnd.toISOString().slice(0, 10),
        weekStartsOn: "SUNDAY",
        timeZone: "America/New_York",
        days: [],
        members: [],
      })),
    };
    const familyContext: ActiveFamilyContextResolver = {
      resolve: vi.fn(
        async () =>
          ({
            id: "family-id",
            name: "Family",
            timeZone: "America/New_York",
            weekStartsOn: "SUNDAY",
            role: "MEMBER",
          }) as const,
      ),
    };

    await createMealPlanService(repository, familyContext).readWeek("user-id", "2026-08-21");
    expect(repository.readWeek).toHaveBeenCalledWith("family-id", {
      weekStart: new Date("2026-08-16T00:00:00.000Z"),
      weekEnd: new Date("2026-08-22T00:00:00.000Z"),
    });
  });
});
