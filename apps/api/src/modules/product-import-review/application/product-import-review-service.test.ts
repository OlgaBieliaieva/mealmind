import { describe, expect, it, vi } from "vitest";

import type {
  JsonObject,
  ProductImportCandidateDetails,
  ProductImportReviewRepository,
} from "../domain/product-import-review-repository.js";
import type { ProductImportPublisher } from "../domain/product-import-publisher.js";
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
    const service = createProductImportReviewService(repository, publisherFixture());

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
    const service = createProductImportReviewService(repository, publisherFixture());

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
    const service = createProductImportReviewService(
      repositoryFixture(candidate),
      publisherFixture(),
    );

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
    const service = createProductImportReviewService(
      repositoryFixture(candidate),
      publisherFixture(),
    );

    await expect(
      service.decide(candidate.id, { expectedUpdatedAt: revision, decision: "REJECT" }, actorId),
    ).rejects.toBeInstanceOf(ProductImportReviewInvariantError);
  });

  it("does not approve an incomplete canonical publication draft", async () => {
    const candidate = candidateFixture({
      status: "IN_REVIEW",
      reviewedByUserId: actorId,
      reviewDraft: { title: "Milk", package: { kind: "FIXED_MASS", weightG: 950 } },
    });
    const service = createProductImportReviewService(
      repositoryFixture(candidate),
      publisherFixture(),
    );

    await expect(
      service.decide(candidate.id, { expectedUpdatedAt: revision, decision: "APPROVE" }, actorId),
    ).rejects.toBeInstanceOf(ProductImportReviewInvariantError);
  });

  it("validates and saves the current draft patch atomically with approval", async () => {
    const candidate = candidateFixture({
      status: "IN_REVIEW",
      reviewedByUserId: actorId,
      reviewDraft: {
        title: "Milk",
        sourceTitle: "Milk",
        package: { kind: "FIXED_MASS", weightG: 950 },
      },
    });
    const repository = repositoryFixture(candidate);
    const service = createProductImportReviewService(repository, publisherFixture());
    const patch = {
      reviewResolution: { mode: "CREATE_NEW_PRODUCT", targetProductId: null },
      canonical: {
        nameEn: "Milk",
        categoryId: "11111111-1111-4111-8111-111111111111",
        brandId: "22222222-2222-4222-8222-222222222222",
        defaultMeasurementUnitId: "55555555-5555-4555-8555-555555555555",
      },
    } as const;

    await service.decide(
      candidate.id,
      { expectedUpdatedAt: revision, decision: "APPROVE", patch },
      actorId,
    );

    expect(repository.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "APPROVED",
        reviewDraft: expect.objectContaining({ canonical: patch.canonical }),
        changeSet: { decision: "APPROVE", patch },
      }),
    );
  });

  it("prevents reopening a published candidate", async () => {
    const candidate = candidateFixture({ status: "PUBLISHED", reviewedByUserId: actorId });
    const service = createProductImportReviewService(
      repositoryFixture(candidate),
      publisherFixture(),
    );

    await expect(
      service.reopen(candidate.id, { expectedUpdatedAt: revision }, actorId),
    ).rejects.toBeInstanceOf(ProductImportReviewConflictError);
  });

  it("publishes only an approved candidate through the transactional publisher", async () => {
    const candidate = candidateFixture({
      status: "APPROVED",
      reviewDraft: {
        title: "Milk",
        sourceTitle: "Milk",
        package: { kind: "FIXED_MASS", weightG: 950 },
        reviewResolution: { mode: "CREATE_NEW_PRODUCT", targetProductId: null },
        canonical: {
          nameEn: "Milk",
          categoryId: "11111111-1111-4111-8111-111111111111",
          brandId: "22222222-2222-4222-8222-222222222222",
          defaultMeasurementUnitId: "55555555-5555-4555-8555-555555555555",
        },
      },
    });
    const repository = repositoryFixture(candidate);
    repository.findById = vi
      .fn()
      .mockResolvedValueOnce(candidate)
      .mockResolvedValueOnce({ ...candidate, status: "PUBLISHED" });
    const publisher = publisherFixture();
    const service = createProductImportReviewService(repository, publisher);

    await service.publish(candidate.id, { expectedUpdatedAt: revision }, actorId);

    expect(publisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        candidate,
        expectedUpdatedAt: revision,
        actorUserId: actorId,
        publication: expect.objectContaining({ mode: "CREATE_NEW_PRODUCT", nameEn: "Milk" }),
      }),
    );
  });
});

function publisherFixture(): ProductImportPublisher {
  return { publish: vi.fn(async () => true) };
}

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
    packageKind: null,
    packageWeightG: null,
    packageVolumeMl: null,
    packageItemCount: null,
    sourceImageUrl: null,
    reviewedByUserId: null,
    reviewedByEmail: null,
    reviewedAt: null,
    createdAt: revision,
    updatedAt: revision,
    classificationDecision: "ELIGIBLE",
    sourceFingerprint: null,
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
