import { describe, expect, it } from "vitest";

import { buildEntries, planningDraftKey } from "./advanced-planning-flow";

describe("advanced planning draft", () => {
  it("groups multiple members into one logical meal entry", () => {
    expect(
      buildEntries("recipe", "food-id", {
        anna: { days: ["2026-08-25"], mealTypeIds: ["breakfast"], quantityGrams: 120 },
        oleksii: { days: ["2026-08-25"], mealTypeIds: ["breakfast"], quantityGrams: 180 },
      }),
    ).toEqual([
      {
        date: "2026-08-25",
        mealTypeId: "breakfast",
        kind: "recipe",
        foodId: "food-id",
        participants: [
          { memberId: "anna", quantityGrams: 120 },
          { memberId: "oleksii", quantityGrams: 180 },
        ],
      },
    ]);
  });

  it("isolates persisted drafts by family, week and food flow", () => {
    const base = planningDraftKey("family-a", "2026-08-24", "product", "food-a");
    expect(base).not.toBe(planningDraftKey("family-b", "2026-08-24", "product", "food-a"));
    expect(base).not.toBe(planningDraftKey("family-a", "2026-08-31", "product", "food-a"));
    expect(base).not.toBe(planningDraftKey("family-a", "2026-08-24", "recipe", "food-a"));
  });
});
