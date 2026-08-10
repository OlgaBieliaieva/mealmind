import { CURATION_OVERRIDES } from "../config/curation-overrides.js";
import { USDA_FOOD_CATEGORY_BY_ID } from "../config/usda-food-categories.js";
import { evaluateAutomaticCuration } from "./evaluate-curation.js";
import type {
  CatalogReviewDocument,
  CatalogReviewItem,
  CurationDecision,
  CurationOverride,
  CurationReasonCode,
  NormalizedProductsDocument,
} from "./types.js";

function overrideReason(decision: CurationDecision): CurationReasonCode {
  switch (decision) {
    case "INCLUDE":
      return "MANUAL_INCLUDE";

    case "EXCLUDE":
      return "MANUAL_EXCLUDE";

    case "NEEDS_REVIEW":
      return "MANUAL_REVIEW";
  }
}

function compareReviewItems(left: CatalogReviewItem, right: CatalogReviewItem): number {
  const decisionComparison = left.finalDecision.localeCompare(right.finalDecision, "en");

  if (decisionComparison !== 0) {
    return decisionComparison;
  }

  const categoryComparison = (left.foodCategoryExternalId ?? "").localeCompare(
    right.foodCategoryExternalId ?? "",
    "en",
    {
      sensitivity: "base",
    },
  );

  if (categoryComparison !== 0) {
    return categoryComparison;
  }

  const nameComparison = left.normalizedNameEn.localeCompare(right.normalizedNameEn, "en", {
    sensitivity: "base",
  });

  if (nameComparison !== 0) {
    return nameComparison;
  }

  return left.fdcId - right.fdcId;
}

function createReviewItem(
  product: NormalizedProductsDocument["products"][number],
  override: CurationOverride | undefined,
): CatalogReviewItem {
  const automatic = evaluateAutomaticCuration(product);
  const category = product.foodCategoryExternalId
    ? USDA_FOOD_CATEGORY_BY_ID.get(product.foodCategoryExternalId)
    : undefined;

  if (!override) {
    return {
      ...product,
      automaticDecision: automatic.decision,
      finalDecision: automatic.decision,
      decisionSource: "AUTOMATIC",
      reasonCodes: automatic.reasonCodes,
      overrideNote: null,
      foodCategoryExternalName: category?.description ?? null,
    };
  }

  return {
    ...product,
    automaticDecision: automatic.decision,
    finalDecision: override.decision,
    decisionSource: "OVERRIDE",
    reasonCodes: [...automatic.reasonCodes, overrideReason(override.decision)],
    overrideNote: override.note,
    foodCategoryExternalName: category?.description ?? null,
  };
}

function countDecision(
  items: readonly CatalogReviewItem[],
  field: "automaticDecision" | "finalDecision",
  decision: CurationDecision,
): number {
  return items.filter((item) => item[field] === decision).length;
}

function assertOverridesReferenceExistingProducts(
  products: NormalizedProductsDocument["products"],
  overrides: Readonly<Record<number, CurationOverride>>,
): void {
  const fdcIds = new Set(products.map((product) => product.fdcId));

  const unknownOverrideIds = Object.keys(overrides)
    .map(Number)
    .filter((fdcId) => !fdcIds.has(fdcId))
    .sort((left, right) => left - right);

  if (unknownOverrideIds.length > 0) {
    throw new Error(
      [
        "Curation overrides reference unknown FDC IDs.",
        `IDs: ${unknownOverrideIds.join(", ")}.`,
      ].join(" "),
    );
  }
}

export function buildCatalogReview(
  normalized: NormalizedProductsDocument,
  overrides: Readonly<Record<number, CurationOverride>> = CURATION_OVERRIDES,
): CatalogReviewDocument {
  if (normalized.schemaVersion !== 1) {
    throw new Error(
      `Unsupported normalized-products schema version: ${String(normalized.schemaVersion)}.`,
    );
  }

  assertOverridesReferenceExistingProducts(normalized.products, overrides);

  const seenFdcIds = new Set<number>();

  const items = normalized.products.map((product) => {
    if (seenFdcIds.has(product.fdcId)) {
      throw new Error(`Duplicate FDC ID ${product.fdcId} in normalized-products document.`);
    }

    seenFdcIds.add(product.fdcId);

    return createReviewItem(product, overrides[product.fdcId]);
  });

  items.sort(compareReviewItems);

  return {
    schemaVersion: 1,
    sourceSchemaVersion: normalized.schemaVersion,
    statistics: {
      inputProductsTotal: items.length,

      automaticIncludes: countDecision(items, "automaticDecision", "INCLUDE"),
      automaticExcludes: countDecision(items, "automaticDecision", "EXCLUDE"),
      automaticNeedsReview: countDecision(items, "automaticDecision", "NEEDS_REVIEW"),

      finalIncludes: countDecision(items, "finalDecision", "INCLUDE"),
      finalExcludes: countDecision(items, "finalDecision", "EXCLUDE"),
      finalNeedsReview: countDecision(items, "finalDecision", "NEEDS_REVIEW"),

      overriddenProducts: items.filter((item) => item.decisionSource === "OVERRIDE").length,
    },
    items,
  };
}
