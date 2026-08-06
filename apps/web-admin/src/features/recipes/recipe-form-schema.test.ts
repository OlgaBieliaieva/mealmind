import { describe, expect, it } from "vitest";
import { EMPTY_RECIPE_FORM, mapRecipeFormToWrite, recipeFormSchema } from "./recipe-form-schema";

describe("recipe form schema", () => {
  it("maps ordered gram ingredients and timers to the API contract", () => {
    const values = {
      ...EMPTY_RECIPE_FORM,
      title: "Суп",
      baseServings: "2",
      ingredients: [
        {
          productId: "00000000-0000-4000-8000-000000000001",
          gramWeight: "150",
          isOptional: false,
          note: "",
        },
      ],
      steps: [{ instruction: "Варити", timerMinutes: "10" }],
    };
    expect(recipeFormSchema.safeParse(values).success).toBe(true);
    expect(mapRecipeFormToWrite(values)).toMatchObject({
      ingredients: [{ quantity: "150", gramWeight: "150" }],
      steps: [{ timerSeconds: 600 }],
    });
  });

  it("rejects empty dynamic collections", () => {
    expect(
      recipeFormSchema.safeParse({ ...EMPTY_RECIPE_FORM, title: "Суп", ingredients: [], steps: [] })
        .success,
    ).toBe(false);
  });
});
