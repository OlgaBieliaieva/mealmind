import type { NormalizedFoodState, PreparationMethod } from "./types.js";

export interface ProductNameTranslationSource {
  readonly fdcId: number;

  readonly nameEn: string;

  readonly preparationMethod: PreparationMethod;

  readonly foodState: NormalizedFoodState;

  readonly categoryCode: string;
}

export interface TranslationSourceDocument {
  readonly schemaVersion: 1;

  readonly sourceSchemaVersion: 1;

  readonly statistics: {
    readonly productsTotal: number;

    readonly uniqueProductNames: number;

    readonly uniqueModifiers: number;

    readonly uniquePortionLabels: number;
  };

  readonly productNames: readonly ProductNameTranslationSource[];

  readonly modifiers: readonly string[];

  readonly portionLabels: readonly string[];
}
