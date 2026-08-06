import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { validateRenderedUi } from "@/test/ui-quality";
import { RecipeDetails } from "./recipe-details";

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    isPending: false,
    isError: false,
    data: {
      data: {
        id: "recipe",
        title: "Яблучний пиріг",
        summary: "Домашній десерт",
        description: "Приготуйте тісто.",
        difficulty: "EASY",
        recipeTypeName: "Десерт",
        authorName: "MealMind",
        author: { displayName: "MealMind", bio: null },
        baseServings: 4,
        yieldWeightG: "800",
        prepTimeMin: 20,
        cookTimeMin: 40,
        restTimeMin: null,
        cuisines: [{ id: "ua", name: "Українська" }],
        dietaryTags: [],
        ingredients: [
          {
            id: "i1",
            productId: "p1",
            productName: "Яблуко",
            quantity: "300",
            gramWeight: "300",
            measurementUnitSymbol: null,
            isOptional: false,
            note: null,
            position: 0,
          },
        ],
        steps: [{ id: "s1", position: 0, instruction: "Випікати", timerSeconds: 2400 }],
        sources: [],
        videos: [],
        nutrients: [
          {
            nutrientId: "n1",
            code: "energy_kcal",
            name: "Енергія",
            unit: "KCAL",
            group: "ENERGY",
            valueTotal: "800",
            valuePerServing: "200",
            valuePer100g: "100",
            completeness: "COMPLETE",
          },
        ],
      },
    },
  }),
}));
vi.mock("@/shared/api/browser-api-client", () => ({ getBrowserApiClient: () => ({}) }));

describe("RecipeDetails", () => {
  it("switches between labelled recipe sections and keeps valid markup", async () => {
    const { container } = render(<RecipeDetails recipeId="recipe" />);
    expect(screen.getByRole("heading", { name: "Яблучний пиріг" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Інгредієнти" }));
    expect(screen.getByText("Яблуко")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Поживність" }));
    expect(screen.getByText("200 ккал")).toBeInTheDocument();
    await validateRenderedUi(container);
  });
});
