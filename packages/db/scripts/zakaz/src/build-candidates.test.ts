import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import type { AggregatedZakazProduct } from "./aggregate-products.js";
import type {
  ClassifiedProductsDocument,
  ClassifiedZakazProduct,
  ProductSourceClassification,
} from "./classify-products.js";
import { buildCandidateArtifacts, parseBuildCandidatesArguments } from "./build-candidates.js";
import type {
  LocaleMatchStatus,
  MatchedLocaleProduct,
  MatchedLocalesDocument,
} from "./match-locales.js";

test("separates automatic candidates, review records, and rejected records", () => {
  const eligible = classifiedProduct("eligible", "ELIGIBLE");
  const review = classifiedProduct("review", "REVIEW_REQUIRED", ["PACKAGE_MEASURE_MISSING"]);
  const rejected = classifiedProduct("rejected", "REJECTED", ["PACKAGE_VARIABLE_WEIGHT"]);
  const classified = classifiedDocument([eligible, review, rejected]);
  const matched = matchedDocument([
    matchedProduct(eligible, localizedProduct("eligible"), "MATCHED"),
    matchedProduct(review, localizedProduct("review"), "MATCHED"),
    matchedProduct(rejected, localizedProduct("rejected"), "MATCHED"),
    localizedOnlyProduct("uk-only"),
  ]);

  const result = buildCandidateArtifacts(classified, matched, "2026-10-06T12:00:00.000Z");

  assert.equal(result.candidates.count, 1);
  assert.equal(result.candidates.products[0]?.identity.sourceSku, "eligible");
  assert.equal(result.reviewRequired.count, 2);
  assert.deepEqual(
    result.reviewRequired.products.map((product) => product.reasonCodes),
    [["PACKAGE_MEASURE_MISSING"], ["SOURCE_CLASSIFICATION_MISSING"]],
  );
  assert.equal(result.rejected.count, 1);
  assert.deepEqual(result.rejected.products[0]?.reasonCodes, ["PACKAGE_VARIABLE_WEIGHT"]);
  assert.equal(result.validation.valid, true);
  assert.equal(result.validation.checks.totalOutputProducts, 4);
});

test("requires review for source-only and identity-conflict matches", () => {
  const sourceOnly = classifiedProduct("source-only", "ELIGIBLE");
  const conflict = classifiedProduct("conflict", "ELIGIBLE");
  const result = buildCandidateArtifacts(
    classifiedDocument([sourceOnly, conflict]),
    matchedDocument([
      matchedProduct(sourceOnly, null, "SOURCE_ONLY"),
      matchedProduct(conflict, localizedProduct("conflict"), "MATCH_REVIEW_REQUIRED"),
    ]),
  );

  assert.equal(result.candidates.count, 0);
  assert.deepEqual(
    result.reviewRequired.products.map((product) => product.reasonCodes),
    [["MATCH_IDENTITY_CONFLICT"], ["LOCALIZATION_MISSING"]],
  );
});

test("selects Ukrainian fields, falls back explicitly, and prefers the largest image", () => {
  const source = classifiedProduct("sku-1", "ELIGIBLE", [], {
    description: "English description",
    ingredients: ["English ingredient"],
    img: { s350x350: "https://img1.zakaz.ua/source-s350x350.jpg" },
    producer: { trademark: "Source Brand", name: "Source Producer" },
  });
  const localized = localizedProduct("sku-1", {
    title: "Українська назва",
    description: null,
    ingredients: ["Український склад"],
    img: {
      s350x350: "https://img2.zakaz.ua/local-s350x350.jpg",
      s1350x1350: "https://img2.zakaz.ua/local-s1350x1350.jpg",
    },
    producer: { trademark: "Локальний бренд", name: null },
  });

  const result = buildCandidateArtifacts(
    classifiedDocument([source]),
    matchedDocument([matchedProduct(source, localized, "MATCHED")]),
  );
  const candidate = result.candidates.products[0];

  assert.equal(candidate?.draft.title, "Українська назва");
  assert.equal(candidate?.draft.description, "English description");
  assert.equal(candidate?.fieldProvenance.description.fallback, true);
  assert.equal(candidate?.fieldProvenance.description.locale, "en");
  assert.deepEqual(candidate?.draft.ingredients, ["Український склад"]);
  assert.equal(candidate?.draft.brandName, "Локальний бренд");
  assert.equal(candidate?.draft.rawProducerName, "Source Producer");
  assert.equal(candidate?.draft.sourceImageUrl, "https://img2.zakaz.ua/local-s1350x1350.jpg");
});

