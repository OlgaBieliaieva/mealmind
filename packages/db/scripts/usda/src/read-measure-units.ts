import { readCsvRows } from "./csv.js";

import { parseMeasureUnitRow } from "./measure-unit-source.js";

import type { UsdaMeasureUnit } from "./portion-types.js";

import type { CsvRow } from "./types.js";

interface MeasureUnitCsvRow extends CsvRow {
  readonly id: string;
  readonly name: string;
}

export async function readMeasureUnits(
  filePath: string,
): Promise<ReadonlyMap<string, UsdaMeasureUnit>> {
  const result = new Map<string, UsdaMeasureUnit>();

  for await (const rawRow of readCsvRows<MeasureUnitCsvRow>(filePath)) {
    const unit = parseMeasureUnitRow(rawRow);

    if (result.has(unit.externalId)) {
      throw new Error(`Duplicate USDA measure unit ID "${unit.externalId}".`);
    }

    result.set(unit.externalId, unit);
  }

  return result;
}
