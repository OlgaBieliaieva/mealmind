import {
  resolveCanonicalNutrient,
  USDA_ENERGY_SOURCE_PRIORITY,
  USDA_NUTRIENT_WHITELIST,
} from "../config/nutrient-whitelist.js";

import type { ExtractedNutrientsDocument, ExtractedProductNutrient } from "./nutrient-types.js";

import type { CuratedProductsDocument } from "./types.js";

export interface SelectedFoodNutrientRow {
  readonly id: string;
  readonly fdcId: number;
  readonly nutrientId: number;
  readonly amount: number;
  readonly dataPoints: number | null;
  readonly derivationId: string | null;
}

interface ExtractNutrientsInput {
  readonly curated: CuratedProductsDocument;

  readonly foodNutrientRows: readonly SelectedFoodNutrientRow[];
}

/**
 * Maps USDA derivation metadata to the internal nutrient value type.
 *
 * We intentionally do not infer USDA derivation semantics yet.
 * The raw USDA derivation ID is preserved so a verified mapping
 * can be added later without losing source metadata.
 */
function mapValueType(derivationId: string | null): ExtractedProductNutrient["valueType"] {
  void derivationId;

  return "UNKNOWN";
}

/**
 * Normalizes a USDA nutrient amount before it enters
 * the canonical MealMind nutrient dataset.
 *
 * USDA Foundation Foods can contain small negative values
 * for carbohydrate by difference. These values are treated
 * as calculation artifacts and normalized to zero.
 *
 * Negative values for other nutrients remain invalid.
 */
function normalizeNutrientAmount(nutrientId: number, amount: number): number {
  if (amount >= 0) {
    return amount;
  }

  if (nutrientId === 1005) {
    return 0;
  }

  throw new Error(`Negative USDA nutrient value for nutrient ${nutrientId}: ${amount}.`);
}

/**
 * Determines whether duplicate USDA source rows describe
 * the same semantic nutrient value.
 *
 * Source row IDs are intentionally excluded from comparison:
 * USDA can contain duplicate rows that differ only by row ID.
 */
function areSemanticallyEqualNutrientRows(
  left: SelectedFoodNutrientRow,
  right: SelectedFoodNutrientRow,
): boolean {
  return (
    left.fdcId === right.fdcId &&
    left.nutrientId === right.nutrientId &&
    left.amount === right.amount &&
    left.dataPoints === right.dataPoints &&
    left.derivationId === right.derivationId
  );
}

/**
 * Selects exactly one USDA Energy source according to
 * MealMind priority:
 *
 * 1008 - Energy
 * 2048 - Energy (Atwater Specific Factors)
 * 2047 - Energy (Atwater General Factors)
 *
 * The priority is independent of source CSV row ordering.
 */
function selectEnergyRow(rows: readonly SelectedFoodNutrientRow[]): SelectedFoodNutrientRow | null {
  for (const nutrientId of USDA_ENERGY_SOURCE_PRIORITY) {
    const row = rows.find((candidate) => candidate.nutrientId === nutrientId);

    if (row) {
      return row;
    }
  }

  return null;
}

/**
 * Converts one USDA source nutrient row into a canonical
 * MealMind nutrient value.
 *
 * For energy_kcal the canonical nutrient can be sourced from
 * USDA nutrient 1008, 2048 or 2047.
 *
 * usdaNutrientId preserves the actual source nutrient ID used.
 */
function buildExtractedNutrient(row: SelectedFoodNutrientRow): ExtractedProductNutrient {
  const mapped = resolveCanonicalNutrient(row.nutrientId);

  if (!mapped) {
    throw new Error(`Unsupported USDA nutrient ID ${row.nutrientId}.`);
  }

  return {
    nutrientId: mapped.nutrientId,

    nutrientCode: mapped.code,

    /**
     * Preserve the actual USDA source nutrient ID.
     *
     * For energy_kcal this can therefore be
     * 1008, 2048 or 2047.
     */
    usdaNutrientId: row.nutrientId,

    valuePer100g: normalizeNutrientAmount(row.nutrientId, row.amount),

    valueType: mapValueType(row.derivationId),

    sourceRowId: row.id,

    sourceDerivationExternalId: row.derivationId,

    sourceDataPoints: row.dataPoints,
  };
}

/**
 * Extracts MealMind-supported nutrient values for products
 * that survived USDA catalog curation.
 *
 * Invariants:
 *
 * - only curated products are considered;
 * - only supported USDA source nutrients are considered;
 * - identical duplicate source rows are deduplicated;
 * - conflicting duplicate values fail extraction;
 * - carbohydrate-by-difference negative artifacts become zero;
 * - exactly one canonical energy_kcal value is emitted;
 * - energy source priority is 1008 -> 2048 -> 2047;
 * - products without a supported Energy source are excluded
 *   from the nutrient-ready output;
 * - missing non-required nutrients remain missing;
 * - explicit zero values are preserved;
 * - output ordering is deterministic.
 */
