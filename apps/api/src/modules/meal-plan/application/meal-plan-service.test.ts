import { describe, expect, it, vi } from "vitest";

import type { ActiveFamilyContextResolver } from "../../../application/family-context/active-family-context.js";
import type { MealPlanRepository } from "../domain/meal-plan-repository.js";
import { createMealPlanService } from "./meal-plan-service.js";

describe("meal plan service", () => {
  it("resolves the canonical week using the family week-start policy", async () => {
    const repository: MealPlanRepository = {
      readWeek: vi.fn(async (_familyId, query) => ({
        planId: null,
        familyId: "family-id",
        familyName: "Родина",
        role: "OWNER" as const,
        selfMemberId: null,
        selectedDates: query.selectedDates,
        weekStart: query.weekStart.toISOString().slice(0, 10),
        weekEnd: query.weekEnd.toISOString().slice(0, 10),
        weekStartsOn: "MONDAY",
        timeZone: "Europe/Kyiv",

        days: [],

        aggregatedMeals: {
          all: [],
          byMealType: [],
        },

        members: [],
      })),
    } as unknown as MealPlanRepository;
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
      selectedDates: ["2026-08-21"],
      userId: "user-id",
      role: "OWNER",
    });
    expect(result.weekStart).toBe("2026-08-17");
  });

  it("supports a non-Monday family week without depending on server timezone", async () => {
    const repository: MealPlanRepository = {
      readWeek: vi.fn(async (_familyId, query) => ({
        planId: null,
        familyId: "family-id",
        familyName: "Родина",
        role: "OWNER" as const,
        selfMemberId: null,
        selectedDates: query.selectedDates,
        weekStart: query.weekStart.toISOString().slice(0, 10),
        weekEnd: query.weekEnd.toISOString().slice(0, 10),
        weekStartsOn: "MONDAY",
        timeZone: "Europe/Kyiv",

        days: [],

        aggregatedMeals: {
          all: [],
          byMealType: [],
        },

        members: [],
      })),
    } as unknown as MealPlanRepository;
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
      selectedDates: ["2026-08-21"],
      userId: "user-id",
      role: "MEMBER",
    });
  });

  it("normalizes an atomic batch and creates a stable fingerprint", async () => {
    const createEntries = vi.fn(async () => ({ entries: [], replayed: false }));
    const repository = { createEntries } as unknown as MealPlanRepository;
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
    await createMealPlanService(repository, familyContext).createEntries("user-id", "2026-08-25", {
      requestId: "00000000-0000-4000-8000-000000000001",
      conflictPolicy: "REJECT",
      entries: [
        {
          date: "2026-08-25",
          mealTypeId: "meal-id",
          kind: "product",
          foodId: "food-id",
          participants: [
            { memberId: "member-b", quantityGrams: 150 },
            { memberId: "member-a", quantityGrams: 100 },
          ],
        },
      ],
    });
    expect(createEntries).toHaveBeenCalledWith(
      expect.objectContaining({
        familyId: "family-id",
        userId: "user-id",
        fingerprint: expect.stringMatching(/^[0-9a-f]{64}$/),
        entries: [
          expect.objectContaining({
            participants: [
              { memberId: "member-a", quantityGrams: 100 },
              { memberId: "member-b", quantityGrams: 150 },
            ],
          }),
        ],
      }),
    );
  });

  it("rejects selected dates outside the canonical family week", async () => {
    const repository = { readWeek: vi.fn() } as unknown as MealPlanRepository;
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
    await expect(
      createMealPlanService(repository, familyContext).readWeek("user-id", "2026-08-25", [
        "2026-09-01",
      ]),
    ).rejects.toMatchObject({ code: "MEAL_PLAN_VALIDATION_FAILED" });
    expect(repository.readWeek).not.toHaveBeenCalled();
  });

  it("delegates readiness updates with the resolved family role", async () => {
    const setEntryPrepared = vi.fn(async () => ({
      id: "entry-id",
      revision: 3,
      preparedAt: "2026-08-26T10:00:00.000Z",
    }));
    const repository = { setEntryPrepared } as unknown as MealPlanRepository;
    const familyContext: ActiveFamilyContextResolver = {
      resolve: vi.fn(
        async () =>
          ({
            id: "family-id",
            name: "Родина",
            timeZone: "Europe/Kyiv",
            weekStartsOn: "MONDAY",
            role: "MEMBER",
          }) as const,
      ),
    };
    await createMealPlanService(repository, familyContext).setEntryPrepared("user-id", "entry-id", {
      expectedRevision: 2,
      prepared: true,
    });
    expect(setEntryPrepared).toHaveBeenCalledWith({
      familyId: "family-id",
      userId: "user-id",
      role: "MEMBER",
      entryId: "entry-id",
      expectedRevision: 2,
      prepared: true,
    });
  });
});
