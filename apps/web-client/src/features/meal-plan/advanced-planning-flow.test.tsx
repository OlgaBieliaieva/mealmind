import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getFoodDetails } from "@/shared/api/food";
import { createMealEntries, getPlanningContext } from "@/shared/api/meal-plans";
import { validateRenderedUi } from "@/test/ui-quality";
import { AdvancedPlanningFlow } from "./advanced-planning-flow";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("date=2026-08-25&returnTo=%2Fplan"),
}));
vi.mock("@/shared/api/browser-api-client", () => ({ getBrowserApiClient: () => ({}) }));
vi.mock("@/shared/api/food", () => ({ getFoodDetails: vi.fn() }));
vi.mock("@/shared/api/meal-plans", () => ({
  getPlanningContext: vi.fn(),
  createMealEntries: vi.fn(),
}));

describe("AdvancedPlanningFlow", () => {
  it("keeps member controls independent and opens an accessible review", async () => {
    vi.mocked(getPlanningContext).mockResolvedValue({
      data: {
        familyId: "family-id",
        familyName: "Родина",
        role: "OWNER",
        weekStart: "2026-08-24",
        weekEnd: "2026-08-30",
        availableDays: [
          "2026-08-24",
          "2026-08-25",
          "2026-08-26",
          "2026-08-27",
          "2026-08-28",
          "2026-08-29",
          "2026-08-30",
        ],
        members: [
          {
            id: "member-a",
            name: "Анна",
            avatarUrl: null,
            isSelf: true,
            canPlan: true,
            mealTypes: [{ id: "breakfast", code: "breakfast", name: "Сніданок", sortOrder: 10 }],
          },
          {
            id: "member-b",
            name: "Олексій",
            avatarUrl: null,
            isSelf: false,
            canPlan: true,
            mealTypes: [{ id: "dinner", code: "dinner", name: "Вечеря", sortOrder: 20 }],
          },
        ],
      },
    });
    vi.mocked(getFoodDetails).mockResolvedValue({
      data: {
        kind: "product",
        id: "food-id",
        name: "Яблуко",
        nameEn: "Apple",
        category: { id: "category", code: "fruits", name: "Фрукти" },
        brand: null,
        imageUrl: null,
        foodState: "RAW",
        defaultUnit: { id: "g", symbol: "г" },
        isFavorite: false,
        nutrients: [],
        portions: [],
        relatedRecipes: [],
      },
    });
    vi.mocked(createMealEntries).mockResolvedValue({ data: { entries: [], replayed: false } });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { container } = render(
      <QueryClientProvider client={client}>
        <AdvancedPlanningFlow kind="product" id="food-id" />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole("heading", { name: "Додати в план" })).toBeInTheDocument();

    const quantity = screen.getByRole("spinbutton", { name: "Порція у грамах" });
    fireEvent.change(quantity, { target: { value: "" } });
    expect(quantity).toHaveValue(null);
    fireEvent.change(quantity, { target: { value: "175" } });
    expect(quantity).toHaveValue(175);

    fireEvent.click(screen.getByRole("button", { name: "Сніданок" }));
    fireEvent.click(screen.getByRole("button", { name: /Переглянути й додати/ }));
    expect(screen.getByRole("dialog", { name: "Перевірте план" })).toBeInTheDocument();
    await validateRenderedUi(container);
  });
});
