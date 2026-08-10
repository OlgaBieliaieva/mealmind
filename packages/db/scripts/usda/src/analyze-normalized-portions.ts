import { readFile } from "node:fs/promises";

interface NormalizedPortion {
  readonly labelEn: string;
  readonly kind: string;
  readonly measurementUnitCode: string | null;
}

interface ExcludedPortion {
  readonly fdcId: number;
  readonly sourceRowId: string;
  readonly sourceAmount: number;
  readonly gramWeight: number;
  readonly sourceMeasurementUnitName: string | null;
  readonly sourceModifier: string | null;
  readonly reasonCodes: readonly string[];
}

interface Product {
  readonly fdcId: number;
  readonly originalDescription: string;
  readonly portions: readonly NormalizedPortion[];
}

interface Document {
  readonly products: readonly Product[];
  readonly excludedPortions: readonly ExcludedPortion[];
}

function increment(map: Map<string, number>, value: string | null): void {
  const key = value?.trim() || "<EMPTY>";

  map.set(key, (map.get(key) ?? 0) + 1);
}

function topValues(
  map: ReadonlyMap<string, number>,
  limit = 100,
): readonly {
  readonly value: string;
  readonly count: number;
}[] {
  return [...map.entries()]
    .map(([value, count]) => ({
      value,
      count,
    }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
    .slice(0, limit);
}

const raw = await readFile("./scripts/usda/data/work/normalized-portions.json", "utf8");

const document = JSON.parse(raw) as Document;

const kindCounts = new Map<string, number>();

const unitCounts = new Map<string, number>();

const labelCounts = new Map<string, number>();

const excludedReasonCounts = new Map<string, number>();

const unsupportedModifierCounts = new Map<string, number>();

const unsupportedRows = [];

for (const product of document.products) {
  for (const portion of product.portions) {
    increment(kindCounts, portion.kind);

    increment(unitCounts, portion.measurementUnitCode);

    increment(labelCounts, portion.labelEn);
  }
}

for (const excluded of document.excludedPortions) {
  for (const reason of excluded.reasonCodes) {
    increment(excludedReasonCounts, reason);
  }

  if (excluded.reasonCodes.includes("UNSUPPORTED_MEASURE")) {
    increment(unsupportedModifierCounts, excluded.sourceModifier);

    unsupportedRows.push({
      fdcId: excluded.fdcId,

      sourceRowId: excluded.sourceRowId,

      modifier: excluded.sourceModifier,

      unit: excluded.sourceMeasurementUnitName,

      amount: excluded.sourceAmount,

      gramWeight: excluded.gramWeight,
    });
  }
}

console.log("\n=== NORMALIZED KINDS ===");

console.table(topValues(kindCounts, 20));

console.log("\n=== CANONICAL UNITS ===");

console.table(topValues(unitCounts, 50));

console.log("\n=== TOP NORMALIZED LABELS ===");

console.table(topValues(labelCounts, 100));

console.log("\n=== EXCLUSION REASONS ===");

console.table(topValues(excludedReasonCounts, 20));

console.log("\n=== TOP UNSUPPORTED MODIFIERS ===");

console.table(topValues(unsupportedModifierCounts, 150));

console.log("\n=== SAMPLE UNSUPPORTED ROWS ===");

console.table(unsupportedRows.slice(0, 200));
