import { describe, expect, it, vi } from "vitest";

import type { ApiClient } from "./api-client";
import {
  buildProductImportCandidateListPath,
  decideProductImportReview,
  updateProductImportReviewDraft,
} from "./product-import-review";

describe("product import review API contract", () => {
  it("builds stable queue filters and pagination", () => {
    expect(
      buildProductImportCandidateListPath({
        search: "молоко & кава",
        brandName: "Яготинське",
        packageKind: "FIXED_VOLUME",
        disposition: "REVIEW_REQUIRED",
        status: "PENDING",
        page: 2,
        pageSize: 25,
      }),
    ).toBe(
      "/api/v1/admin/product-import/candidates?search=%D0%BC%D0%BE%D0%BB%D0%BE%D0%BA%D0%BE+%26+%D0%BA%D0%B0%D0%B2%D0%B0&brandName=%D0%AF%D0%B3%D0%BE%D1%82%D0%B8%D0%BD%D1%81%D1%8C%D0%BA%D0%B5&packageKind=FIXED_VOLUME&disposition=REVIEW_REQUIRED&status=PENDING&page=2&pageSize=25",
    );
  });

  it("sends optimistic revision with a review draft patch", async () => {
    const patch = vi.fn(async () => ({ data: {} }));
    const apiClient = { patch } as unknown as ApiClient;

    await updateProductImportReviewDraft(apiClient, "candidate/id", "2026-10-08T09:00:00.000Z", {
      title: "Перевірена назва",
    });

    expect(patch).toHaveBeenCalledWith(
      "/api/v1/admin/product-import/candidates/candidate%2Fid/review",
      {
        expectedUpdatedAt: "2026-10-08T09:00:00.000Z",
        patch: { title: "Перевірена назва" },
      },
    );
  });

  it("keeps approval separate from publication", async () => {
    const post = vi.fn(async () => ({ data: {} }));
    const apiClient = { post } as unknown as ApiClient;

    await decideProductImportReview(
      apiClient,
      "candidate",
      "2026-10-08T09:00:00.000Z",
      "APPROVE",
      "Перевірено",
      { canonical: { categoryId: "11111111-1111-4111-8111-111111111111" } },
    );

    expect(post).toHaveBeenCalledWith(
      "/api/v1/admin/product-import/candidates/candidate/decision",
      {
        expectedUpdatedAt: "2026-10-08T09:00:00.000Z",
        decision: "APPROVE",
        comment: "Перевірено",
        patch: { canonical: { categoryId: "11111111-1111-4111-8111-111111111111" } },
      },
    );
  });
});
