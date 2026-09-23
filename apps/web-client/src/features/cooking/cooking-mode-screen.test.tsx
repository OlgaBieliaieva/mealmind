import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  completeCookingSession,
  getCookingSession,
  updateCookingIngredient,
  type CookingSession,
} from "@/shared/api/cooking";
import { getFoodDetails, type RecipeFoodDetails } from "@/shared/api/food";
import { validateRenderedUi } from "@/test/ui-quality";

import { CookingModeScreen } from "./cooking-mode-screen";

const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));

vi.mock("sonner", () => ({ toast }));
vi.mock("@/shared/api/browser-api-client", () => ({ getBrowserApiClient: () => ({}) }));
vi.mock("@/shared/api/products", () => ({ searchProducts: vi.fn() }));
vi.mock("@/shared/api/food", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/shared/api/food")>();
  return { ...original, getFoodDetails: vi.fn() };
});
vi.mock("@/shared/api/cooking", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/shared/api/cooking")>();
  return {
    ...original,
    getCookingSession: vi.fn(),
    updateCookingIngredient: vi.fn(),
    addCookingIngredient: vi.fn(),
    deleteCookingIngredient: vi.fn(),
    updateCookingStep: vi.fn(),
    updateCookingYield: vi.fn(),
    completeCookingSession: vi.fn(),
    cancelCookingSession: vi.fn(),
  };
});

function session(overrides: Partial<CookingSession> = {}): CookingSession {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    recipeId: "22222222-2222-4222-8222-222222222222",
    status: "IN_PROGRESS",
    revision: 3,
    startedAt: "2026-09-22T12:00:00.000Z",
    completedAt: null,
    cancelledAt: null,
    recipe: {
      title: "Овочеве рагу",
      summary: "Сімейна вечеря",
      description: null,
      difficulty: "EASY",
      prepTimeMin: 15,
      cookTimeMin: 30,
      restTimeMin: null,
      imageUrl: null,
    },
    planEntries: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        date: "2026-09-22",
        mealType: "Вечеря",
        plannedDemandWeightG: 300,
        removed: false,
      },
    ],
    ingredients: [
      {
        id: "44444444-4444-4444-8444-444444444444",
        source: "RECIPE",
        position: 1,
        status: "USED",
        planned: {
          productId: "55555555-5555-4555-8555-555555555555",
          productName: "Картопля",
          quantity: 300,
          unit: "г",
          gramWeight: 300,
        },
        actual: {
          productId: "55555555-5555-4555-8555-555555555555",
          productName: "Картопля",
          quantity: 300,
          unit: "г",
          gramWeight: 300,
        },
      },
    ],
    steps: [
      {
        id: "66666666-6666-4666-8666-666666666666",
        position: 1,
        instruction: "Тушкувати овочі",
        timerSeconds: 1800,
        status: "COMPLETED",
      },
    ],
    progress: { resolvedIngredients: 1, totalIngredients: 1, resolvedSteps: 1, totalSteps: 1 },
    nutrition: {
      basis: "PLANNED_ESTIMATE",
      completeness: "COMPLETE",
      nutrients: [
        {
          nutrientId: "77777777-7777-4777-8777-777777777777",
          code: "energy_kcal",
          name: "Енергія",
          unit: "KCAL",
          valueTotal: 150,
          valuePer100g: 50,
        },
      ],
    },
    yield: {
      plannedWeightG: 300,
      actualWeightG: null,
      method: null,
      tareWeightG: null,
      grossWeightG: null,
    },
    hasCookingProgress: true,
    canComplete: true,
    ...overrides,
  };
}

