import { readFile } from "node:fs/promises";

interface Portion {
  readonly sourceRowId: string;
  readonly sourceSequence: number | null;
  readonly sourceAmount: number;
  readonly gramWeight: number;

  readonly sourceMeasurementUnitExternalId: string | null;

  readonly sourceMeasurementUnitName: string | null;

  readonly portionDescription: string | null;

  readonly modifier: string | null;
}

interface Product {
  readonly fdcId: number;
  readonly originalDescription: string;
  readonly normalizedNameEn: string;

  readonly portions: readonly Portion[];
}

interface ExtractedPortionsDocument {
  readonly products: readonly Product[];
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

const filePath = "./scripts/usda/data/work/extracted-portions.json";

const raw = await readFile(filePath, "utf8");

const document = JSON.parse(raw) as ExtractedPortionsDocument;

const unitCounts = new Map<string, number>();

const modifierCounts = new Map<string, number>();

const descriptionCounts = new Map<string, number>();

const zeroAmountRows = [];

const determinedUnitRows = [];

const productsWithMultiplePortions = [];

for (const product of document.products) {
  if (product.portions.length > 1) {
    productsWithMultiplePortions.push({
      fdcId: product.fdcId,

      description: product.originalDescription,

      portions: product.portions.length,
    });
  }

  for (const portion of product.portions) {
    increment(unitCounts, portion.sourceMeasurementUnitName);

    increment(modifierCounts, portion.modifier);

    increment(descriptionCounts, portion.portionDescription);

    if (portion.sourceAmount === 0) {
      zeroAmountRows.push({
        fdcId: product.fdcId,

        product: product.originalDescription,

        sourceRowId: portion.sourceRowId,

        amount: portion.sourceAmount,

        gramWeight: portion.gramWeight,

        unit: portion.sourceMeasurementUnitName,

        unitId: portion.sourceMeasurementUnitExternalId,

        description: portion.portionDescription,

        modifier: portion.modifier,
      });
    }

    if (portion.sourceMeasurementUnitName !== "undetermined") {
      determinedUnitRows.push({
        fdcId: product.fdcId,

        product: product.originalDescription,

        sourceRowId: portion.sourceRowId,

        amount: portion.sourceAmount,

        gramWeight: portion.gramWeight,

        unit: portion.sourceMeasurementUnitName,

        unitId: portion.sourceMeasurementUnitExternalId,

        description: portion.portionDescription,

        modifier: portion.modifier,
      });
    }
  }
}

console.log("\n=== MEASURE UNITS ===");

console.table(topValues(unitCounts, 50));

console.log("\n=== TOP MODIFIERS ===");

console.table(topValues(modifierCounts, 100));

console.log("\n=== TOP PORTION DESCRIPTIONS ===");

console.table(topValues(descriptionCounts, 100));

console.log("\n=== ZERO AMOUNT PORTIONS ===");

console.log("TOTAL:", zeroAmountRows.length);

console.table(zeroAmountRows);

console.log("\n=== DETERMINED UNIT PORTIONS ===");

console.log("TOTAL:", determinedUnitRows.length);

console.table(determinedUnitRows);

console.log("\n=== PRODUCTS WITH MULTIPLE PORTIONS ===");

console.log("TOTAL:", productsWithMultiplePortions.length);

console.table(
  productsWithMultiplePortions.sort((left, right) => right.portions - left.portions).slice(0, 100),
);
