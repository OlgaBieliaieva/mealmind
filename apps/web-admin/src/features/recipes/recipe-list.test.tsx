import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
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
  it("shows the primary recipe thumbnail next to its title", async () => {
    mocks.searchParams = "";
    mocks.get.mockResolvedValue({
      data: {
        items: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            title: "Борщ",
            status: "PUBLISHED",
            visibility: "PUBLIC",
            difficulty: "MEDIUM",
            recipeTypeName: "Перша страва",
            authorName: null,
            baseServings: 4,
            updatedAt: "2026-10-02T00:00:00.000Z",
            primaryImage: { thumbnailUrl: "https://storage.example/borscht.thumbnail.webp" },
          },
        ],
      },
      meta: { page: 1, pageSize: 20, total: 1 },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <RecipeList />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("link", { name: "Борщ" })).toBeVisible();
    expect(container.querySelector(".recipe-table__identity img")).toHaveAttribute(
      "src",
      "https://storage.example/borscht.thumbnail.webp",
    );
  });

  it("applies analytics drill-down filters from the URL", async () => {
    mocks.searchParams =
      "difficulty=EASY&authorType=EXPERT&creatorOrigin=USER&includeArchived=false";
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
