import type { NormalizedFoodState, PreparationMethod } from "./types.js";

export interface ProductNameTranslationInputItem {
  /**
   * Stable deterministic key used to join the translation
   * result back to the import-ready product.
   *
   * It is intentionally independent from array position.
   */
  readonly key: string;

  readonly fdcId: number;

  readonly nameEn: string;

  readonly categoryCode: string;

  readonly preparationMethod: PreparationMethod;

  readonly foodState: NormalizedFoodState;

  readonly modifiersEn: readonly string[];
}

export interface ProductNameTranslationInputDocument {
  readonly schemaVersion: 1;

  readonly sourceSchemaVersion: 1;

  readonly statistics: {
    readonly inputProductsTotal: number;

    readonly translationItemsTotal: number;
  };

  readonly items: readonly ProductNameTranslationInputItem[];
}

export interface ProductNameTranslationResultItem {
  readonly key: string;

  readonly nameUa: string;
}

export interface ProductNameTranslationsDocument {
  readonly schemaVersion: 1;

  readonly sourceSchemaVersion: 1;

  readonly statistics: {
    readonly translationItemsTotal: number;

    readonly translatedItemsTotal: number;
  };

  readonly translations: readonly ProductNameTranslationResultItem[];
}
