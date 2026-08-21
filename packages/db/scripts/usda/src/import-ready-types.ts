import type { PreparationMethod, NormalizedFoodState, UsdaDataset } from "./types.js";

import type { UsdaNutrientValueType } from "./nutrient-types.js";

import type {
  NormalizedPortionKind,
  NormalizedPortionWeightType,
} from "./portion-normalization-types.js";

/**
 * ProductNutrient representation ready for later Prisma persistence.
 *
 * nutrientId is already the stable MealMind Nutrient UUID,
 * resolved during USDA nutrient extraction.
 */
export interface ImportReadyProductNutrient {
  readonly nutrientId: string;

  readonly nutrientCode: string;

  /**
   * Canonical MealMind nutrient value per 100 g product.
   */
  readonly valuePer100g: number;

  readonly valueType: UsdaNutrientValueType;

  /**
   * USDA provenance retained for audit/debugging.
   */
  readonly source: {
    readonly usdaNutrientId: number;

    readonly rowId: string | null;

    readonly derivationExternalId: string | null;

    readonly dataPoints: number | null;
  };
}

/**
 * Portion representation ready for later ProductPortion persistence.
 *
 * gramWeight always retains USDA's gram-equivalent value.
 */
export interface ImportReadyProductPortion {
  readonly amount: number;

  readonly gramWeight: number;

  readonly labelEn: string;

  /**
   * Ukrainian portion label will be populated by
   * the translation/localization stage.
   */
  readonly labelUa: string | null;

  readonly kind: NormalizedPortionKind;

  readonly weightType: NormalizedPortionWeightType;

  /**
   * Stable MealMind MeasurementUnit UUID.
   *
   * null means a product-specific COUNT portion such as:
   *
   * slice
   * fillet
   * medium
   * stalk
   */
  readonly measurementUnitId: string | null;

  /**
   * Canonical code retained to make generated JSON auditable.
   *
   * For persisted ProductPortion the UUID above is authoritative.
   */
  readonly measurementUnitCode: "ml" | "l" | null;

  readonly source: {
    readonly rowId: string;

    readonly sequence: number | null;

    readonly measurementUnitExternalId: string | null;

    readonly measurementUnitName: string | null;

    readonly modifier: string | null;

    readonly portionDescription: string | null;

    readonly dataPoints: number | null;
  };
}

/**
 * Source metadata that is useful for reproducibility
 * but is not part of the user-facing product identity.
 */
export interface ImportReadyProductSource {
  readonly provider: "USDA";

  readonly fdcId: number;

  readonly dataset: UsdaDataset;

  readonly dataType: string;

  readonly originalDescription: string;

  readonly foodCategoryExternalId: string;

  readonly publicationDate: string | null;

  readonly ndbNumber: string | null;
}

/**
 * Final intermediate representation produced by the USDA
 * preprocessing pipeline before database persistence.
 *
 * This contract deliberately contains database reference UUIDs,
 * but does not import Prisma-generated types.
 */
export interface ImportReadyProduct {
  /**
   * Deterministic external identity.
   *
   * We do not generate the Product database UUID at this stage.
   * FDC ID remains the stable USDA source identifier.
   */
  readonly fdcId: number;

  readonly nameEn: string;

  /**
   * Populated during the translation stage.
   *
   * It stays nullable until translation is completed so that
   * untranslated values cannot be mistaken for valid Ukrainian text.
   */
  readonly nameUa: string | null;

  /**
   * Resolved MealMind ProductCategory reference.
   */
  readonly categoryId: string;

  readonly categoryCode: string;

  /**
   * USDA nutrition is represented per 100 g, therefore
   * imported generic products use grams as their default unit.
   */
  readonly defaultMeasurementUnitId: string;

  readonly defaultMeasurementUnitCode: "g";

  readonly preparationMethod: PreparationMethod;

  readonly foodState: NormalizedFoodState;

  readonly modifiersEn: readonly string[];

  /**
   * Translation follows later together with nameUa.
   */
  readonly modifiersUa: readonly string[];

  /**
   * Source fragments that normalization could not classify.
   * We retain them for audit instead of silently dropping them.
   */
  readonly unclassifiedParts: readonly string[];

  readonly nutrients: readonly ImportReadyProductNutrient[];

  readonly portions: readonly ImportReadyProductPortion[];

  readonly source: ImportReadyProductSource;
}

export interface ImportReadyDatasetStatistics {
  readonly inputProductsTotal: number;

  readonly outputProductsTotal: number;

  readonly nutrientValuesTotal: number;

  readonly portionsTotal: number;

  readonly productsWithPortions: number;

  readonly productsWithoutPortions: number;

  readonly translatedProducts: number;

  readonly untranslatedProducts: number;
}

export interface ImportReadyProductsDocument {
  readonly schemaVersion: 1;

  readonly sourceSchemaVersion: 1;

  readonly statistics: ImportReadyDatasetStatistics;

  readonly products: readonly ImportReadyProduct[];
}
