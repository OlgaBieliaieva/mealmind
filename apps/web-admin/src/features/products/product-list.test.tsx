import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { validateRenderedUi } from "@/test/ui-quality";
import type { ProductSummary } from "@/shared/api/products";

import { ProductList } from "./product-list";

const mocks = vi.hoisted(() => ({ get: vi.fn(), replace: vi.fn(), searchParams: "" }));
const productId = "24b79ffc-e6af-440c-ae38-8cd37c22be1c";
const categoryId = "34b79ffc-e6af-440c-ae38-8cd37c22be1c";
const brandId = "44b79ffc-e6af-440c-ae38-8cd37c22be1c";

function productSummary(overrides: Partial<ProductSummary> = {}): ProductSummary {
  return {
    id: productId,
    type: "GENERIC",
    nameEn: "Apple",
    nameUa: "Яблуко",
    gtin: null,
    categoryId,
    categoryName: "Фрукти",
    brandId: null,
    brandName: null,
    sourceProvider: null,
    sourceDataset: null,
    foodState: "RAW",
    foodCharacteristics: [
      {
        id: "64b79ffc-e6af-440c-ae38-8cd37c22be1c",
        code: "fresh",
        kind: "PRESERVATION_STATE",
        nameUa: "Свіжий",
        nameEn: "Fresh",
        source: "MANUAL",
        confidence: "HIGH",
      },
    ],
    status: "ACTIVE",
    verificationStatus: "UNVERIFIED",
    verifiedByUserId: null,
    verifiedAt: null,
    verificationReadiness: {
      status: "READY",
      blockingIssues: [],
      warnings: [],
    },
    updatedAt: "2026-08-05T00:00:00.000Z",
    primaryMedia: null,
    ...overrides,
  };
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(mocks.searchParams),
}));

vi.mock("@/shared/api/browser-api-client", () => ({
  getBrowserApiClient: () => ({ get: mocks.get }),
}));

describe("ProductList", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.replace.mockReset();
    mocks.searchParams = "";
  });

  it("renders server-paginated product data with filters and accessible markup", async () => {
    mockApi({
      data: {
        items: [
          productSummary(),
          productSummary({
            id: "44b79ffc-e6af-440c-ae38-8cd37c22be1c",
            nameEn: "Pear",
            nameUa: "Груша",
            verificationStatus: "VERIFIED",
          }),
          productSummary({
            id: "54b79ffc-e6af-440c-ae38-8cd37c22be1c",
            nameEn: "Peach",
            nameUa: "Персик",
            verificationStatus: "REJECTED",
            verificationReadiness: {
              status: "BLOCKED",
              blockingIssues: ["MISSING_ENERGY"],
              warnings: ["MISSING_DEFAULT_PORTION"],
            },
          }),
        ],
      },
      meta: { page: 1, pageSize: 20, total: 3 },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <ProductList />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("link", { name: "Яблуко" })).toHaveAttribute(
      "href",
      "/products/24b79ffc-e6af-440c-ae38-8cd37c22be1c",
    );
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getAllByText("Сирий, Свіжий")).toHaveLength(3);
    const table = screen.getByRole("table");
    expect(table).toHaveAccessibleName("Знайдено продуктів: 3");
    expect(within(table).getByText("Не перевірено")).toHaveClass(
      "product-verification--unverified",
    );
    expect(within(table).getByText("Перевірено")).toHaveClass("product-verification--verified");
    expect(within(table).getByText("Відхилено")).toHaveClass("product-verification--rejected");
    expect(within(table).getAllByText("Готовий до перевірки")).toHaveLength(2);
    expect(within(table).getByText("Потрібно доповнити: 1")).toHaveClass(
      "product-readiness--blocked",
    );
    expect(await screen.findByRole("option", { name: "Фрукти" })).toBeInTheDocument();
    expect(await screen.findByRole("option", { name: "MealMind Foods" })).toBeInTheDocument();
    await waitFor(() =>
      expect(mocks.get).toHaveBeenCalledWith(
        "/api/v1/admin/products?includeArchived=true&page=1&pageSize=20",
      ),
    );
    await validateRenderedUi(container);
  });

  it("filters products by category and brand and keeps the selection in the URL", async () => {
    mockApi({
      data: { items: [] },
      meta: { page: 1, pageSize: 20, total: 0 },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ProductList />
      </QueryClientProvider>,
    );

    const category = await screen.findByRole("combobox", { name: "Категорія" });
    const brand = await screen.findByRole("combobox", { name: "Бренд" });
    await waitFor(() => expect(category).toBeEnabled());
    await waitFor(() => expect(brand).toBeEnabled());
    fireEvent.change(category, { target: { value: categoryId } });
    fireEvent.change(brand, { target: { value: brandId } });
    fireEvent.click(screen.getByRole("button", { name: "Застосувати" }));

    expect(mocks.replace).toHaveBeenCalledWith(
      `/products?categoryId=${categoryId}&brandId=${brandId}`,
    );
    await waitFor(() =>
      expect(mocks.get).toHaveBeenCalledWith(
        `/api/v1/admin/products?categoryId=${categoryId}&brandId=${brandId}&includeArchived=true&page=1&pageSize=20`,
      ),
    );
  });

  it("applies analytics drill-down filters from the URL", async () => {
    mocks.searchParams = "verificationStatus=UNVERIFIED&sourceProvider=USDA&includeArchived=false";
    mockApi({
      data: { items: [] },
      meta: { page: 1, pageSize: 20, total: 0 },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ProductList />
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(mocks.get).toHaveBeenCalledWith(
        "/api/v1/admin/products?verificationStatus=UNVERIFIED&sourceProvider=USDA&includeArchived=false&page=1&pageSize=20",
      ),
    );
  });
});

function mockApi(productResponse: unknown): void {
  mocks.get.mockImplementation((path: string) => {
    if (path.startsWith("/api/v1/admin/reference/product-categories")) {
      return Promise.resolve({
        data: { items: [{ id: categoryId, nameUa: "Фрукти", children: [] }] },
        meta: { page: 1, pageSize: 100, total: 1 },
      });
    }
    if (path.startsWith("/api/v1/admin/reference/brands")) {
      return Promise.resolve({
        data: { items: [{ id: brandId, name: "MealMind Foods", status: "ACTIVE" }] },
        meta: { page: 1, pageSize: 100, total: 1 },
      });
    }
    return Promise.resolve(productResponse);
  });
}
