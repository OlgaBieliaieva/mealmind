import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getFoodDetails, setFoodFavorite, type FoodDetails as Food } from "@/shared/api/food";
import { addCatalogShoppingItem } from "@/shared/api/shopping-lists";
import { validateRenderedUi } from "@/test/ui-quality";

import { FoodDetails } from "./food-details";

const routerPush = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useSearchParams: () =>
    new URLSearchParams(
      "returnTo=%2Fplan%2Fdiscover%3FreturnTo%3D%252Fplan%26tab%3Dproduct%26query%3D%D1%87%D1%96%D0%B0&mode=shopping-product&shoppingListId=list-id&revision=3&shoppingReturnTo=%2Fshop%2Flist-id",
    ),
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("@/shared/api/browser-api-client", () => ({
  getBrowserApiClient: () => ({}),
}));

vi.mock("@/shared/api/food", () => ({
  getFoodDetails: vi.fn(),
  setFoodFavorite: vi.fn(),
}));

vi.mock("@/shared/api/shopping-lists", () => ({
  addCatalogShoppingItem: vi.fn(),
}));

const nutrient = (code: string, name: string, group: string, unit: string, value: string) => ({
  id: code,
  code,
  name,
  group,
  unit,
  completeness: "COMPLETE",
  valuePer100g: value,
});

const product: Extract<Food, { kind: "product" }> = {
  kind: "product",
  id: "product-id",
  name: "Чіа насіння",
  nameEn: "Chia seeds",
  category: { id: "category-id", code: "nuts_seeds", name: "Кіноа та інші" },
  brand: { name: "Metro Chef", countryCode: "UA", websiteUrl: "https://example.com" },
  imageUrl: "https://storage.test/product.webp",
  foodState: "RAW",
  defaultUnit: { id: "unit-id", symbol: "г" },
  isFavorite: false,
  nutrients: [
    nutrient("energy_kcal", "Енергія", "ENERGY", "KCAL", "486"),
    nutrient("protein", "Білки", "MACRONUTRIENT", "G", "16.5"),
    nutrient("total_fat", "Жири", "MACRONUTRIENT", "G", "30.7"),
    nutrient("carbohydrate", "Вуглеводи", "MACRONUTRIENT", "G", "42.1"),
  ],
  portions: [],
  relatedRecipes: [],
};

const recipe: Extract<Food, { kind: "recipe" }> = {
  kind: "recipe",
  id: "recipe-id",
  title: "Чіа пудинг",
  summary: "Корисний сніданок",
  description: "Детальний опис рецепта з насінням чіа.",
  difficulty: "EASY",
  recipeType: { code: "breakfast", name: "Сніданки" },
  author: {
    name: "Автор",
    bio: "Опис автора",
    type: "BLOGGER",
    avatarUrl: null,
    links: [{ id: "link-id", type: "WEBSITE", url: "https://example.com/author" }],
  },
  imageUrl: null,
  baseServings: 2,
  yieldWeightG: "300",
  prepTimeMin: 10,
  cookTimeMin: 20,
  restTimeMin: null,
  totalTimeMin: 30,
  isFavorite: true,
  ingredients: [
    {
      id: "ingredient-id",
      productId: "product-id",
      productName: "Чіа насіння",
      category: { code: "nuts_seeds", name: "Кіноа та інші" },
      imageUrl: null,
      nutrition: { energyKcal: 340, proteinG: 11.5, fatG: 21.5, carbohydrateG: 29.5 },
      quantity: "70",
      gramWeight: "70",
      unitSymbol: "г",
      isOptional: false,
      note: null,
      position: 1,
    },
  ],
  steps: [{ id: "step-id", position: 1, instruction: "Змішати.", timerSeconds: null }],
  cuisines: [{ id: "cuisine-id", name: "Міжнародна" }],
  dietaryTags: [{ id: "tag-id", name: "Вегетаріанське" }],
  sources: [{ id: "source-id", title: "Оригінал", url: "https://example.com/recipe" }],
  videos: [],
  images: [],
  nutrients: [
    { ...nutrient("energy_kcal", "Енергія", "ENERGY", "KCAL", "177"), valueTotal: "531" },
    { ...nutrient("protein", "Білки", "MACRONUTRIENT", "G", "8"), valueTotal: "24" },
    { ...nutrient("total_fat", "Жири", "MACRONUTRIENT", "G", "10"), valueTotal: "30" },
    {
      ...nutrient("carbohydrate", "Вуглеводи", "MACRONUTRIENT", "G", "16"),
      valueTotal: "48",
    },
  ],
};

