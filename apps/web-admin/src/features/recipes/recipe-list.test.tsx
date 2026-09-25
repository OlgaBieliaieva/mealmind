import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RecipeList } from "./recipe-list";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  searchParams: "difficulty=EASY&authorType=EXPERT&creatorOrigin=USER&includeArchived=false",
}));

vi.mock("@/shared/api/browser-api-client", () => ({
  getBrowserApiClient: () => ({ get: mocks.get }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(mocks.searchParams),
}));

describe("RecipeList", () => {
  it("applies analytics drill-down filters from the URL", async () => {
    mocks.get.mockResolvedValue({
      data: { items: [] },
      meta: { page: 1, pageSize: 20, total: 0 },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <RecipeList />
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(mocks.get).toHaveBeenCalledWith(
        "/api/v1/admin/recipes?difficulty=EASY&authorType=EXPERT&creatorOrigin=USER&includeArchived=false&page=1&pageSize=20",
      ),
    );
  });
});
