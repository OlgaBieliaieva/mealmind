import { USDA_PRODUCT_CATEGORY_MAPPING } from "../config/product-category-mapping.js";

import { getAssignableProductCategoryReference } from "../config/product-category-reference.js";

import type { ProductCategoryReference } from "../config/product-category-reference.js";

export interface ProductCategoryResolutionInput {
  readonly foodCategoryExternalId: string | null;

  readonly normalizedNameEn: string;

  readonly originalDescription: string;
}

function buildSearchText(input: ProductCategoryResolutionInput): string {
  return [input.normalizedNameEn, input.originalDescription]
    .filter((value) => value.trim() !== "")
    .join(" | ");
}

export function resolveProductCategory(
  input: ProductCategoryResolutionInput,
): ProductCategoryReference {
  const externalId = input.foodCategoryExternalId?.trim();

  if (!externalId) {
    throw new Error(`USDA product "${input.normalizedNameEn}" has no food category external ID.`);
  }

  const mapping = USDA_PRODUCT_CATEGORY_MAPPING[externalId];

  if (!mapping) {
    throw new Error(
      `Unsupported USDA food category "${externalId}" for product "${input.normalizedNameEn}".`,
    );
  }

  const searchText = buildSearchText(input);

  for (const rule of mapping.refinementRules ?? []) {
    if (rule.patterns.some((pattern) => pattern.test(searchText))) {
      return getAssignableProductCategoryReference(rule.categoryCode);
    }
  }

  return getAssignableProductCategoryReference(mapping.fallbackCategoryCode);
}