export function extractNutrients(input: ExtractNutrientsInput): ExtractedNutrientsDocument {
  const productByFdcId = new Map(input.curated.products.map((product) => [product.fdcId, product]));

  /**
   * Store validated USDA source rows by product first.
   *
   * Energy must be resolved at product level because
   * multiple USDA source IDs can map to one canonical
   * MealMind energy_kcal nutrient.
   */
  const sourceRowsByFdcId = new Map<number, SelectedFoodNutrientRow[]>();

  /**
   * Duplicate protection is applied to the USDA source pair:
   *
   * fdcId + nutrientId
   */
  const seenSourceRows = new Map<string, SelectedFoodNutrientRow>();

  let ignoredNutrientRows = 0;

  for (const row of input.foodNutrientRows) {
    /**
     * Rows belonging to products that did not survive
     * catalog curation are ignored.
     */
    if (!productByFdcId.has(row.fdcId)) {
      ignoredNutrientRows += 1;
      continue;
    }

    /**
     * Resolve either a direct canonical nutrient mapping
     * or one of the supported alternative Energy sources.
     */
    const mapped = resolveCanonicalNutrient(row.nutrientId);

    if (!mapped) {
      ignoredNutrientRows += 1;
      continue;
    }

    const duplicateKey = `${row.fdcId}:${row.nutrientId}`;

    const existingRow = seenSourceRows.get(duplicateKey);

    if (existingRow) {
      if (!areSemanticallyEqualNutrientRows(existingRow, row)) {
        throw new Error(
          `Conflicting USDA nutrient values for FDC ${row.fdcId}, nutrient ${row.nutrientId}.`,
        );
      }

      /**
       * USDA can contain duplicate source rows describing
       * exactly the same nutrient value.
       *
       * Identical duplicates are intentionally ignored.
       */
      continue;
    }

    seenSourceRows.set(duplicateKey, row);

    const existing = sourceRowsByFdcId.get(row.fdcId);

    if (existing) {
      existing.push(row);
    } else {
      sourceRowsByFdcId.set(row.fdcId, [row]);
    }
  }

  /**
   * Canonical MealMind nutrient IDs represented in the
   * final nutrient-ready dataset.
   *
   * Use canonical nutrient IDs rather than USDA source IDs,
   * otherwise 1008 / 2048 / 2047 would incorrectly count as
   * three different nutrients.
   */
  const representedNutrientIds = new Set<string>();

  let productsExcludedForMissingEnergy = 0;

  let extractedNutrientValues = 0;

  let energySource1008Products = 0;

  let energySource2048Products = 0;

  let energySource2047Products = 0;

  const products = input.curated.products
    .flatMap((product) => {
      const sourceRows = sourceRowsByFdcId.get(product.fdcId) ?? [];

      /**
       * Energy is required for a product to continue
       * to the nutrient-ready MealMind catalog.
       */
      const energyRow = selectEnergyRow(sourceRows);

      if (!energyRow) {
        productsExcludedForMissingEnergy += 1;

        return [];
      }

      /**
       * Track which USDA Energy source actually won
       * after applying priority.
       */
      if (energyRow.nutrientId === 1008) {
        energySource1008Products += 1;
      } else if (energyRow.nutrientId === 2048) {
        energySource2048Products += 1;
      } else if (energyRow.nutrientId === 2047) {
        energySource2047Products += 1;
      } else {
        throw new Error(
          `Unexpected USDA Energy source ${energyRow.nutrientId} for FDC ${product.fdcId}.`,
        );
      }

      /**
       * Remove every Energy source row from normal mapping.
       *
       * Otherwise a product containing 1008 + 2047 + 2048
       * would receive three canonical energy_kcal nutrients.
       *
       * Exactly one resolved Energy row is inserted below.
       */
      const nonEnergyRows = sourceRows.filter(
        (row) => row.nutrientId !== 1008 && row.nutrientId !== 2048 && row.nutrientId !== 2047,
      );

      const nutrients = nonEnergyRows.map(buildExtractedNutrient);

      nutrients.push(buildExtractedNutrient(energyRow));

      /**
       * Stable sorting by USDA nutrient ID keeps generated
       * output deterministic.
       */
      const sortedNutrients = [...nutrients].sort(
        (left, right) => left.usdaNutrientId - right.usdaNutrientId,
      );

      extractedNutrientValues += sortedNutrients.length;

      for (const nutrient of sortedNutrients) {
        representedNutrientIds.add(nutrient.nutrientId);
      }

      return [
        {
          ...product,

          nutrients: sortedNutrients,
        },
      ];
    })
    .sort((left, right) => left.fdcId - right.fdcId);

  const productsWithNutrients = products.filter((product) => product.nutrients.length > 0).length;

  return {
    schemaVersion: 1,

    sourceSchemaVersion: input.curated.schemaVersion,

    statistics: {
      /**
       * All products entering nutrient extraction,
       * including products later rejected by the
       * Energy completeness gate.
       */
      inputProductsTotal: input.curated.products.length,

      /**
       * Products that passed the Energy completeness gate.
       */
      outputProductsTotal: products.length,

      productsWithNutrients,

      productsWithoutNutrients: products.length - productsWithNutrients,

      productsExcludedForMissingEnergy,

      extractedNutrientValues,

      ignoredNutrientRows,

      /**
       * Alternative USDA Energy sources 2047 / 2048
       * do not increase the canonical whitelist size.
       */
      whitelistNutrients: USDA_NUTRIENT_WHITELIST.length,

      representedWhitelistNutrients: representedNutrientIds.size,

      energySource1008Products,

      energySource2048Products,

      energySource2047Products,
    },

    products,
  };
}
