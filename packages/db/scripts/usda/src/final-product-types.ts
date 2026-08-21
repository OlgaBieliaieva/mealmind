import type { ImportReadyProduct, ImportReadyProductPortion } from "./import-ready-types.js";

export type FinalProductPortion = Omit<ImportReadyProductPortion, "labelUa"> & {
  readonly labelUa: string;
};

export type FinalProduct = Omit<ImportReadyProduct, "nameUa" | "modifiersUa" | "portions"> & {
  readonly nameUa: string;

  readonly modifiersUa: readonly string[];

  readonly portions: readonly FinalProductPortion[];
};

export interface FinalProductsStatistics {
  readonly inputProductsTotal: number;

  readonly outputProductsTotal: number;

  readonly translatedProducts: number;

  readonly untranslatedProducts: number;

  readonly modifiersTotal: number;

  readonly translatedModifiers: number;

  readonly untranslatedModifiers: number;

  readonly portionsTotal: number;

  readonly translatedPortions: number;

  readonly untranslatedPortions: number;

  readonly nutrientValuesTotal: number;

  readonly productsWithPortions: number;

  readonly productsWithoutPortions: number;
}

export interface FinalProductsDocument {
  readonly schemaVersion: 1;

  readonly sourceSchemaVersion: 1;

  readonly statistics: FinalProductsStatistics;

  readonly products: readonly FinalProduct[];
}
