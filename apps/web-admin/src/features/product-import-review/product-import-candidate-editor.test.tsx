import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { validateRenderedUi } from "@/test/ui-quality";

import { ProductImportCandidateEditor } from "./product-import-candidate-editor";

const mocks = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), post: vi.fn() }));

vi.mock("@/shared/api/browser-api-client", () => ({
  getBrowserApiClient: () => ({ get: mocks.get, patch: mocks.patch, post: mocks.post }),
}));

describe("ProductImportCandidateEditor", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.patch.mockReset();
    mocks.post.mockReset();
  });

  it("shows source data separately and saves an editable review draft", async () => {
    const response = candidateResponse();
    mocks.get.mockResolvedValue(response);
    mocks.patch.mockResolvedValue({
      ...response,
      data: {
        ...response.data,
        candidate: {
          ...response.data.candidate,
          updatedAt: "2026-10-08T09:01:00.000Z",
        },
      },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <ProductImportCandidateEditor candidateId="33333333-3333-4333-8333-333333333333" />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Вермішель Мівіна" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Дані джерела" })).toBeInTheDocument();
    const title = screen.getByRole("textbox", { name: "Назва" });
    fireEvent.change(title, { target: { value: "Перевірена назва" } });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти чернетку" }));

    await waitFor(() => expect(mocks.patch).toHaveBeenCalledOnce());
    expect(mocks.patch.mock.calls[0]?.[0]).toBe(
      "/api/v1/admin/product-import/candidates/33333333-3333-4333-8333-333333333333/review",
    );
    expect(mocks.patch.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        expectedUpdatedAt: "2026-10-08T09:00:00.000Z",
        patch: expect.objectContaining({ title: "Перевірена назва" }),
      }),
    );
    await validateRenderedUi(container);
  });

  it("asks for confirmation and publishes an approved candidate", async () => {
    const response = candidateResponse();
    const approved = {
      ...response,
      data: {
        ...response.data,
        candidate: { ...response.data.candidate, status: "APPROVED" as const },
      },
    };
    mocks.get.mockResolvedValue(approved);
    mocks.post.mockResolvedValue({
      ...approved,
      data: {
        ...approved.data,
        candidate: {
          ...approved.data.candidate,
          status: "PUBLISHED",
          publishedProductId: "66666666-6666-4666-8666-666666666666",
        },
      },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ProductImportCandidateEditor candidateId="33333333-3333-4333-8333-333333333333" />
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Опублікувати" }));
    const dialog = screen.getByRole("dialog", { name: "Опублікувати продукт" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Опублікувати" }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledOnce());
    expect(mocks.post).toHaveBeenCalledWith(
      "/api/v1/admin/product-import/candidates/33333333-3333-4333-8333-333333333333/publish",
      { expectedUpdatedAt: "2026-10-08T09:00:00.000Z" },
    );
  });
});

function candidateResponse() {
  const draft = {
    title: "Вермішель Мівіна",
    sourceTitle: "Mivina noodles",
    description: "Опис",
    brandName: "Мівіна",
    rawProducerName: null,
    gtin: { raw: "07613287130266", normalized: "07613287130266", status: "VALID" },
    package: {
      kind: "FIXED_MASS",
      weightG: 81.5,
      volumeMl: null,
      itemCount: null,
    },
    ingredients: ["Борошно, вода"],
    nutritionFacts: {
      ingredient_energy: "412 ккал",
      ingredient_protein: "8,3 г",
      ingredient_fat: "16 г",
      ingredient_carbohydrates: "57 г",
    },
    shelfLife: "365 діб",
    temperatureRange: "5...25",
    webUrl: "https://example.test/product",
    sourceImageUrl: null,
  };
  return {
    data: {
      candidate: {
        id: "33333333-3333-4333-8333-333333333333",
        batchId: "44444444-4444-4444-8444-444444444444",
        storeExternalId: "48215611",
        sourceSku: "230",
        disposition: "CANDIDATE",
        status: "IN_REVIEW",
        reasonCodes: [],
        matchStatus: "MATCHED",
        normalizedGtin: "07613287130266",
        title: "Вермішель Мівіна",
        brandName: "Мівіна",
        sourceImageUrl: null,
        reviewedByUserId: "24b79ffc-e6af-440c-ae38-8cd37c22be1c",
        reviewedByEmail: "admin@example.com",
        reviewedAt: null,
        createdAt: "2026-10-08T08:00:00.000Z",
        updatedAt: "2026-10-08T09:00:00.000Z",
        classificationDecision: "ELIGIBLE",
        sourceCategoryIds: { source: ["instant-food"] },
        sourceDraft: draft,
        reviewDraft: draft,
        fieldProvenance: {},
        sourceSnapshots: {},
        batch: {
          provider: "ZAKAZ",
          dataset: "ZAKAZ_RETAIL_CATALOG",
          generatedAt: "2026-10-06T10:44:20.654Z",
          sourceLocale: "en",
          localizedLocale: "uk",
        },
        events: [
          {
            id: "55555555-5555-4555-8555-555555555555",
            action: "REVIEW_STARTED",
            actorUserId: "24b79ffc-e6af-440c-ae38-8cd37c22be1c",
            actorEmail: "admin@example.com",
            fromStatus: "PENDING",
            toStatus: "IN_REVIEW",
            changeSet: null,
            comment: null,
            createdAt: "2026-10-08T09:00:00.000Z",
          },
        ],
        publishedProductId: null,
        publishedPackageId: null,
      },
      catalogMatches: [],
    },
  };
}
