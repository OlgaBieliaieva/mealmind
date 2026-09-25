import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { validateRenderedUi } from "@/test/ui-quality";

import { RecipesAnalyticsPage } from "./recipes-analytics-page";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/shared/api/browser-api-client", () => ({
  getBrowserApiClient: () => ({ get: mocks.get }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/analytics/recipes",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("from=2026-09-01&to=2026-09-30&granularity=day"),
}));
vi.mock("../components/products-time-series-chart", () => ({
  ProductsTimeSeriesChart: () => <div data-testid="recipes-chart" />,
}));

describe("RecipesAnalyticsPage", () => {
  it("renders separate author semantics and deterministic drill-downs", async () => {
    mocks.get.mockResolvedValue({
      data: {
        meta: {
          from: "2026-09-01",
          to: "2026-09-30",
          granularity: "day",
          timezone: "Europe/Kyiv",
          generatedAt: "2026-09-24T10:00:00.000Z",
        },
        totals: { all: 8, drafts: 2, familyOnly: 3 },
        created: { value: 4, previousValue: 2, delta: 2, deltaPercent: 100 },
        breakdowns: {
          statuses: { DRAFT: 2, READY: 1, PUBLISHED: 4, ARCHIVED: 1 },
          visibility: { FAMILY: 3, PUBLIC: 5 },
          difficulties: { EASY: 2, MEDIUM: 2, HARD: 1, UNASSIGNED: 3 },
          authorTypes: { MEALMIND: 2, EXPERT: 1, BLOGGER: 1, USER: 2, UNASSIGNED: 2 },
          creatorOrigins: { USER: 5, SYSTEM: 3 },
        },
        rankings: {
          recipeTypes: [{ id: "type-id", label: "Суп", value: 3 }],
          cuisines: [],
          dietaryTags: [],
          authors: [],
          favorites: [],
        },
        series: [{ period: "2026-09-01", value: 4 }],
      },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <RecipesAnalyticsPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Походження запису")).toBeInTheDocument();
    expect(screen.getAllByText("Чернетки")[0]?.closest("a")).toHaveAttribute(
      "href",
      "/recipes?includeArchived=false&status=DRAFT",
    );
    expect(screen.getByRole("link", { name: "Суп" })).toHaveAttribute(
      "href",
      "/recipes?recipeTypeId=type-id",
    );
    expect(screen.getByTestId("recipes-chart")).toBeInTheDocument();
    await validateRenderedUi(container);
  });
});
