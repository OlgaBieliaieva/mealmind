import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { validateRenderedUi } from "@/test/ui-quality";
import type { ProductSummary } from "@/shared/api/products";

import { ProductList } from "./product-list";

const mocks = vi.hoisted(() => ({ get: vi.fn(), searchParams: "" }));
const productId = "24b79ffc-e6af-440c-ae38-8cd37c22be1c";

function productSummary(overrides: Partial<ProductSummary> = {}): ProductSummary {
  return {
    id: productId,
    type: "GENERIC",
    nameEn: "Apple",
    nameUa: "Яблуко",
    gtin: null,
    categoryId: "34b79ffc-e6af-440c-ae38-8cd37c22be1c",
    categoryName: "Фрукти",
    brandId: null,
    brandName: null,
    sourceProvider: null,
    sourceDataset: null,
    status: "ACTIVE",
    verificationStatus: "UNVERIFIED",
    updatedAt: "2026-08-05T00:00:00.000Z",
    primaryMedia: null,
    ...overrides,
  };
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(mocks.searchParams),
}));

vi.mock("@/shared/api/browser-api-client", () => ({
  getBrowserApiClient: () => ({ get: mocks.get }),
}));

describe("ProductList", () => {
  it("renders server-paginated product data with filters and accessible markup", async () => {
    mocks.searchParams = "";
    mocks.get.mockResolvedValue({
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
    const table = screen.getByRole("table");
    expect(table).toHaveAccessibleName("Знайдено продуктів: 3");
    expect(within(table).getByText("Не перевірено")).toHaveClass(
      "product-verification--unverified",
    );
    expect(within(table).getByText("Перевірено")).toHaveClass("product-verification--verified");
    expect(within(table).getByText("Відхилено")).toHaveClass("product-verification--rejected");
    await waitFor(() => expect(mocks.get).toHaveBeenCalledOnce());
    await validateRenderedUi(container);
  });

  it("applies analytics drill-down filters from the URL", async () => {
    mocks.searchParams = "verificationStatus=UNVERIFIED&sourceProvider=USDA&includeArchived=false";
    mocks.get.mockResolvedValue({
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