test("moves duplicate normalized GTIN candidates to review", () => {
  const first = classifiedProduct("sku-1", "ELIGIBLE");
  const second = classifiedProduct("sku-2", "ELIGIBLE");
  const result = buildCandidateArtifacts(
    classifiedDocument([first, second]),
    matchedDocument([
      matchedProduct(first, localizedProduct("sku-1"), "MATCHED"),
      matchedProduct(second, localizedProduct("sku-2"), "MATCHED"),
    ]),
  );

  assert.equal(result.candidates.count, 0);
  assert.equal(result.reviewRequired.count, 2);
  assert.equal(
    result.reviewRequired.products.every((product) =>
      product.reasonCodes.includes("DUPLICATE_NORMALIZED_GTIN"),
    ),
    true,
  );
  assert.equal(result.validation.checks.duplicateCandidateGtins, 0);
});

test("rejects classification and matching built from different source snapshots", () => {
  const classified = classifiedProduct("sku-1", "ELIGIBLE");
  const changedSource = {
    ...classified,
    productData: { ...classified.productData, weight: 900 },
  };
  assert.throws(
    () =>
      buildCandidateArtifacts(
        classifiedDocument([classified]),
        matchedDocument([matchedProduct(changedSource, localizedProduct("sku-1"), "MATCHED")]),
      ),
    /різні source snapshots/u,
  );
});

test("builds default candidate artifact paths", () => {
  const options = parseBuildCandidatesArguments([]);
  assert.equal(
    options.classifiedInputFile,
    path.resolve("scripts/zakaz/data/work/products-en-classified.json"),
  );
  assert.equal(
    options.matchedInputFile,
    path.resolve("scripts/zakaz/data/work/products-en-uk-matched.json"),
  );
  assert.equal(options.outputDirectory, path.resolve("scripts/zakaz/data/output"));
});

function classifiedDocument(
  products: readonly ClassifiedZakazProduct[],
): ClassifiedProductsDocument {
  return {
    schema: "mealmind.zakaz.classified-products/v1",
    generatedAt: "2026-10-06T00:00:00.000Z",
    sourceSchema: "mealmind.zakaz.aggregated-products/v1",
    provider: "ZAKAZ",
    locale: "en",
    policy: {
      availabilityAffectsEligibility: false,
      variableWeightEligible: false,
      standardGtinRequired: true,
      usableBrandRequired: true,
    },
    statistics: {
      inputProducts: products.length,
      eligibleProducts: products.filter((product) => product.classification.decision === "ELIGIBLE")
        .length,
      reviewRequiredProducts: products.filter(
        (product) => product.classification.decision === "REVIEW_REQUIRED",
      ).length,
      rejectedProducts: products.filter((product) => product.classification.decision === "REJECTED")
        .length,
      eligibleInStock: 0,
      eligibleOutOfStock: 0,
      eligibleAvailabilityUnknown: 0,
      reasonCounts: emptyReasonCounts(),
      packageCounts: {
        FIXED_MASS: products.length,
        FIXED_VOLUME: 0,
        FIXED_MASS_AND_VOLUME: 0,
        FIXED_COUNT: 0,
        VARIABLE_MASS: 0,
        UNKNOWN: 0,
      },
      gtinStatusCounts: {
        VALID: products.length,
        MISSING: 0,
        NON_NUMERIC: 0,
        UNSUPPORTED_LENGTH: 0,
        INVALID_CHECK_DIGIT: 0,
      },
    },
    products,
  };
}

function classifiedProduct(
  sourceSku: string,
  decision: ProductSourceClassification["decision"],
  reasonCodes: ProductSourceClassification["reasonCodes"] = [],
  overrides: Record<string, unknown> = {},
): ClassifiedZakazProduct {
  return {
    ...baseProduct(sourceSku, { title: `Source ${sourceSku}`, ...overrides }),
    classification: {
      decision,
      reasonCodes,
      brand: { rawTrademark: "Source Brand", usable: true },
      gtin: {
        raw: "4006381333931",
        normalized: "04006381333931",
        format: "GTIN_13",
        status: "VALID",
      },
      package: {
        kind: "FIXED_MASS",
        sourceUnit: "pcs",
        weightG: 500,
        volumeMl: null,
        itemCount: null,
        quantity: null,
      },
      availabilitySnapshot: {
        inStock: true,
        availableForCart: true,
        verboseStock: null,
        sourceObservation: baseObservation(sourceSku, "en"),
        hasConflictingObservations: false,
      },
    },
  };
}

function localizedProduct(
  sourceSku: string,
  overrides: Record<string, unknown> = {},
): AggregatedZakazProduct {
  return baseProduct(
    sourceSku,
    {
      title: `Локалізований ${sourceSku}`,
      producer: { trademark: "Localized Brand", name: "Localized Producer" },
      ...overrides,
    },
    "uk",
  );
}

