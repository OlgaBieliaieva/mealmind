import { describe, expect, it, vi } from "vitest";

import type { ActiveFamilyContextResolver } from "../../../application/family-context/active-family-context.js";
import type { ShoppingListRepository } from "../domain/shopping-list-repository.js";
import { createShoppingListService } from "./shopping-list-service.js";

function familyContext(timeZone = "Europe/Kyiv"): ActiveFamilyContextResolver {
  return {
    resolve: vi.fn(async () => ({
      id: "family-id",
      name: "Родина",
      timeZone,
      weekStartsOn: "MONDAY" as const,
      role: "MEMBER" as const,
    })),
  };
}

describe("shopping list service", () => {
  it("uses trusted family local date and delegates generation in family scope", async () => {
    const generate = vi.fn(async () => ({ id: "list-id" }));
    const repository = { generate } as unknown as ShoppingListRepository;
    const service = createShoppingListService(
      repository,
      familyContext("Europe/Kyiv"),
      () => new Date("2026-08-30T21:30:00.000Z"),
    );

    await service.generate("user-id", {
      mealPlanId: "plan-id",
      periodStart: "2026-08-31",
      periodEnd: "2026-09-06",
    });

    expect(generate).toHaveBeenCalledWith({
      familyId: "family-id",
      userId: "user-id",
      mealPlanId: "plan-id",
      periodStart: "2026-08-31",
      periodEnd: "2026-09-06",
    });
  });

  it("rejects a period that starts before familyToday", async () => {
    const generate = vi.fn();
    const service = createShoppingListService(
      { generate } as unknown as ShoppingListRepository,
      familyContext("Pacific/Kiritimati"),
      () => new Date("2026-08-30T12:30:00.000Z"),
    );

    await expect(
      service.generate("user-id", {
        mealPlanId: "plan-id",
        periodStart: "2026-08-30",
        periodEnd: "2026-08-30",
      }),
    ).rejects.toMatchObject({ code: "SHOPPING_LIST_PERIOD_IN_PAST" });
    expect(generate).not.toHaveBeenCalled();
  });

  it("accepts one to seven consecutive calendar days only", async () => {
    const generate = vi.fn();
    const service = createShoppingListService(
      { generate } as unknown as ShoppingListRepository,
      familyContext(),
      () => new Date("2026-08-31T08:00:00.000Z"),
    );

    await expect(
      service.generate("user-id", {
        mealPlanId: "plan-id",
        periodStart: "2026-08-31",
        periodEnd: "2026-09-07",
      }),
    ).rejects.toMatchObject({ code: "SHOPPING_LIST_VALIDATION_FAILED" });
  });

  it("never accepts caller-supplied family scope for reads", async () => {
    const list = vi.fn(async () => []);
    const service = createShoppingListService(
      { list } as unknown as ShoppingListRepository,
      familyContext(),
    );
    await service.list("user-id");
    expect(list).toHaveBeenCalledWith("family-id");
  });
});
