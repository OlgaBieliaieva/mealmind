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
      selectedDates: ["2026-08-17"],
      userId: "user-id",
      role: "OWNER",
    });

    expect(result.familyName).toBe("Родина Тестових");
    expect(result.days[0]?.meals.map(({ mealType }) => mealType.code)).toEqual([
      "breakfast",
      "dinner",
    ]);
    expect(result.days).toHaveLength(7);
    expect(result.planId).toBeNull();
  });

  it("limits MEMBER read queries to the authenticated profile and its entries", async () => {
    const memberFindMany = vi.fn(async () => [
      {
        id: "self-member",
        personProfile: {
          userId: "user-id",
          firstName: "Олена",
          lastName: null,
          mealTypePreferences: [],
          nutrientTargetSets: [],
        },
      },
    ]);
    const planFindUnique = vi.fn(async () => null);
    const database = {
      family: {
        findUniqueOrThrow: vi.fn(async () => ({
          name: "Родина",
          timeZone: "Europe/Kyiv",
          weekStartsOn: "MONDAY",
        })),
      },
      familyMember: { findMany: memberFindMany },
      mealPlan: { findUnique: planFindUnique },
    } as unknown as DatabaseClient;
    const result = await createPrismaMealPlanRepository(database).readWeek("family-id", {
      weekStart: new Date("2026-08-24T00:00:00.000Z"),
      weekEnd: new Date("2026-08-30T00:00:00.000Z"),
      selectedDates: ["2026-08-25"],
      userId: "user-id",
      role: "MEMBER",
    });
    expect(memberFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          personProfile: expect.objectContaining({ userId: "user-id" }),
        }),
      }),
    );
    expect(planFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          entries: expect.objectContaining({
            where: expect.objectContaining({ participants: expect.any(Object) }),
          }),
        }),
      }),
    );
    expect(result.members.map((member) => member.memberId)).toEqual(["self-member"]);
  });

  it("preserves exact and range nutrient targets in daily and period projections", async () => {
    const decimal = (value: number) => ({ toString: () => String(value) });
    const database = {
      family: {
        findUniqueOrThrow: vi.fn(async () => ({
          name: "Родина",
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
              mealTypePreferences: [],
              nutrientTargetSets: [
                {
                  effectiveFrom: new Date("2026-08-01T00:00:00.000Z"),
                  effectiveTo: null,
                  targets: [
                    {
                      minimumValue: null,
                      targetValue: decimal(1883.4),
                      maximumValue: null,
                      nutrient: {
                        code: "energy_kcal",
                        nameUa: "Енергія",
                        unit: "KCAL",
                        sortOrder: 10,
                      },
                    },
                    {
                      minimumValue: decimal(60),
                      targetValue: null,
                      maximumValue: decimal(80),
                      nutrient: {
                        code: "protein",
                        nameUa: "Білки",
                        unit: "G",
                        sortOrder: 20,
                      },
                    },
                  ],
                },
              ],
            },
          },
        ]),
      },
      mealPlan: { findUnique: vi.fn(async () => null) },
    } as unknown as DatabaseClient;

    const result = await createPrismaMealPlanRepository(database).readWeek("family-id", {
      weekStart: new Date("2026-08-24T00:00:00.000Z"),
      weekEnd: new Date("2026-08-30T00:00:00.000Z"),
      selectedDates: ["2026-08-25", "2026-08-26"],
      userId: "user-id",
      role: "OWNER",
    });

    expect(result.members[0]?.details.days[0]?.nutrition.targets).toEqual([
      {
        code: "energy_kcal",
        name: "Енергія",
        unit: "KCAL",
        value: 1883.4,
        minimumValue: null,
        targetValue: 1883.4,
        maximumValue: null,
      },
      {
        code: "protein",
        name: "Білки",
        unit: "G",
        value: 70,
        minimumValue: 60,
        targetValue: null,
        maximumValue: 80,
      },
    ]);
    expect(result.members[0]?.targets).toEqual([
      {
        code: "energy_kcal",
        name: "Енергія",
        unit: "KCAL",
        value: 3766.8,
        minimumValue: null,
        targetValue: 3766.8,
        maximumValue: null,
      },
      {
        code: "protein",
        name: "Білки",
        unit: "G",
        value: 140,
        minimumValue: 120,
        targetValue: null,
        maximumValue: 160,
      },
    ]);
  });
});
