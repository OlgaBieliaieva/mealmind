import { describe, expect, it } from "vitest";

import type { ProductImportCandidateDetails } from "../domain/product-import-review-repository.js";
import { ProductImportReviewInvariantError } from "./product-import-review-errors.js";
import { parseProductImportPublicationDraft } from "./product-import-publication-draft.js";

describe("product import publication draft", () => {
  it("normalizes canonical values and parses source-backed package metadata", () => {
    const publication = parseProductImportPublicationDraft(candidateFixture());

    expect(publication).toMatchObject({
      mode: "CREATE_NEW_PRODUCT",
      nameUa: "Молоко",
      nameEn: "Milk",
      gtin: "04820086633727",
      package: { kind: "FIXED_MASS", weightG: 950 },
      shelfLife: { raw: "180 діб", durationValue: 180, durationUnit: "DAYS" },
      temperatureRange: { raw: "1...25", minC: 1, maxC: 25 },
    });
    expect(publication.nutrients).toEqual([
      { code: "energy_kcal", valuePer100g: 53 },
      { code: "protein", valuePer100g: 2.8 },
      { code: "total_fat", valuePer100g: 2.5 },
      { code: "carbohydrate", valuePer100g: 4.7 },
    ]);
  });

  it("requires canonical references before creating a product", () => {
    const candidate = candidateFixture({
      reviewDraft: {
        ...candidateFixture().reviewDraft,
        canonical: { nameEn: "Milk" },
      },
    });

    expect(() => parseProductImportPublicationDraft(candidate)).toThrow(
      ProductImportReviewInvariantError,
    );
  });

  it("requires a target product when adding a package", () => {
    const candidate = candidateFixture({
      reviewDraft: {
        ...candidateFixture().reviewDraft,
        reviewResolution: {
          mode: "ADD_PACKAGE_TO_EXISTING_PRODUCT",
          targetProductId: null,
        },
      },
    });

    expect(() => parseProductImportPublicationDraft(candidate)).toThrow(
      "Оберіть продукт, до якого потрібно додати пакування",
    );
  });
});

function candidateFixture(
  overrides: Partial<ProductImportCandidateDetails> = {},
): ProductImportCandidateDetails {
  const revision = "2026-10-07T09:00:00.000Z";
  return {
    id: "33333333-3333-4333-8333-333333333333",
    batchId: "44444444-4444-4444-8444-444444444444",
    storeExternalId: "48215625",
    sourceSku: "210931",
    disposition: "CANDIDATE",
    status: "APPROVED",
    reasonCodes: [],
    matchStatus: "MATCHED",
    normalizedGtin: "04820086633727",
    title: "Молоко",
    brandName: "Rioba",
    packageKind: "FIXED_MASS",
    packageWeightG: 950,
    packageVolumeMl: null,
    packageItemCount: null,
    sourceImageUrl: null,
    reviewedByUserId: "24b79ffc-e6af-440c-ae38-8cd37c22be1c",
    reviewedByEmail: "admin@example.com",
    reviewedAt: revision,
    createdAt: revision,
    updatedAt: revision,
    classificationDecision: "ELIGIBLE",
    sourceFingerprint: "source-fingerprint",
    sourceCategoryIds: ["milk-metro"],
    sourceDraft: {},
    reviewDraft: {
      title: "Молоко",
      sourceTitle: "Milk",
      rawProducerName: "Producer",
      gtin: { normalized: "04820086633727" },
      package: { kind: "FIXED_MASS", weightG: 950 },
      ingredients: ["Milk"],
      nutritionFacts: {
        ingredient_energy: "53.00ккал",
        ingredient_protein: "2,8г",
        ingredient_fat: "2.5г",
        ingredient_carbohydrates: "4.7г",
      },
      shelfLife: "180 діб",
      temperatureRange: "1...25",
      reviewResolution: { mode: "CREATE_NEW_PRODUCT", targetProductId: null },
      canonical: {
        nameUa: "Молоко",
        nameEn: "Milk",
        categoryId: "11111111-1111-4111-8111-111111111111",
        brandId: "22222222-2222-4222-8222-222222222222",
        defaultMeasurementUnitId: "55555555-5555-4555-8555-555555555555",
      },
    },
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