function renderDetails(kind: "product" | "recipe") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FoodDetails kind={kind} id={kind + "-id"} />
    </QueryClientProvider>,
  );
}

describe("FoodDetails", () => {
  beforeEach(() => {
    routerPush.mockClear();
    vi.mocked(setFoodFavorite).mockResolvedValue(undefined);
    vi.mocked(addCatalogShoppingItem).mockResolvedValue({ data: {} } as never);
  });

  it("renders product overview and returns to the preserved discovery state", async () => {
    vi.mocked(getFoodDetails).mockResolvedValue({ data: product });
    const { container } = renderDetails("product");

    expect(await screen.findByRole("heading", { name: "Чіа насіння" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Повернутися до результатів пошуку" })).toHaveAttribute(
      "href",
      "/plan/discover?returnTo=%2Fplan&tab=product&query=%D1%87%D1%96%D0%B0",
    );
    expect(screen.getByText("Metro Chef")).toBeVisible();
    await validateRenderedUi(container);
  });

  it("adds a catalog product with 100 grams and returns to the shopping list", async () => {
    vi.mocked(getFoodDetails).mockResolvedValue({ data: product });
    renderDetails("product");

    await screen.findByRole("heading", { name: "Чіа насіння" });
    fireEvent.click(screen.getByRole("button", { name: "Дії з продуктом" }));
    fireEvent.click(screen.getByRole("button", { name: "Додати до списку покупок" }));

    await waitFor(() =>
      expect(addCatalogShoppingItem).toHaveBeenCalledWith({}, "list-id", {
        expectedRevision: 3,
        productId: "product-id",
        quantity: 100,
      }),
    );
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/shop/list-id"));
  });

  it("renders recipe overview, ingredient links and nutrients per 100 grams", async () => {
    vi.mocked(getFoodDetails).mockResolvedValue({ data: recipe });
    renderDetails("recipe");

    expect(await screen.findByRole("heading", { name: "Чіа пудинг" })).toBeVisible();
    expect(screen.getByText("Легко")).toBeVisible();
    expect(screen.getByText("150 г")).toBeVisible();
    expect(screen.getByText("300 г")).toBeVisible();
    fireEvent.click(screen.getByRole("tab", { name: "Інгредієнти" }));
    expect(screen.getByRole("link", { name: /Чіа насіння/ })).toHaveAttribute(
      "href",
      expect.stringContaining("/food/product/product-id?returnTo="),
    );
    fireEvent.click(screen.getByRole("tab", { name: "Нутрієнти" }));
    expect(screen.getByText("Значення наведені на 100 г готової страви")).toBeVisible();
    expect(screen.getAllByRole("progressbar").length).toBeGreaterThan(0);
    expect(screen.queryByText(/часткові дані/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/повні дані/i)).not.toBeInTheDocument();
  });

  it("renders separate video cards and opens a photo in the enlarged viewer", async () => {
    vi.mocked(getFoodDetails).mockResolvedValue({
      data: {
        ...recipe,
        images: [1, 2, 3].map((index) => ({
          id: "image-" + index,
          title: "Фото " + index,
          altText: "Крок приготування " + index,
          imageUrl: "https://storage.test/recipe-" + index + ".webp",
        })),
        videos: [
          {
            id: "video-id",
            platform: "YOUTUBE",
            title: "Як приготувати",
            externalUrl: "https://youtube.com/watch?v=recipe",
            durationSec: 120,
          },
        ],
      },
    });
    renderDetails("recipe");

    expect(await screen.findByRole("heading", { name: "Медіа" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Як приготувати/ })).toHaveAttribute(
      "href",
      "https://youtube.com/watch?v=recipe",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Збільшити фотографію: Крок приготування 1" }),
    );
    expect(screen.getByRole("dialog", { name: "Збільшена фотографія рецепта" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Закрити" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
