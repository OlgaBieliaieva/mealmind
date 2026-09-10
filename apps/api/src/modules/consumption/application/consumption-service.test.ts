import { describe, expect, it, vi } from "vitest";

import type { ActiveFamilyContextResolver } from "../../../application/family-context/active-family-context.js";
import type {
  ConsumptionDashboard,
  ConsumptionRepository,
  DiaryDay,
} from "../domain/consumption-repository.js";
import { createConsumptionService } from "./consumption-service.js";

const day: DiaryDay = {
  familyName: "Родина",
  role: "OWNER",
  selfMemberId: "member-id",
  date: "2026-08-31",
  timeZone: "Europe/Kyiv",
  members: [],
};
const dashboard: ConsumptionDashboard = {
  familyName: "Родина",
  role: "OWNER",
  selfMemberId: "member-id",
  dates: ["2026-08-31", "2026-09-01"],
  periodStart: "2026-08-31",
  periodEnd: "2026-09-01",
  timeZone: "Europe/Kyiv",
  members: [],
};

function context(role: "OWNER" | "MEMBER" = "OWNER"): ActiveFamilyContextResolver {
  return {
    resolve: vi.fn(async () => ({
      id: "family-id",
      name: "Родина",
      timeZone: "Europe/Kyiv",
      weekStartsOn: "MONDAY" as const,
      role,
    })),
  };
}

function repository(overrides: Partial<ConsumptionRepository> = {}): ConsumptionRepository {
  return {
    participantDate: vi.fn(async () => day.date),
    readDay: vi.fn(async () => day),
    readDashboard: vi.fn(async () => dashboard),
    confirmPlanned: vi.fn(async () => undefined),
    skipPlanned: vi.fn(async () => undefined),
    restorePlanned: vi.fn(async () => undefined),
    updateEntry: vi.fn(async () => undefined),
    voidEntry: vi.fn(async () => undefined),
    addManual: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("consumption service", () => {
  it("derives family scope and role on diary reads", async () => {
    const readDay = vi.fn(async () => day);
    const service = createConsumptionService(repository({ readDay }), context("MEMBER"));

    await service.readDay("user-id", "2026-08-31");

    expect(readDay).toHaveBeenCalledWith({
      familyId: "family-id",
      familyName: "Родина",
      timeZone: "Europe/Kyiv",
      role: "MEMBER",
      userId: "user-id",
      date: "2026-08-31",
    });
  });

  it("returns the participant day after explicit confirmation", async () => {
    const confirmPlanned = vi.fn(async () => undefined);
    const participantDate = vi.fn(async () => "2026-08-20");
    const readDay = vi.fn(async () => ({ ...day, date: "2026-08-20" }));
    const service = createConsumptionService(
      repository({ confirmPlanned, participantDate, readDay }),
      context(),
    );

    await service.confirmPlanned("owner-id", "participant-id", 125);

    expect(confirmPlanned).toHaveBeenCalledWith({
      familyId: "family-id",
      role: "OWNER",
      userId: "owner-id",
      participantId: "participant-id",
      quantityGrams: 125,
    });
    expect(readDay).toHaveBeenCalledWith(expect.objectContaining({ date: "2026-08-20" }));
  });

  it("restores signed recipe thumbnails after explicit confirmation", async () => {
    const imageDay: DiaryDay = {
      ...day,
      members: [
        {
          memberId: "member-id",
          name: "Олена",
          isSelf: true,
          canEdit: true,
          mealTypes: [],
          summary: {
            plannedCount: 1,
            confirmedCount: 1,
            changedCount: 0,
            skippedCount: 0,
            pendingCount: 0,
            addedCount: 0,
            deviationCount: 0,
            adherencePercent: 100,
          },
          nutrients: [],
          targets: [],
          items: [
            {
              key: "planned:participant-id",
              source: "MEAL_PLAN",
              participantId: "participant-id",
              entryId: "entry-id",
              revision: 1,
              kind: "recipe",
              foodId: "recipe-id",
              name: "Суп",
              imageUrl: null,
              imageObjectPath: "recipes/recipe-id/photo.jpg",
              categoryCode: null,
              categoryName: null,
              recipeType: null,
              mealType: null,
              plannedMealType: null,
              energyPer100g: null,
              plannedQuantityGrams: 250,
              plannedEnergyKcal: null,
              actualQuantityGrams: 250,
              actualEnergyKcal: null,
              macros: { protein: null, fat: null, carbohydrate: null },
              status: "CONFIRMED",
              preparedAt: null,
            },
          ],
        },
      ],
    };
    const createReadUrl = vi.fn(async () => "https://storage.test/thumbnail.jpg");
    const service = createConsumptionService(
      repository({ readDay: vi.fn(async () => imageDay) }),
      context(),
      {
        products: { createReadUrl: vi.fn(async () => "") },
        recipes: { createReadUrl },
      },
    );

    const result = await service.confirmPlanned("owner-id", "participant-id");

    expect(result.members[0]?.items[0]?.imageUrl).toBe("https://storage.test/thumbnail.jpg");
    expect(createReadUrl).toHaveBeenCalledWith("recipes/recipe-id/photo.jpg.thumbnail.webp");
  });

  it("derives family scope for period dashboard reads", async () => {
    const readDashboard = vi.fn(async () => dashboard);
    const service = createConsumptionService(repository({ readDashboard }), context("MEMBER"));

    await service.readDashboard("user-id", ["2026-08-31", "2026-09-01"]);

    expect(readDashboard).toHaveBeenCalledWith({
      familyId: "family-id",
      familyName: "Родина",
      timeZone: "Europe/Kyiv",
      role: "MEMBER",
      userId: "user-id",
      dates: ["2026-08-31", "2026-09-01"],
    });
  });

  it("supports one manual catalog fact on a past date", async () => {
    const addManual = vi.fn(async () => undefined);
    const service = createConsumptionService(repository({ addManual }), context());

    await service.addManual("owner-id", {
      memberId: "member-id",
      date: "2026-08-20",
      kind: "product",
      foodId: "product-id",
      mealTypeId: "breakfast-id",
      quantityGrams: 100,
    });

    expect(addManual).toHaveBeenCalledWith({
      familyId: "family-id",
      role: "OWNER",
      userId: "owner-id",
      memberId: "member-id",
      date: "2026-08-20",
      kind: "product",
      foodId: "product-id",
      mealTypeId: "breakfast-id",
      quantityGrams: 100,
    });
  });
});
