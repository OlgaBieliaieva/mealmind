import { config as loadEnvironment } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createDatabaseClient, type DatabaseClient } from "../../src/client.js";

import { seedReferenceData } from "../seeds/reference/run.js";
import { deployMigrations } from "./helpers/prisma-migrations.js";
import { recreateTestDatabase, resolveTestDatabaseTarget } from "./helpers/test-database.js";

const testDirectory = dirname(fileURLToPath(import.meta.url));

const repositoryRoot = resolve(testDirectory, "../../../..");

const EXPECTED_TOTAL = 181;

loadEnvironment({
  path: resolve(repositoryRoot, ".env"),
});

interface ReferenceRowSnapshot {
  readonly id: string;
  readonly code: string;
  readonly updatedAt: Date;
}

interface ReferenceTableDefinition {
  readonly entity: string;
  readonly expectedCount: number;
  readonly load: () => Promise<readonly ReferenceRowSnapshot[]>;
}

interface ReferenceDatabaseSnapshot {
  readonly total: number;
  readonly timestampsByEntity: ReadonlyMap<string, string>;
}

async function main(): Promise<void> {
  const target = resolveTestDatabaseTarget(process.env);

  console.info(`Recreating local test database ${target.databaseName}...`);

  await recreateTestDatabase(target);

  console.info("Applying Prisma baseline migration...");

  await deployMigrations(target);

  const database = createDatabaseClient({
    connectionString: target.connectionString,
    log: ["error"],
  });

  try {
    console.info("Running reference seed for the first time...");

    const firstReport = await seedReferenceData(database);

    assertSeedReport("first run", firstReport, {
      created: EXPECTED_TOTAL,
      updated: 0,
      unchanged: 0,
      total: EXPECTED_TOTAL,
    });

    const firstSnapshot = await inspectReferenceTables(database, "after first run");

    console.info("Running reference seed for the second time...");

    const secondReport = await seedReferenceData(database);

    assertSeedReport("second run", secondReport, {
      created: 0,
      updated: 0,
      unchanged: EXPECTED_TOTAL,
      total: EXPECTED_TOTAL,
    });

    const secondSnapshot = await inspectReferenceTables(database, "after second run");

    assertTimestampsUnchanged(firstSnapshot, secondSnapshot);

    console.info("Reference seed idempotency test passed.");
    console.info(
      `firstRun created=${firstReport.created} updated=${firstReport.updated} unchanged=${firstReport.unchanged}`,
    );
    console.info(
      `secondRun created=${secondReport.created} updated=${secondReport.updated} unchanged=${secondReport.unchanged}`,
    );
    console.info(`referenceRows=${secondSnapshot.total}`);
  } finally {
    await database.$disconnect();
  }
}

interface ExpectedSeedReport {
  readonly created: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly total: number;
}

function assertSeedReport(
  label: string,
  actual: ExpectedSeedReport,
  expected: ExpectedSeedReport,
): void {
  for (const field of ["created", "updated", "unchanged", "total"] as const) {
    if (actual[field] !== expected[field]) {
      throw new Error(`${label}: expected ${field}=${expected[field]}, received ${actual[field]}`);
    }
  }
}

async function inspectReferenceTables(
  database: DatabaseClient,
  label: string,
): Promise<ReferenceDatabaseSnapshot> {
  const definitions: readonly ReferenceTableDefinition[] = [
    {
      entity: "Nutrient",
      expectedCount: 36,
      load: () =>
        database.nutrient.findMany({
          select: {
            id: true,
            code: true,
            updatedAt: true,
          },
          orderBy: {
            id: "asc",
          },
        }),
    },
    {
      entity: "MeasurementUnit",
      expectedCount: 5,
      load: () =>
        database.measurementUnit.findMany({
          select: {
            id: true,
            code: true,
            updatedAt: true,
          },
          orderBy: {
            id: "asc",
          },
        }),
    },
    {
      entity: "DietaryTag",
      expectedCount: 15,
      load: () =>
        database.dietaryTag.findMany({
          select: {
            id: true,
            code: true,
            updatedAt: true,
          },
          orderBy: {
            id: "asc",
          },
        }),
    },
    {
      entity: "Cuisine",
      expectedCount: 22,
      load: () =>
        database.cuisine.findMany({
          select: {
            id: true,
            code: true,
            updatedAt: true,
          },
          orderBy: {
            id: "asc",
          },
        }),
    },
    {
      entity: "ProductCategory",
      expectedCount: 68,
      load: () =>
        database.productCategory.findMany({
          select: {
            id: true,
            code: true,
            updatedAt: true,
          },
          orderBy: {
            id: "asc",
          },
        }),
    },
    {
      entity: "RecipeType",
      expectedCount: 14,
      load: () =>
        database.recipeType.findMany({
          select: {
            id: true,
            code: true,
            updatedAt: true,
          },
          orderBy: {
            id: "asc",
          },
        }),
    },
    {
      entity: "MealType",
      expectedCount: 7,
      load: () =>
        database.mealType.findMany({
          select: {
            id: true,
            code: true,
            updatedAt: true,
          },
          orderBy: {
            id: "asc",
          },
        }),
    },
    {
      entity: "Allergen",
      expectedCount: 14,
      load: () =>
        database.allergen.findMany({
          select: {
            id: true,
            code: true,
            updatedAt: true,
          },
          orderBy: {
            id: "asc",
          },
        }),
    },
  ];

  const timestampsByEntity = new Map<string, string>();
  let total = 0;

  for (const definition of definitions) {
    const rows = await definition.load();

    if (rows.length !== definition.expectedCount) {
      throw new Error(
        `${label}: ${definition.entity} expected ${definition.expectedCount} rows, received ${rows.length}`,
      );
    }

    assertUniqueIdentity(definition.entity, rows);

    timestampsByEntity.set(
      definition.entity,
      rows.map((row) => `${row.id}:${row.updatedAt.toISOString()}`).join("|"),
    );

    total += rows.length;

    console.info(`${definition.entity} rows=${rows.length}`);
  }

  if (total !== EXPECTED_TOTAL) {
    throw new Error(`${label}: expected ${EXPECTED_TOTAL} reference rows, received ${total}`);
  }

  return {
    total,
    timestampsByEntity,
  };
}

function assertUniqueIdentity(entity: string, rows: readonly ReferenceRowSnapshot[]): void {
  const ids = new Set(rows.map((row) => row.id.toLowerCase()));

  const codes = new Set(rows.map((row) => row.code));

  if (ids.size !== rows.length) {
    throw new Error(`${entity} contains duplicate UUID values`);
  }

  if (codes.size !== rows.length) {
    throw new Error(`${entity} contains duplicate code values`);
  }
}

function assertTimestampsUnchanged(
  first: ReferenceDatabaseSnapshot,
  second: ReferenceDatabaseSnapshot,
): void {
  for (const [entity, firstTimestamps] of first.timestampsByEntity) {
    const secondTimestamps = second.timestampsByEntity.get(entity);

    if (secondTimestamps === undefined) {
      throw new Error(`Second snapshot does not contain ${entity}`);
    }

    if (secondTimestamps !== firstTimestamps) {
      throw new Error(`${entity} updatedAt values changed during the second seed run`);
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown reference seed test error";

  console.error(`Reference seed idempotency test failed: ${message}`);

  process.exitCode = 1;
});
