import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  listShoppingLists,
  readShoppingList,
  updateShoppingItem,
  type ShoppingListDetail,
} from "@/shared/api/shopping-lists";
import { validateRenderedUi } from "@/test/ui-quality";

import { ShoppingListDetailScreen } from "./shopping-list-detail";
import { formatShoppingDate } from "./shopping-list-generation";
import { ShoppingListsScreen } from "./shopping-lists-screen";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "list-id" }),
}));
vi.mock("@/shared/api/browser-api-client", () => ({
  getBrowserApiClient: () => ({}),
}));
vi.mock("@/shared/api/reference-data", () => ({
  listReferenceData: vi.fn(async () => ({
    data: { items: [] },
    meta: { page: 1, pageSize: 100, total: 0 },
  })),
}));
vi.mock("@/shared/api/shopping-lists", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/shared/api/shopping-lists")>();
  return {
    ...original,
    listShoppingLists: vi.fn(),
    readShoppingList: vi.fn(),
    updateShoppingItem: vi.fn(),
    setShoppingItemStatus: vi.fn(),
    addCustomShoppingItem: vi.fn(),
    setShoppingListStatus: vi.fn(),
    regenerateShoppingList: vi.fn(),
  };
});
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn() }),
}));

const detail: ShoppingListDetail = {
  id: "list-id",
  mealPlanId: "plan-id",
  familyName: "Demo Family",
  weekStart: "2026-08-31",
  periodStart: "2026-08-31",
  periodEnd: "2026-09-02",
  version: 1,
  revision: 1,
  status: "OPEN",
  generatedAt: "2026-08-31T09:00:00.000Z",
  itemCount: 1,
  purchasedCount: 0,
  removedCount: 0,
  sourceFingerprint: "a".repeat(64),
  currentSourceFingerprint: "a".repeat(64),
  stale: false,
  warnings: [],
  items: [
    {
      id: "item-id",
      origin: "GENERATED",
      status: "PENDING",
      productId: "product-id",
      name: "Борошно",
      category: { code: "flour", name: "Борошно" },
      groupCategory: { code: "grocery", name: "Бакалія" },
      derivedQuantity: 550,
      requestedQuantity: 550,
      unit: { id: "unit-id", code: "g", symbol: "г" },
      notes: null,
      purchasedAt: null,
      sources: [
        {
          kind: "RECIPE_INGREDIENT",
          date: "2026-08-31",
          recipeTitle: "Хліб",
          contributedQuantity: 550,
        },
      ],
    },
  ],
};

function renderWithQuery(element: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}

describe("shopping list UI", () => {
  beforeEach(() => {
    vi.mocked(listShoppingLists).mockResolvedValue({ data: [detail] });
    vi.mocked(readShoppingList).mockResolvedValue({ data: detail });
    vi.mocked(updateShoppingItem).mockResolvedValue({
      data: { ...detail, revision: 2, items: [{ ...detail.items[0]!, requestedQuantity: 600 }] },
    });
  });

  it("groups saved lists by month and exposes compact progress", async () => {
    const { container } = renderWithQuery(<ShoppingListsScreen />);
    expect(await screen.findByText("Серпень 2026 р.")).toBeInTheDocument();
    expect(screen.getByText("Придбано 0 з 1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /31 серп.*2 вер/ })).toHaveAttribute(
      "href",
      "/shop/list-id",
    );
    await validateRenderedUi(container);
  });

  it("formats the generation period as day, month and year", () => {
    expect(formatShoppingDate("2026-09-02")).toBe("02.09.2026");
  });

  it("sorts month groups and their cards from newest to oldest", async () => {
    vi.mocked(listShoppingLists).mockResolvedValue({
      data: [
        { ...detail, id: "august-early", periodStart: "2026-08-01", periodEnd: "2026-08-02" },
        { ...detail, id: "september", periodStart: "2026-09-01", periodEnd: "2026-09-02" },
        { ...detail, id: "august-late", periodStart: "2026-08-20", periodEnd: "2026-08-21" },
      ],
    });

    renderWithQuery(<ShoppingListsScreen />);

    expect(await screen.findByText("Вересень 2026 р.")).toBeInTheDocument();
    const listLinks = screen
      .getAllByRole("link")
      .filter((link) => /^\/shop\/(?!new$)/.test(link.getAttribute("href") ?? ""));
    expect(listLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/shop/september",
      "/shop/august-late",
      "/shop/august-early",
    ]);
  });

  it("keeps the unit fixed when requested quantity is edited", async () => {
    renderWithQuery(<ShoppingListDetailScreen />);
    const input = await screen.findByRole("spinbutton", { name: "Кількість Борошно" });
    fireEvent.change(input, { target: { value: "600" } });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти кількість Борошно" }));
    await waitFor(() =>
      expect(updateShoppingItem).toHaveBeenCalledWith({}, "list-id", "item-id", {
        expectedRevision: 1,
        requestedQuantity: 600,
      }),
    );
  });

  it("rounds quantity to a whole number and refreshes it after reset", async () => {
    vi.mocked(readShoppingList).mockResolvedValue({
      data: {
        ...detail,
        items: [{ ...detail.items[0]!, derivedQuantity: 550.4, requestedQuantity: 600.4 }],
      },
    });
    vi.mocked(updateShoppingItem).mockResolvedValue({
      data: {
        ...detail,
        revision: 2,
        items: [{ ...detail.items[0]!, derivedQuantity: 550.4, requestedQuantity: 550.4 }],
      },
    });

    renderWithQuery(<ShoppingListDetailScreen />);
    const input = await screen.findByRole("spinbutton", { name: "Кількість Борошно" });
    expect(input).toHaveValue(600);
    expect(screen.getByText("Розраховано: 550 г")).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Повернути розраховану кількість Борошно" }),
    );

    await waitFor(() => expect(input).toHaveValue(550));
  });
});
