import type { DatabaseClient } from "../../../src/client.js";

import {
  ALLERGENS,
  CUISINES,
  DIETARY_TAGS,
  MEAL_TYPES,
  MEASUREMENT_UNITS,
  NUTRIENTS,
  PRODUCT_CATEGORIES,
  RECIPE_TYPES,
} from "./data/index.js";

interface ReferenceRow {
  readonly id: string;
  readonly code: string;
}

interface ReferenceSeedSectionReport {
  readonly entity: string;
  readonly created: number;
  readonly updated: number;
  readonly unchanged: number;
}

export interface ReferenceSeedReport {
  readonly sections: readonly ReferenceSeedSectionReport[];
  readonly created: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly total: number;
}

interface SynchronizationOperations<Row extends ReferenceRow, Existing extends ReferenceRow> {
  readonly findMatches: (row: Row) => Promise<readonly Existing[]>;
  readonly create: (row: Row) => Promise<unknown>;
  readonly update: (row: Row) => Promise<unknown>;
}

export async function seedReferenceData(database: DatabaseClient): Promise<ReferenceSeedReport> {
  return database.$transaction(
    async (transaction) => {
      const sections: ReferenceSeedSectionReport[] = [];

      sections.push(
        await synchronizeReferenceRows("Nutrient", NUTRIENTS, {
          findMatches: (row) =>
            transaction.nutrient.findMany({
              where: {
                OR: [{ id: row.id }, { code: row.code }],
              },
            }),
          create: (row) =>
            transaction.nutrient.create({
              data: row,
            }),
          update: ({ id, ...data }) =>
            transaction.nutrient.update({
              where: { id },
              data,
            }),
        }),
      );

      sections.push(
        await synchronizeReferenceRows("MeasurementUnit", MEASUREMENT_UNITS, {
          findMatches: (row) =>
            transaction.measurementUnit.findMany({
              where: {
                OR: [{ id: row.id }, { code: row.code }],
              },
            }),
          create: (row) =>
            transaction.measurementUnit.create({
              data: row,
            }),
          update: ({ id, ...data }) =>
            transaction.measurementUnit.update({
              where: { id },
              data,
            }),
        }),
      );

      sections.push(
        await synchronizeReferenceRows("DietaryTag", DIETARY_TAGS, {
          findMatches: (row) =>
            transaction.dietaryTag.findMany({
              where: {
                OR: [{ id: row.id }, { code: row.code }],
              },
            }),
          create: (row) =>
            transaction.dietaryTag.create({
              data: row,
            }),
          update: ({ id, ...data }) =>
            transaction.dietaryTag.update({
              where: { id },
              data,
            }),
        }),
      );

      sections.push(
        await synchronizeReferenceRows("Cuisine", CUISINES, {
          findMatches: (row) =>
            transaction.cuisine.findMany({
              where: {
                OR: [{ id: row.id }, { code: row.code }],
              },
            }),
          create: (row) =>
            transaction.cuisine.create({
              data: row,
            }),
          update: ({ id, ...data }) =>
            transaction.cuisine.update({
              where: { id },
              data,
            }),
        }),
      );

      /*
       * PRODUCT_CATEGORIES вже впорядкований parent-first.
       * Тому батьківські категорії будуть створені раніше за дочірні.
       */
      sections.push(
        await synchronizeReferenceRows("ProductCategory", PRODUCT_CATEGORIES, {
          findMatches: (row) =>
            transaction.productCategory.findMany({
              where: {
                OR: [{ id: row.id }, { code: row.code }],
              },
            }),
          create: (row) =>
            transaction.productCategory.create({
              data: row,
            }),
          update: ({ id, ...data }) =>
            transaction.productCategory.update({
              where: { id },
              data,
            }),
        }),
      );

      sections.push(
        await synchronizeReferenceRows("RecipeType", RECIPE_TYPES, {
          findMatches: (row) =>
            transaction.recipeType.findMany({
              where: {
                OR: [{ id: row.id }, { code: row.code }],
              },
            }),
          create: (row) =>
            transaction.recipeType.create({
              data: row,
            }),
          update: ({ id, ...data }) =>
            transaction.recipeType.update({
              where: { id },
              data,
            }),
        }),
      );

      sections.push(
        await synchronizeReferenceRows("MealType", MEAL_TYPES, {
          findMatches: (row) =>
            transaction.mealType.findMany({
              where: {
                OR: [{ id: row.id }, { code: row.code }],
              },
            }),
          create: (row) =>
            transaction.mealType.create({
              data: row,
            }),
          update: ({ id, ...data }) =>
            transaction.mealType.update({
              where: { id },
              data,
            }),
        }),
      );

      sections.push(
        await synchronizeReferenceRows("Allergen", ALLERGENS, {
          findMatches: (row) =>
            transaction.allergen.findMany({
              where: {
                OR: [{ id: row.id }, { code: row.code }],
              },
            }),
          create: (row) =>
            transaction.allergen.create({
              data: row,
            }),
          update: ({ id, ...data }) =>
            transaction.allergen.update({
              where: { id },
              data,
            }),
        }),
      );

      const created = sumField(sections, "created");
      const updated = sumField(sections, "updated");
      const unchanged = sumField(sections, "unchanged");

      return {
        sections,
        created,
        updated,
        unchanged,
        total: created + updated + unchanged,
      };
    },
    {
      maxWait: 10_000,
      timeout: 60_000,
    },
  );
}

async function synchronizeReferenceRows<Row extends ReferenceRow, Existing extends ReferenceRow>(
  entity: string,
  rows: readonly Row[],
  operations: SynchronizationOperations<Row, Existing>,
): Promise<ReferenceSeedSectionReport> {
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const row of rows) {
    const matches = await operations.findMatches(row);

    const idMatch = matches.find((candidate) => candidate.id === row.id);

    const codeConflict = matches.find(
      (candidate) => candidate.code === row.code && candidate.id !== row.id,
    );

    if (codeConflict) {
      throw new Error(`${entity} reference identity conflict for code "${row.code}"`);
    }

    if (!idMatch) {
      await operations.create(row);
      created += 1;
      continue;
    }

    if (!hasDataDrift(idMatch, row)) {
      unchanged += 1;
      continue;
    }

    await operations.update(row);
    updated += 1;
  }

  return {
    entity,
    created,
    updated,
    unchanged,
  };
}

function hasDataDrift(existing: object, expected: object): boolean {
  const existingRecord = existing as Record<string, unknown>;

  return Object.entries(expected).some(
    ([field, expectedValue]) =>
      normalizeValue(existingRecord[field]) !== normalizeValue(expectedValue),
  );
}

function normalizeValue(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    return String(value);
  }

  return String(value);
}

function sumField(
  sections: readonly ReferenceSeedSectionReport[],
  field: "created" | "updated" | "unchanged",
): number {
  return sections.reduce((total, section) => total + section[field], 0);
}
