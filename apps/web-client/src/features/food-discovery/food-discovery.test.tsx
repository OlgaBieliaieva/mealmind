import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { validateRenderedUi } from "@/test/ui-quality";
import { readRecipeFilterOptions, searchFood, setFoodFavorite } from "@/shared/api/food";
import { FoodDiscovery } from "./food-discovery";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("returnTo=%2Fplan"),
}));

vi.mock("@/shared/api/browser-api-client", () => ({
  getBrowserApiClient: () => ({}),
}));

vi.mock("@/shared/api/food", () => ({
  readRecipeFilterOptions: vi.fn(),
  searchFood: vi.fn(),
  setFoodFavorite: vi.fn(),
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
    vi.mocked(searchFood).mockResolvedValue({
      data: {
        items: [
          {
            kind: "product",
            id: "product-id",
            name: "Яблуко",
            category: { id: "category-id", code: "fruits", name: "Фрукти" },
            brandName: null,
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
  });

  it("renders accessible favorites results and preserves the plan return path", async () => {
    const { container } = renderDiscovery();
    expect(await screen.findByRole("link", { name: /Яблуко/ })).toHaveAttribute(
      "href",
      "/food/product/product-id?returnTo=%2Fplan%2Fdiscover%3FreturnTo%3D%252Fplan%26tab%3Dfavorites",
    );
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
});
