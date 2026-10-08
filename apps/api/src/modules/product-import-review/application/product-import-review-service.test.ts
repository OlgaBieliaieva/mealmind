import { describe, expect, it, vi } from "vitest";

import type {
  JsonObject,
  ProductImportCandidateDetails,
  ProductImportReviewRepository,
} from "../domain/product-import-review-repository.js";
import {
  ProductImportReviewConflictError,
  ProductImportReviewInvariantError,
} from "./product-import-review-errors.js";
import { createProductImportReviewService } from "./product-import-review-service.js";

const actorId = "24b79ffc-e6af-440c-ae38-8cd37c22be1c";
const revision = "2026-10-07T09:00:00.000Z";

describe("product import review service", () => {
  it("starts review and records the administrator as its owner", async () => {
    const candidate = candidateFixture();
    const repository = repositoryFixture(candidate);
    const service = createProductImportReviewService(repository);

    await service.start(candidate.id, { expectedUpdatedAt: revision }, actorId);

    expect(repository.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: actorId,
        fromStatus: "PENDING",
        toStatus: "IN_REVIEW",
        action: "REVIEW_STARTED",
      }),
    );
  });

  it("merges a reviewed field without discarding source-backed draft fields", async () => {
    const candidate = candidateFixture({
      status: "IN_REVIEW",
      reviewedByUserId: actorId,
      reviewDraft: { title: "Source title", brandName: "Brand", description: null },
    });
    const repository = repositoryFixture(candidate);
    const service = createProductImportReviewService(repository);

    await service.updateDraft(
      candidate.id,
      { expectedUpdatedAt: revision, patch: { title: "Перевірена назва" } },
      actorId,
    );

    expect(repository.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UPDATED",
        reviewDraft: {
          title: "Перевірена назва",
          brandName: "Brand",
          description: null,
        },
      }),
    );
  });

  it("does not allow another administrator to overwrite an active review", async () => {
    const candidate = candidateFixture({ status: "IN_REVIEW", reviewedByUserId: actorId });
    const service = createProductImportReviewService(repositoryFixture(candidate));

    await expect(
      service.updateDraft(
        candidate.id,
        { expectedUpdatedAt: revision, patch: { title: "Зміна" } },
        "11111111-1111-4111-8111-111111111111",
      ),
    ).rejects.toBeInstanceOf(ProductImportReviewConflictError);
  });

  it("requires an audit comment when a candidate is rejected", async () => {
    const candidate = candidateFixture({ status: "IN_REVIEW", reviewedByUserId: actorId });
    const service = createProductImportReviewService(repositoryFixture(candidate));

    await expect(
      service.decide(candidate.id, { expectedUpdatedAt: revision, decision: "REJECT" }, actorId),
    ).rejects.toBeInstanceOf(ProductImportReviewInvariantError);
  });

  it("prevents reopening a published candidate", async () => {
    const candidate = candidateFixture({ status: "PUBLISHED", reviewedByUserId: actorId });
    const service = createProductImportReviewService(repositoryFixture(candidate));

    await expect(
      service.reopen(candidate.id, { expectedUpdatedAt: revision }, actorId),
    ).rejects.toBeInstanceOf(ProductImportReviewConflictError);
  });
});

function repositoryFixture(
  candidate: ProductImportCandidateDetails,
): ProductImportReviewRepository {
  return {
    list: vi.fn(async () => ({ items: [], page: 1, pageSize: 25, total: 0 })),
    findById: vi.fn(async () => candidate),
    findCatalogMatches: vi.fn(async () => []),
    mutate: vi.fn(async (input) => ({
      ...candidate,
      status: input.toStatus,
      reviewedByUserId: input.actorUserId,
      reviewDraft: input.reviewDraft ?? candidate.reviewDraft,
      updatedAt: "2026-10-07T09:01:00.000Z",
    })),
  };
}

function candidateFixture(
  overrides: Partial<ProductImportCandidateDetails> = {},
): ProductImportCandidateDetails {
  const emptyDraft: JsonObject = { title: "Milk", brandName: "Brand", sourceImageUrl: null };
  return {
    id: "33333333-3333-4333-8333-333333333333",
    batchId: "44444444-4444-4444-8444-444444444444",
    storeExternalId: "48215625",
    sourceSku: "210931",
    disposition: "CANDIDATE",
    status: "PENDING",
    reasonCodes: [],
    matchStatus: "MATCHED",
    normalizedGtin: "04820086633727",
    title: "Milk",
    brandName: "Brand",
    sourceImageUrl: null,
    reviewedByUserId: null,
    reviewedByEmail: null,
    reviewedAt: null,
    createdAt: revision,
    updatedAt: revision,
    classificationDecision: "ELIGIBLE",
    sourceCategoryIds: { source: ["milk-metro"], localized: ["milk-metro"] },
    sourceDraft: emptyDraft,
    reviewDraft: emptyDraft,
    fieldProvenance: {},
    sourceSnapshots: {},
    batch: {
      provider: "ZAKAZ",
      dataset: "ZAKAZ_RETAIL_CATALOG",
      generatedAt: revision,
      sourceLocale: "en",
      localizedLocale: "uk",
    },
    events: [],
    publishedProductId: null,
    publishedPackageId: null,
    ...overrides,
  };
}
