import type { NormalizedFoodState, PreparationMethod } from "./types.js";

export interface ProductNameTranslationKeyInput {
  readonly nameEn: string;

  readonly categoryCode: string;

  readonly preparationMethod: PreparationMethod;

  readonly foodState: NormalizedFoodState;

  readonly modifiersEn: readonly string[];
}

/**
 * Stable deterministic identity used to join
 * product-name translations back to import-ready products.
 *
 * Modifier order must not affect translation identity.
 */
export function buildProductNameTranslationKey(input: ProductNameTranslationKeyInput): string {
  return [
    input.nameEn,
    input.categoryCode,
    input.preparationMethod,
    input.foodState,
    [...input.modifiersEn].sort((left, right) => left.localeCompare(right)).join("|"),
  ].join("::");
}
