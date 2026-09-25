import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { validateRenderedUi } from "@/test/ui-quality";

import { ProductList } from "./product-list";

const mocks = vi.hoisted(() => ({ get: vi.fn(), searchParams: "" }));

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
          {
            id: "24b79ffc-e6af-440c-ae38-8cd37c22be1c",
            type: "GENERIC",
            nameEn: "Apple",
            nameUa: "Яблуко",
            gtin: null,
            categoryId: "34b79ffc-e6af-440c-ae38-8cd37c22be1c",
            categoryName: "Фрукти",
            brandId: null,
            brandName: null,
            status: "ACTIVE",
            updatedAt: "2026-08-05T00:00:00.000Z",
            primaryMedia: null,
          },
        ],
      },
      meta: { page: 1, pageSize: 20, total: 1 },
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
    expect(screen.getByRole("table")).toHaveAccessibleName("Знайдено продуктів: 1");
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
