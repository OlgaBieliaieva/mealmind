import type { ProductWithExtractedNutrients } from "./nutrient-types.js";

export interface UsdaMeasureUnit {
  readonly externalId: string;
  readonly name: string;
}

export interface ExtractedPortion {
  readonly sourceRowId: string;

  readonly sourceSequence: number | null;

  /**
   * Raw USDA amount.
   *
   * Legacy USDA rows can legitimately contain 0 here.
   * Do not normalize it during raw extraction.
   */
  readonly sourceAmount: number;

  readonly gramWeight: number;

  readonly sourceMeasurementUnitExternalId: string | null;

  readonly sourceMeasurementUnitName: string | null;

  readonly portionDescription: string | null;

  readonly modifier: string | null;

  readonly sourceDataPoints: number | null;

  readonly sourceMinYearAcquired: number | null;
}

export interface ProductWithExtractedPortions extends ProductWithExtractedNutrients {
  readonly portions: readonly ExtractedPortion[];
}

export interface PortionExtractionStatistics {
  readonly inputProductsTotal: number;

  readonly productsWithPortions: number;

  readonly productsWithoutPortions: number;

  readonly selectedPortionRows: number;

  readonly extractedPortions: number;

  readonly zeroAmountPortions: number;

  readonly undeterminedUnitPortions: number;

  readonly missingUnitPortions: number;

  readonly distinctSourceMeasurementUnits: number;
}

export interface ExtractedPortionsDocument {
  readonly schemaVersion: 1;

  readonly sourceSchemaVersion: 1;

  readonly statistics: PortionExtractionStatistics;

  readonly products: readonly ProductWithExtractedPortions[];
}
