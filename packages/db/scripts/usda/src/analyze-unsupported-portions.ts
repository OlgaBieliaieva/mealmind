import { readFile } from "node:fs/promises";

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
}

interface Document {
  readonly products: readonly Product[];
  readonly excludedPortions: readonly ExcludedPortion[];
}

function increment(map: Map<string, number>, value: string | null): void {
  const key = value?.trim() || "<EMPTY>";

  map.set(key, (map.get(key) ?? 0) + 1);
}

const raw = await readFile("./scripts/usda/data/work/normalized-portions.json", "utf8");

const document = JSON.parse(raw) as Document;

const productByFdcId = new Map(document.products.map((product) => [product.fdcId, product]));

const modifierCounts = new Map<string, number>();

const rows = [];

for (const portion of document.excludedPortions) {
  if (!portion.reasonCodes.includes("UNSUPPORTED_MEASURE")) {
    continue;
  }

  increment(modifierCounts, portion.sourceModifier);

  const product = productByFdcId.get(portion.fdcId);

  rows.push({
    fdcId: portion.fdcId,

    product: product?.originalDescription ?? "<UNKNOWN>",

    modifier: portion.sourceModifier,

    unit: portion.sourceMeasurementUnitName,

    amount: portion.sourceAmount,

    gramWeight: portion.gramWeight,
  });
}

console.log("\n=== TOP UNSUPPORTED MODIFIERS ===");

console.table(
  [...modifierCounts.entries()]
    .map(([modifier, count]) => ({
      modifier,
      count,
    }))
    .sort((left, right) => right.count - left.count || left.modifier.localeCompare(right.modifier))
    .slice(0, 150),
);

console.log("\n=== UNSUPPORTED ROWS ===");

console.log("TOTAL:", rows.length);

console.table(rows.slice(0, 250));
