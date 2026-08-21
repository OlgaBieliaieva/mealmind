import type { ProductWithExtractedPortions } from "./portion-types.js";

export type NormalizedPortionKind = "MASS" | "VOLUME" | "COUNT" | "OTHER";

export type NormalizedPortionWeightType = "UNKNOWN";

export type PortionNormalizationDecision = "INCLUDE" | "EXCLUDE";

export type PortionNormalizationReasonCode =
  | "NORMALIZED_STRUCTURED_UNIT"
  | "NORMALIZED_MODIFIER_UNIT"
  | "NORMALIZED_COUNT_PORTION"
  | "NON_POSITIVE_SOURCE_AMOUNT"
  | "COMPLEX_LEGACY_MEASURE"
  | "NON_LOCAL_MEASURE"
  | "PACKAGE_SPECIFIC_MEASURE"
  | "SERVING_SPECIFIC_MEASURE"
  | "UNSUPPORTED_MEASURE"
  | "MISSING_MEASURE_LABEL"
  | "SEMANTIC_DUPLICATE";

export type CanonicalMeasurementUnitCode = "cup" | "tbsp" | "tsp" | "ml" | "l";

export interface NormalizedProductPortion {
  readonly sourceRowId: string;

  readonly sourceSequence: number | null;

  readonly amount: number;

  readonly gramWeight: number;

  readonly labelEn: string;

  readonly kind: NormalizedPortionKind;

  readonly weightType: NormalizedPortionWeightType;

  /**
   * Canonical MealMind MeasurementUnit code.
   *
   * null means this is a product-specific count portion:
   *
   * slice
   * fillet
   * medium
   * stalk
   * mushroom
   * etc.
   */
  readonly measurementUnitCode: CanonicalMeasurementUnitCode | null;

  readonly sourceMeasurementUnitExternalId: string | null;

  readonly sourceMeasurementUnitName: string | null;

  readonly sourceModifier: string | null;

  readonly sourcePortionDescription: string | null;

  readonly sourceDataPoints: number | null;

  readonly reasonCodes: readonly PortionNormalizationReasonCode[];
}

export interface ExcludedProductPortion {
  readonly fdcId: number;

  readonly sourceRowId: string;

  readonly sourceAmount: number;

  readonly gramWeight: number;

  readonly sourceMeasurementUnitName: string | null;

  readonly sourceModifier: string | null;

  readonly reasonCodes: readonly PortionNormalizationReasonCode[];
}

export interface ProductWithNormalizedPortions extends Omit<
  ProductWithExtractedPortions,
  "portions"
> {
  readonly portions: readonly NormalizedProductPortion[];
}

export interface PortionNormalizationStatistics {
  readonly inputProductsTotal: number;

  readonly inputPortionsTotal: number;

  readonly outputProductsTotal: number;

  readonly productsWithNormalizedPortions: number;

  readonly productsWithoutNormalizedPortions: number;

  readonly normalizedPortionsTotal: number;

  readonly excludedPortionsTotal: number;

  readonly semanticDuplicatesRemoved: number;

  readonly excludedNonPositiveAmount: number;

  readonly excludedComplexLegacyMeasure: number;

  readonly excludedNonLocalMeasure: number;

  readonly excludedPackageSpecificMeasure: number;

  readonly excludedServingSpecificMeasure: number;

  readonly excludedUnsupportedMeasure: number;

  readonly excludedMissingMeasureLabel: number;
}

export interface NormalizedPortionsDocument {
  readonly schemaVersion: 1;

  readonly sourceSchemaVersion: 1;

  readonly statistics: PortionNormalizationStatistics;

  readonly products: readonly ProductWithNormalizedPortions[];

  readonly excludedPortions: readonly ExcludedProductPortion[];
}
