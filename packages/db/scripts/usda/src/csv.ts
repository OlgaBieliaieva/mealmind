import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { parse } from "csv-parse";

import type { CsvRow } from "./types.js";

/**
 * Checks whether a file is accessible.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads a CSV file as an async stream.
 *
 * This is important for large USDA files such as food_nutrient.csv:
 * the entire file is not loaded into memory.
 *
 * The generic type should describe the expected columns:
 *
 * interface FoodRow extends CsvRow {
 *   fdc_id: string;
 *   description: string;
 * }
 *
 * for await (const row of readCsvRows<FoodRow>(filePath)) {
 *   // ...
 * }
 */
export async function* readCsvRows<TRow extends CsvRow = CsvRow>(
  filePath: string,
): AsyncGenerator<TRow> {
  if (!(await fileExists(filePath))) {
    throw new Error(`CSV file does not exist: ${filePath}`);
  }

  const input = createReadStream(filePath, {
    encoding: "utf8",
  });

  const parser = input.pipe(
    parse({
      bom: true,
      columns: true,
      skip_empty_lines: true,
      trim: true,

      // USDA descriptions can contain commas and quoted values.
      relax_quotes: true,
      relax_column_count: true,
    }),
  );

  try {
    for await (const row of parser) {
      yield row as TRow;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`Failed to parse CSV file "${filePath}": ${message}`, {
      cause: error,
    });
  }
}

/**
 * Reads a small CSV file into an array.
 *
 * Do not use this helper for food_nutrient.csv or other very large files.
 */
export async function readSmallCsvFile<TRow extends CsvRow = CsvRow>(
  filePath: string,
): Promise<TRow[]> {
  const rows: TRow[] = [];

  for await (const row of readCsvRows<TRow>(filePath)) {
    rows.push(row);
  }

  return rows;
}
