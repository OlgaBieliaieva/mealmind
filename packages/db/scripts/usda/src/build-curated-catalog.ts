import type { CatalogReviewDocument, CuratedProduct, CuratedProductsDocument } from "./types.js";

function compareCuratedProducts(left: CuratedProduct, right: CuratedProduct): number {
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

  const methodComparison = left.preparationMethod.localeCompare(right.preparationMethod, "en");

  if (methodComparison !== 0) {
    return methodComparison;
  }

  return left.fdcId - right.fdcId;
}

function toCuratedProduct(item: CatalogReviewDocument["items"][number]): CuratedProduct {
  return {
    fdcId: item.fdcId,
    dataset: item.dataset,
    dataType: item.dataType,
    originalDescription: item.originalDescription,
    normalizedNameEn: item.normalizedNameEn,
    preparationMethod: item.preparationMethod,
    foodState: item.foodState,
    preparationConfidence: item.preparationConfidence,
    modifiersEn: item.modifiersEn,
    unclassifiedParts: item.unclassifiedParts,
    foodCategoryExternalId: item.foodCategoryExternalId,
    publicationDate: item.publicationDate,
    ndbNumber: item.ndbNumber,
    curation: {
      decisionSource: item.decisionSource,
      reasonCodes: item.reasonCodes,
      overrideNote: item.overrideNote,
    },
  };
}

export function buildCuratedCatalog(
  review: CatalogReviewDocument,
  options: {
    readonly strict: boolean;
  },
): CuratedProductsDocument {
  if (review.schemaVersion !== 1) {
    throw new Error(`Unsupported catalog-review schema version: ${String(review.schemaVersion)}.`);
  }

  const unresolved = review.items.filter((item) => item.finalDecision === "NEEDS_REVIEW");

  if (options.strict && unresolved.length > 0) {
    const examples = unresolved
      .slice(0, 10)
      .map((item) => `${item.fdcId}: ${item.originalDescription}`);

    throw new Error(
      [
        `Catalog contains ${unresolved.length} unresolved products.`,
        "Add curation overrides before strict generation.",
        `Examples: ${examples.join(" | ")}`,
      ].join(" "),
    );
  }

  const products: CuratedProduct[] = review.items
    .filter((item) => item.finalDecision === "INCLUDE")
    .map(toCuratedProduct);

  products.sort(compareCuratedProducts);

  return {
    schemaVersion: 1,
    sourceSchemaVersion: review.schemaVersion,
    statistics: {
      reviewItemsTotal: review.items.length,
      includedProductsTotal: products.length,
      excludedProductsTotal: review.items.filter((item) => item.finalDecision === "EXCLUDE").length,
      unresolvedProductsTotal: unresolved.length,
    },
    products,
  };
}
