import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { validateRenderedUi } from "@/test/ui-quality";

import { ProductsAnalyticsPage } from "./products-analytics-page";

const mocks = vi.hoisted(() => ({ get: vi.fn(), replace: vi.fn() }));

vi.mock("@/shared/api/browser-api-client", () => ({
  getBrowserApiClient: () => ({ get: mocks.get }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/analytics/products",
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams("from=2026-09-01&to=2026-09-30&granularity=day"),
}));

vi.mock("../components/products-time-series-chart", () => ({
  ProductsTimeSeriesChart: () => <div data-testid="products-chart" />,
}));

describe("ProductsAnalyticsPage", () => {
  it("renders transparent metrics and deterministic drill-down links", async () => {
    mocks.get.mockResolvedValue({
      data: {
        meta: {
          from: "2026-09-01",
          to: "2026-09-30",
          granularity: "day",
          timezone: "Europe/Kyiv",
          generatedAt: "2026-09-24T10:00:00.000Z",
        },
        totals: { all: 12, createdLast24Hours: 2, awaitingVerification: 3, drafts: 4 },
        created: { value: 5, previousValue: 2, delta: 3, deltaPercent: 150 },
        breakdowns: {
          types: { GENERIC: 7, BRANDED: 5 },
          foodStates: { UNSPECIFIED: 1, RAW: 4, COOKED: 2, PROCESSED: 3, READY_TO_EAT: 2 },
          statuses: { DRAFT: 4, ACTIVE: 7, ARCHIVED: 1 },
          verification: { UNVERIFIED: 3, VERIFIED: 8, REJECTED: 1 },
          sources: { USDA: 6, MEALMIND_ADMIN: 3, MEALMIND_USER: 2, UNASSIGNED: 1 },
        },
        rankings: {
          categories: [{ id: "category-id", label: "Овочі", value: 5 }],
          brands: [{ id: "brand-id", label: "MealMind", value: 3 }],
          favorites: [{ id: "product-id", label: "Яблуко", value: 2 }],
        },
        series: [{ period: "2026-09-01", value: 5 }],
      },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <ProductsAnalyticsPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Усі продукти")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Один продукт враховується один раз за primary source; відсутній primary source показано окремо.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Очікують верифікації").closest("a")).toHaveAttribute(
      "href",
      "/products?includeArchived=false&verificationStatus=UNVERIFIED",
    );
    expect(screen.getByRole("link", { name: "Овочі" })).toHaveAttribute(
      "href",
      "/products?categoryId=category-id",
    );
    expect(screen.getByTestId("products-chart")).toBeInTheDocument();
    await validateRenderedUi(container);
  });
});
