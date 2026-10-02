import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { validateRenderedUi } from "@/test/ui-quality";
import { readRecipeFilterOptions, searchFood, setFoodFavorite } from "@/shared/api/food";
import { createMealEntries, getPlanningContext } from "@/shared/api/meal-plans";
import { FoodDiscovery } from "./food-discovery";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  parameters: "returnTo=%2Fplan",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => new URLSearchParams(navigation.parameters),
}));

vi.mock("@/shared/api/browser-api-client", () => ({
  getBrowserApiClient: () => ({}),
}));

vi.mock("@/shared/api/food", () => ({
  readRecipeFilterOptions: vi.fn(),
  searchFood: vi.fn(),
  setFoodFavorite: vi.fn(),
}));
vi.mock("@/shared/api/meal-plans", () => ({
  createMealEntries: vi.fn(),
  getPlanningContext: vi.fn(),
}));

function renderDiscovery() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <FoodDiscovery />
    </QueryClientProvider>,
  );
}

describe("FoodDiscovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigation.parameters = "returnTo=%2Fplan";
    vi.mocked(searchFood).mockResolvedValue({
      data: {
        items: [
          {
            kind: "product",
            id: "product-id",
            name: "Яблуко",
            category: { id: "category-id", code: "fruits", name: "Фрукти" },
            brandName: null,
            foodState: "raw",
            foodCharacteristicNames: ["Заморожений"],
            imageUrl: null,
            nutrition: {
              basis: "PER_100G",
              energyKcal: 52,
              proteinG: 0.3,
              fatG: 0.2,
              carbohydrateG: 14,
            },
            isFavorite: true,
          },
        ],
      },
      meta: { page: 1, pageSize: 20, total: 1 },
    });
    vi.mocked(setFoodFavorite).mockResolvedValue(undefined);
    vi.mocked(readRecipeFilterOptions).mockResolvedValue({
      recipeTypes: [],
      authors: [],
      cuisines: [],
      dietaryTags: [],
    });
    vi.mocked(getPlanningContext).mockResolvedValue({
      data: {
        familyId: "family-id",
        familyName: "Родина",
        role: "OWNER",
        weekStart: "2026-08-24",
        weekEnd: "2026-08-30",
        availableDays: ["2026-08-25"],
        members: [
          {
            id: "member-id",
            name: "Олена",
            avatarUrl: null,
            isSelf: true,
            canPlan: true,
            mealTypes: [{ id: "breakfast", code: "breakfast", name: "Сніданок", sortOrder: 1 }],
          },
        ],
      },
    });
    vi.mocked(createMealEntries).mockResolvedValue({
      data: { entries: [], replayed: false },
    });
  });

  it("renders accessible favorites results and preserves the plan return path", async () => {
    const { container } = renderDiscovery();
    expect(await screen.findByRole("link", { name: /Яблуко/ })).toHaveAttribute(
      "href",
      "/food/product/product-id?returnTo=%2Fplan%2Fdiscover%3FreturnTo%3D%252Fplan%26tab%3Dfavorites",
    );
    expect(screen.getByText("Сирий, Заморожений")).toBeVisible();
    const cardMetadata = container.querySelectorAll(".food-result-list__content > small");
    expect([...cardMetadata].map((item) => item.textContent?.trim()).slice(0, 2)).toEqual([
      "Сирий, Заморожений",
      "🍎Фрукти",
    ]);
    expect(searchFood).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ query: "", favorites: true }),
      expect.any(AbortSignal),
    );
    await validateRenderedUi(container);
  });

  it("optimistically toggles a family favorite", async () => {
    renderDiscovery();
    const button = await screen.findByRole("button", { name: "Видалити Яблуко з обраного" });
    button.click();
    await waitFor(() =>
      expect(setFoodFavorite).toHaveBeenCalledWith(
        expect.anything(),
        "product",
        "product-id",
        false,
      ),
    );
  });

  it("loads ten latest recipes without requiring a search query", async () => {
    renderDiscovery();
    fireEvent.click(screen.getByRole("tab", { name: "Рецепти" }));

    expect(await screen.findByRole("heading", { name: "Останні додані рецепти" })).toBeVisible();
    await waitFor(() =>
      expect(searchFood).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          query: "",
          type: "recipe",
          favorites: false,
          pageSize: 10,
        }),
        expect.any(AbortSignal),
      ),
    );
    expect(screen.getByRole("button", { name: "Фільтри" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("uses one base recipe serving for quick plan addition", async () => {
    navigation.parameters = "mode=select&date=2026-08-25&returnTo=%2Fplan";
    vi.mocked(searchFood).mockResolvedValue({
      data: {
        items: [
          {
            kind: "recipe",
            id: "recipe-id",
            name: "Овочеве рагу",
            summary: null,
            difficulty: "EASY",
            totalTimeMin: 40,
            baseServings: 5,
            yieldWeightG: 1120,
            recipeType: null,
            cuisines: [],
            dietaryTags: [],
            author: null,
            imageUrl: null,
            nutrition: {
              basis: "PER_SERVING",
              energyKcal: 220,
              proteinG: 8,
              fatG: 7,
              carbohydrateG: 30,
            },
            isFavorite: true,
          },
        ],
      },
      meta: { page: 1, pageSize: 20, total: 1 },
    });

    renderDiscovery();
    fireEvent.click(await screen.findByRole("button", { name: "Вибрати Овочеве рагу" }));
    fireEvent.click(screen.getByRole("button", { name: "Додати (1)" }));

    await waitFor(() =>
      expect(createMealEntries).toHaveBeenCalledWith({}, "2026-08-25", [
        {
          date: "2026-08-25",
          mealTypeId: "breakfast",
          kind: "recipe",
          foodId: "recipe-id",
          participants: [{ memberId: "member-id", quantityGrams: 224 }],
        },
      ]),
    );
  });
});
