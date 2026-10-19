import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { validateRenderedUi } from "@/test/ui-quality";

import { ProductImportCandidateList } from "./product-import-candidate-list";

const mocks = vi.hoisted(() => ({ get: vi.fn(), searchParams: "" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(mocks.searchParams),
}));

vi.mock("@/shared/api/browser-api-client", () => ({
  getBrowserApiClient: () => ({ get: mocks.get }),
}));

describe("ProductImportCandidateList", () => {
  it("renders a paginated review queue with source identity and statuses", async () => {
    mocks.searchParams = "brandName=Мівіна&packageKind=FIXED_MASS";
    mocks.get.mockResolvedValue({
      data: {
        items: [
          {
            id: "33333333-3333-4333-8333-333333333333",
            batchId: "44444444-4444-4444-8444-444444444444",
            storeExternalId: "48215611",
            sourceSku: "230",
            disposition: "REVIEW_REQUIRED",
            status: "PENDING",
            reasonCodes: ["PACKAGE_MEASURE_MISSING"],
            matchStatus: "MATCHED",
            normalizedGtin: "07613287130266",
            title: "Вермішель",
            brandName: "Мівіна",
            packageKind: "FIXED_MASS",
            packageWeightG: 90,
            packageVolumeMl: null,
            packageItemCount: null,
            sourceImageUrl: null,
            reviewedByUserId: null,
            reviewedByEmail: null,
            reviewedAt: null,
            createdAt: "2026-10-08T08:00:00.000Z",
            updatedAt: "2026-10-08T08:00:00.000Z",
          },
        ],
      },
      meta: { page: 1, pageSize: 25, total: 1 },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <ProductImportCandidateList />
      </QueryClientProvider>,
    );

    const link = await screen.findByRole("link", { name: "Вермішель" });
    expect(link).toHaveAttribute("href", "/product-import/33333333-3333-4333-8333-333333333333");
    const table = screen.getByRole("table");
    expect(table).toHaveAccessibleName("Знайдено кандидатів: 1");
    expect(within(table).getByText("Потребує уваги")).toBeInTheDocument();
    expect(within(table).getByText("90 г")).toBeInTheDocument();
    expect(within(table).getByText("Не визначено обсяг пакування")).toBeInTheDocument();
    await waitFor(() =>
      expect(mocks.get).toHaveBeenCalledWith(
        "/api/v1/admin/product-import/candidates?brandName=%D0%9C%D1%96%D0%B2%D1%96%D0%BD%D0%B0&packageKind=FIXED_MASS&status=PENDING&page=1&pageSize=25",
      ),
    );
    await validateRenderedUi(container);
  });
});