function recipeDetails(): RecipeFoodDetails {
  return {
    kind: "recipe",
    id: "22222222-2222-4222-8222-222222222222",
    title: "Овочеве рагу",
    summary: "Сімейна вечеря",
    description: "Довгий опис базового рецепту",
    difficulty: "EASY",
    recipeType: { code: "main_dishes", name: "Основна страва" },
    author: {
      name: "MealMind",
      bio: "Автор перевірених сімейних рецептів",
      type: "MEALMIND",
      avatarUrl: null,
      links: [],
    },
    imageUrl: null,
    baseServings: 4,
    yieldWeightG: "1200",
    prepTimeMin: 15,
    cookTimeMin: 30,
    restTimeMin: null,
    totalTimeMin: 45,
    isFavorite: false,
    ingredients: [],
    steps: [],
    cuisines: [{ id: "cuisine", name: "Українська" }],
    dietaryTags: [{ id: "tag", name: "Вегетаріанська" }],
    sources: [],
    videos: [],
    images: [],
    nutrients: [
      {
        id: "energy",
        code: "energy_kcal",
        name: "Енергія",
        group: "ENERGY",
        unit: "KCAL",
        completeness: "COMPLETE",
        valuePer100g: "100.2",
      },
      {
        id: "protein",
        code: "protein",
        name: "Білки",
        group: "MACRONUTRIENT",
        unit: "G",
        completeness: "COMPLETE",
        valuePer100g: "19.7",
      },
      {
        id: "fat",
        code: "total_fat",
        name: "Жири",
        group: "MACRONUTRIENT",
        unit: "G",
        completeness: "COMPLETE",
        valuePer100g: "1.6",
      },
      {
        id: "carbohydrate",
        code: "carbohydrate",
        name: "Вуглеводи",
        group: "MACRONUTRIENT",
        unit: "G",
        completeness: "COMPLETE",
        valuePer100g: "1.9",
      },
    ],
  };
}

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CookingModeScreen sessionId="11111111-1111-4111-8111-111111111111" />
    </QueryClientProvider>,
  );
}

describe("CookingModeScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCookingSession).mockResolvedValue({ data: session() });
    vi.mocked(getFoodDetails).mockResolvedValue({ data: recipeDetails() });
  });

  it("renders persisted cooking state with accessible tabs", async () => {
    const { container } = renderScreen();
    expect(await screen.findByRole("heading", { name: "Овочеве рагу" })).toBeInTheDocument();
    expect(container.querySelector(".cooking-mode")).toHaveClass("food-details");
    expect(container.querySelector(".cooking-detail-hero__icon")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Інгредієнти" })).toBeInTheDocument();
    expect(screen.getByText("22 вер. · Вечеря")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Планові макронутрієнти" })).toBeVisible();
    expect(screen.getByText("100,2 ккал")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Додаткова інформація" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "MealMind" })).toBeVisible();
    expect(screen.getByRole("button", { name: /Вага страви/ })).toHaveClass("ui-button--secondary");
    expect(screen.getByRole("button", { name: /^Завершити$/ })).toHaveClass("ui-button--primary");
    expect(screen.getByRole("button", { name: "Скасувати приготування" })).toHaveClass(
      "ui-button--danger",
    );
    await validateRenderedUi(container);
  });

  it("does not reuse the closed-state key for sibling dialogs", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      renderScreen();
      await screen.findByRole("heading", { name: "Овочеве рагу" });

      expect(consoleError.mock.calls.flat().join(" ")).not.toContain(
        "Encountered two children with the same key",
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("never completes automatically when all items are resolved", async () => {
    vi.mocked(completeCookingSession).mockResolvedValue({
      data: session({ status: "COMPLETED", revision: 4, completedAt: "2026-09-22T13:00:00.000Z" }),
    });
    renderScreen();
    await screen.findByRole("heading", { name: "Овочеве рагу" });
    expect(completeCookingSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^Завершити$/ }));
    expect(screen.getByRole("heading", { name: "Завершити приготування?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Завершити приготування" }));
    await waitFor(() =>
      expect(completeCookingSession).toHaveBeenCalledWith(
        {},
        "11111111-1111-4111-8111-111111111111",
        3,
        false,
      ),
    );
  });

  it("confirms an untouched ingredient without changing its planned amount", async () => {
    const pending = session({
      ingredients: [{ ...session().ingredients[0]!, status: "PENDING", actual: null }],
      progress: { resolvedIngredients: 0, totalIngredients: 1, resolvedSteps: 1, totalSteps: 1 },
      canComplete: false,
    });
    vi.mocked(getCookingSession).mockResolvedValue({ data: pending });
    vi.mocked(updateCookingIngredient).mockResolvedValue({ data: session({ revision: 4 }) });
    renderScreen();
    fireEvent.click(await screen.findByRole("tab", { name: "Інгредієнти" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Підтвердити Картопля" }));
    await waitFor(() =>
      expect(updateCookingIngredient).toHaveBeenCalledWith(
        {},
        pending.id,
        pending.ingredients[0]!.id,
        { expectedRevision: 3, status: "USED" },
      ),
    );
  });
});
