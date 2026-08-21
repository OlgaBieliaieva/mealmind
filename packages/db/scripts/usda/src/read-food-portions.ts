import { readCsvRows } from "./csv.js";

import { parseFoodPortionRow } from "./portion-source.js";

import type { UsdaFoodPortionRow } from "./portion-source.js";

import type { CsvRow } from "./types.js";

interface FoodPortionCsvRow extends CsvRow {
  readonly id: string;
  readonly fdc_id: string;
  readonly seq_num: string;
  readonly amount: string;
  readonly measure_unit_id: string;
  readonly portion_description: string;
  readonly modifier: string;
  readonly gram_weight: string;
  readonly data_points: string;
  readonly footnote: string;
  readonly min_year_acquired: string;
}

function parseFilterFdcId(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export async function readSelectedFoodPortions(
  filePath: string,
  selectedFdcIds: ReadonlySet<number>,
): Promise<UsdaFoodPortionRow[]> {
  const rows: UsdaFoodPortionRow[] = [];

  for await (const rawRow of readCsvRows<FoodPortionCsvRow>(filePath)) {
    const fdcId = parseFilterFdcId(rawRow.fdc_id);

    if (fdcId === null || !selectedFdcIds.has(fdcId)) {
      continue;
    }

    rows.push(parseFoodPortionRow(rawRow));
  }

  return rows;
}
