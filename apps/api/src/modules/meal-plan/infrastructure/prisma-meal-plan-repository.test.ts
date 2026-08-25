import type { DatabaseClient } from "@mealmind/db";
import { describe, expect, it, vi } from "vitest";

import { createPrismaMealPlanRepository } from "./prisma-meal-plan-repository.js";

describe("Prisma meal plan repository", () => {
  it("returns the family name and the union of configured active meal types", async () => {
    const breakfast = {
      id: "breakfast-id",
      code: "breakfast",
      nameUa: "Сніданок",
      sortOrder: 10,
    };
    const dinner = {
      id: "dinner-id",
      code: "dinner",
      nameUa: "Вечеря",
      sortOrder: 30,
    };
    const database = {
      family: {
        findUniqueOrThrow: vi.fn(async () => ({
          name: "Родина Тестових",
          timeZone: "Europe/Kyiv",
          weekStartsOn: "MONDAY",
        })),
      },
      familyMember: {
        findMany: vi.fn(async () => [
          {
            id: "member-1",
            personProfile: {
              firstName: "Олена",
              lastName: null,
              mealTypePreferences: [{ mealType: dinner }, { mealType: breakfast }],
              nutrientTargetSets: [],
            },
          },
          {
            id: "member-2",
            personProfile: {
              firstName: "Іван",
              lastName: null,
              mealTypePreferences: [{ mealType: breakfast }],
              nutrientTargetSets: [],
            },
          },
        ]),
      },
      mealPlan: { findUnique: vi.fn(async () => null) },
    } as unknown as DatabaseClient;

    const result = await createPrismaMealPlanRepository(database).readWeek("family-id", {
      weekStart: new Date("2026-08-17T00:00:00.000Z"),
      weekEnd: new Date("2026-08-23T00:00:00.000Z"),
    });

    expect(result.familyName).toBe("Родина Тестових");
    expect(result.days[0]?.meals.map(({ mealType }) => mealType.code)).toEqual([
      "breakfast",
      "dinner",
    ]);
    expect(result.days).toHaveLength(7);
    expect(result.planId).toBeNull();
  });
});
