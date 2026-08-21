import type { ExtractedNutrientsDocument } from "./nutrient-types.js";

import type {
  ExtractedPortionsDocument,
  ExtractedPortion,
  UsdaMeasureUnit,
} from "./portion-types.js";

import type { UsdaFoodPortionRow } from "./portion-source.js";

interface ExtractPortionsInput {
  readonly nutrientReady: ExtractedNutrientsDocument;

  readonly portionRows: readonly UsdaFoodPortionRow[];

  readonly measureUnits: ReadonlyMap<string, UsdaMeasureUnit>;
}

function buildExtractedPortion(
  row: UsdaFoodPortionRow,
  measureUnits: ReadonlyMap<string, UsdaMeasureUnit>,
): ExtractedPortion {
  const unit = row.measureUnitId ? (measureUnits.get(row.measureUnitId) ?? null) : null;

  return {
    sourceRowId: row.id,

    sourceSequence: row.sequenceNumber,

    sourceAmount: row.amount,

    gramWeight: row.gramWeight,

    sourceMeasurementUnitExternalId: row.measureUnitId,

    sourceMeasurementUnitName: unit?.name ?? null,

    portionDescription: row.portionDescription,

    modifier: row.modifier,

    sourceDataPoints: row.dataPoints,

    sourceMinYearAcquired: row.minYearAcquired,
  };
}

export function extractPortions(input: ExtractPortionsInput): ExtractedPortionsDocument {
  const productIds = new Set(input.nutrientReady.products.map((product) => product.fdcId));

  const rowsByFdcId = new Map<number, UsdaFoodPortionRow[]>();

  for (const row of input.portionRows) {
    if (!productIds.has(row.fdcId)) {
      continue;
    }

    const existing = rowsByFdcId.get(row.fdcId);

    if (existing) {
      existing.push(row);
    } else {
      rowsByFdcId.set(row.fdcId, [row]);
    }
  }

  let productsWithPortions = 0;

  let zeroAmountPortions = 0;

  let undeterminedUnitPortions = 0;

  let missingUnitPortions = 0;

  let extractedPortions = 0;

  const representedUnits = new Set<string>();

  const products = input.nutrientReady.products
    .map((product) => {
      const sourceRows = rowsByFdcId.get(product.fdcId) ?? [];

      const portions = sourceRows
        .map((row) => {
          if (row.amount === 0) {
            zeroAmountPortions += 1;
          }

          if (row.measureUnitId === "9999") {
            undeterminedUnitPortions += 1;
          }

          if (row.measureUnitId == null) {
            missingUnitPortions += 1;
          }

          if (row.measureUnitId) {
            representedUnits.add(row.measureUnitId);
          }

          return buildExtractedPortion(row, input.measureUnits);
        })
        .sort((left, right) => {
          const leftSequence = left.sourceSequence ?? Number.MAX_SAFE_INTEGER;

          const rightSequence = right.sourceSequence ?? Number.MAX_SAFE_INTEGER;

          if (leftSequence !== rightSequence) {
            return leftSequence - rightSequence;
          }

          return left.sourceRowId.localeCompare(right.sourceRowId);
        });

      if (portions.length > 0) {
        productsWithPortions += 1;
      }

      extractedPortions += portions.length;

      return {
        ...product,

        portions,
      };
    })
    .sort((left, right) => left.fdcId - right.fdcId);

  return {
    schemaVersion: 1,

    sourceSchemaVersion: input.nutrientReady.schemaVersion,

    statistics: {
      inputProductsTotal: products.length,

      productsWithPortions,

      productsWithoutPortions: products.length - productsWithPortions,

      selectedPortionRows: input.portionRows.length,

      extractedPortions,

      zeroAmountPortions,

      undeterminedUnitPortions,

      missingUnitPortions,

      distinctSourceMeasurementUnits: representedUnits.size,
    },

    products,
  };
}
