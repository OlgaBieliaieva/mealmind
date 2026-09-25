import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { validateRenderedUi } from "@/test/ui-quality";

import { OverviewAnalyticsPage } from "./overview-analytics-page";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/shared/api/browser-api-client", () => ({
  getBrowserApiClient: () => ({ get: mocks.get }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/analytics",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("from=2026-09-01&to=2026-09-30"),
}));

describe("OverviewAnalyticsPage", () => {
  it("renders current totals, period activity and deterministic drill-downs", async () => {
    mocks.get.mockResolvedValue({
      data: {
        meta: {
          from: "2026-09-01",
          to: "2026-09-30",
          granularity: "day",
          timezone: "Europe/Kyiv",
          generatedAt: "2026-09-24T10:00:00.000Z",
        },
        users: { active: 10, created: 2 },
        families: { active: 4, created: 1 },
        products: { total: 120, awaitingVerification: 7 },
        recipes: { total: 35, drafts: 3 },
        activity: {
          scheduledMealPlans: 5,
          completedCookingSessions: 8,
          confirmedConsumptionEntries: 42,
        },
      },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <OverviewAnalyticsPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Завершені приготування")).toBeInTheDocument();
    expect(screen.getByText("Очікують перевірки").closest("a")).toHaveAttribute(
      "href",
      "/products?includeArchived=false&verificationStatus=UNVERIFIED",
    );
    expect(screen.getByText("Чернетки рецептів").closest("a")).toHaveAttribute(
      "href",
      "/recipes?includeArchived=false&status=DRAFT",
    );
    expect(screen.getByText("42")).toBeInTheDocument();
    await validateRenderedUi(container);
  });
});
