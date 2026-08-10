import { USDA_SUPPORTED_SOURCE_NUTRIENT_IDS } from "../config/nutrient-whitelist.js";

import { readCsvRows } from "./csv.js";

import { parseFoodNutrientRow } from "./nutrient-source.js";

import type { CsvRow } from "./types.js";

interface FoodNutrientCsvRow extends CsvRow {
  readonly id: string;
  readonly fdc_id: string;
  readonly nutrient_id: string;
  readonly amount: string;
  readonly data_points?: string;
  readonly derivation_id?: string;
}

export interface SelectedFoodNutrientRow {
  readonly id: string;
  readonly fdcId: number;
  readonly nutrientId: number;
  readonly amount: number;
  readonly dataPoints: number | null;
  readonly derivationId: string | null;
}

/**
 * Parses an identifier only far enough to decide whether
 * the raw USDA row is relevant for this extraction.
 *
 * Full row validation happens later in parseFoodNutrientRow().
 */
function parseFilterId(value: string | undefined): number | null {
  if (value == null || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

/**
 * Streams food_nutrient.csv and retains only nutrient rows
 * relevant to the curated MealMind catalog.
 *
 * Filtering deliberately happens before full row validation.
 *
 * The reader keeps:
 *
 * - rows belonging to selected curated FDC IDs;
 * - canonical USDA nutrient IDs used by MealMind;
 * - alternative USDA Energy source IDs 2047 and 2048.
 *
 * Alternative Energy rows are resolved later during extraction
 * into the canonical MealMind energy_kcal nutrient.
 */
export async function readSelectedFoodNutrients(
  filePath: string,
  selectedFdcIds: ReadonlySet<number>,
): Promise<SelectedFoodNutrientRow[]> {
  const rows: SelectedFoodNutrientRow[] = [];

  for await (const rawRow of readCsvRows<FoodNutrientCsvRow>(filePath)) {
    /**
     * First-stage filtering by product.
     *
     * Rows for products outside the curated catalog
     * are irrelevant to this pipeline.
     */
    const fdcId = parseFilterId(rawRow.fdc_id);

    if (fdcId === null || !selectedFdcIds.has(fdcId)) {
      continue;
    }

    /**
     * Second-stage filtering by supported USDA source nutrient.
     *
     * This includes the 36 primary USDA nutrient IDs plus
     * alternative Energy sources 2047 and 2048.
     */
    const nutrientId = parseFilterId(rawRow.nutrient_id);

    if (nutrientId === null || !USDA_SUPPORTED_SOURCE_NUTRIENT_IDS.has(nutrientId)) {
      continue;
    }

    /**
     * Only rows relevant to MealMind reach strict parsing
     * and source validation.
     */
    const row = parseFoodNutrientRow(rawRow);

    rows.push(row);
  }

  return rows;
}