function baseProduct(
  sourceSku: string,
  overrides: Record<string, unknown> = {},
  locale = "en",
): AggregatedZakazProduct {
  const observation = baseObservation(sourceSku, locale);
  return {
    sourceStoreId: "store-1",
    sourceSku,
    sourceCategoryIds: ["category-1"],
    observationCount: 1,
    selectedObservation: observation,
    observations: [observation],
    conflictingFields: [],
    productData: {
      ean: "4006381333931",
      unit: "pcs",
      weight: 500,
      in_stock: true,
      available_for_cart: true,
      producer: { trademark: "Source Brand", name: "Source Producer" },
      ...overrides,
    },
  };
}

function baseObservation(sourceSku: string, locale: string) {
  return {
    sourceCategoryId: "category-1",
    pageNumber: 1,
    sourceFile: `${locale}/stores/store-1/products/category-1/${sourceSku}.json`,
  };
}

function matchedDocument(products: readonly MatchedLocaleProduct[]): MatchedLocalesDocument {
  const sourceProducts = products.filter((product) => product.source).length;
  const localizedProducts = products.filter((product) => product.localized).length;
  return {
    schema: "mealmind.zakaz.matched-locales/v1",
    generatedAt: "2026-10-06T00:00:00.000Z",
    sourceSchema: "mealmind.zakaz.aggregated-products/v1",
    provider: "ZAKAZ",
    sourceLocale: "en",
    localizedLocale: "uk",
    matchingKey: ["sourceStoreId", "sourceSku"],
    statistics: {
      sourceProducts,
      localizedProducts,
      matchedProducts: products.filter((product) => product.matchStatus === "MATCHED").length,
      reviewRequiredMatches: products.filter(
        (product) => product.matchStatus === "MATCH_REVIEW_REQUIRED",
      ).length,
      sourceOnlyProducts: products.filter((product) => product.matchStatus === "SOURCE_ONLY")
        .length,
      localizedOnlyProducts: products.filter((product) => product.matchStatus === "LOCALIZED_ONLY")
        .length,
      sourceMatchRatePercent: 100,
      identityConflictCounts: { ean: 0, unit: 0, weight: 0, volume: 0, pack_amount: 0 },
      localizedCoverage: {
        title: localizedProducts,
        description: 0,
        ingredients: 0,
        nutritionFacts: 0,
        shelfLife: 0,
        temperatureRange: 0,
        webUrl: 0,
      },
    },
    products,
  };
}

function matchedProduct(
  source: AggregatedZakazProduct,
  localized: AggregatedZakazProduct | null,
  matchStatus: LocaleMatchStatus,
): MatchedLocaleProduct {
  const sourceSnapshot = { ...source } as AggregatedZakazProduct & {
    classification?: ProductSourceClassification;
  };
  delete sourceSnapshot.classification;
  return {
    identity: {
      provider: "ZAKAZ",
      storeId: sourceSnapshot.sourceStoreId,
      sourceSku: sourceSnapshot.sourceSku,
    },
    matchStatus,
    identityConflicts:
      matchStatus === "MATCH_REVIEW_REQUIRED"
        ? [{ field: "ean", sourceValue: "1", localizedValue: "2" }]
        : [],
    source: sourceSnapshot,
    localized,
    sourceFingerprint: `source-${sourceSnapshot.sourceSku}`,
    localizedFingerprint: localized ? `localized-${sourceSnapshot.sourceSku}` : null,
  };
}

function localizedOnlyProduct(sourceSku: string): MatchedLocaleProduct {
  const localized = localizedProduct(sourceSku);
  return {
    identity: { provider: "ZAKAZ", storeId: localized.sourceStoreId, sourceSku },
    matchStatus: "LOCALIZED_ONLY",
    identityConflicts: [],
    source: null,
    localized,
    sourceFingerprint: null,
    localizedFingerprint: `localized-${sourceSku}`,
  };
}

function emptyReasonCounts() {
  return {
    BRAND_MISSING: 0,
    BRAND_SENTINEL_WITHOUT_BRAND: 0,
    GTIN_MISSING: 0,
    GTIN_NON_NUMERIC: 0,
    GTIN_UNSUPPORTED_LENGTH: 0,
    GTIN_INVALID_CHECK_DIGIT: 0,
    PACKAGE_VARIABLE_WEIGHT: 0,
    PACKAGE_MEASURE_MISSING: 0,
    PACKAGE_UNIT_UNSUPPORTED: 0,
  };
}
