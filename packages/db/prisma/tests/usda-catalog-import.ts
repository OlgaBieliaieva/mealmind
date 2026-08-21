import { config as loadEnvironment } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createDatabaseClient } from "../../src/client.js";
import type { FinalProductsDocument } from "../../scripts/usda/src/final-product-types.js";

import { cleanupLocalUsdaCatalog, importUsdaCatalog } from "../seeds/catalog/run.js";
import type { UsdaCatalogManifest } from "../seeds/catalog/types.js";
import { MEASUREMENT_UNITS, NUTRIENTS, PRODUCT_CATEGORIES } from "../seeds/reference/data/index.js";
import { seedReferenceData } from "../seeds/reference/run.js";
import { deployMigrations } from "./helpers/prisma-migrations.js";
import { recreateTestDatabase, resolveTestDatabaseTarget } from "./helpers/test-database.js";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, "../../../..");

loadEnvironment({ path: resolve(repositoryRoot, ".env") });

async function main(): Promise<void> {
  const target = resolveTestDatabaseTarget(process.env);

  console.info(`Recreating isolated USDA catalog test database ${target.databaseName}...`);
  await recreateTestDatabase(target);
  await deployMigrations(target);

  const database = createDatabaseClient({
    connectionString: target.connectionString,
    log: ["error"],
  });

  try {
    await seedReferenceData(database);

    const manifest = buildManifest();
    const document = buildDocument();
    const first = await importUsdaCatalog({ database, manifest, document, batchSize: 1 });

    assertEqual("first import created", first.productsCreated, 1);
    assertEqual("first import updated", first.productsUpdated, 0);
    await assertCatalogState(database, "Яблуко тестове");

    const updatedDocument: FinalProductsDocument = {
      ...document,
      products: document.products.map((product) => ({
        ...product,
        nameUa: "Яблуко тестове оновлене",
      })),
    };
    const second = await importUsdaCatalog({
      database,
      manifest,
      document: updatedDocument,
      batchSize: 1,
    });

    assertEqual("second import created", second.productsCreated, 0);
    assertEqual("second import updated", second.productsUpdated, 1);
    await assertCatalogState(database, "Яблуко тестове оновлене");

    const cleanup = await cleanupLocalUsdaCatalog(database);

    assertEqual("cleanup deleted", cleanup.productsDeleted, 1);
    assertEqual("products after cleanup", await database.product.count(), 0);
    assertEqual("sources after cleanup", await database.productSourceReference.count(), 0);
    assertEqual("nutrients after cleanup", await database.productNutrient.count(), 0);
    assertEqual("portions after cleanup", await database.productPortion.count(), 0);

    console.info("USDA catalog import integration test passed.");
  } finally {
    await database.$disconnect();
  }
}

async function assertCatalogState(
  database: ReturnType<typeof createDatabaseClient>,
  expectedNameUa: string,
): Promise<void> {
  assertEqual("products", await database.product.count(), 1);
  assertEqual("sources", await database.productSourceReference.count(), 1);
  assertEqual("nutrients", await database.productNutrient.count(), 1);
  assertEqual("portions", await database.productPortion.count(), 1);

  const product = await database.product.findFirstOrThrow({
    include: { sourceReferences: true },
  });

  assertEqual("nameUa", product.nameUa, expectedNameUa);
  assertEqual("type", product.type, "GENERIC");
  assertEqual("status", product.status, "ACTIVE");
  assertEqual("verificationStatus", product.verificationStatus, "UNVERIFIED");
  assertEqual(
    "sourceRelease",
    product.sourceReferences[0]?.sourceRelease.toISOString().slice(0, 10),
    "2026-08-21",
  );
}

function buildManifest(): UsdaCatalogManifest {
  return {
    schemaVersion: 1,
    catalog: "usda-foundation-sr-legacy",
    sourceRelease: "2026-08-21",
    sourceFile: "scripts/usda/data/output/final-products.json",
    sourceFileSha256: "0".repeat(64),
    sourceFileSizeBytes: 1,
    statistics: { products: 1, nutrientValues: 1, portions: 1 },
    importPolicy: {
      productType: "GENERIC",
      productStatus: "ACTIVE",
      verificationStatus: "UNVERIFIED",
    },
  };
}

function buildDocument(): FinalProductsDocument {
  const category = findReference(PRODUCT_CATEGORIES, "fruits");
  const gram = findReference(MEASUREMENT_UNITS, "g");
  const energy = findReference(NUTRIENTS, "energy_kcal");

  return {
    schemaVersion: 1,
    sourceSchemaVersion: 1,
    statistics: {
      inputProductsTotal: 1,
      outputProductsTotal: 1,
      translatedProducts: 1,
      untranslatedProducts: 0,
      modifiersTotal: 0,
      translatedModifiers: 0,
      untranslatedModifiers: 0,
      portionsTotal: 1,
      translatedPortions: 1,
      untranslatedPortions: 0,
      nutrientValuesTotal: 1,
      productsWithPortions: 1,
      productsWithoutPortions: 0,
    },
    products: [
      {
        fdcId: 999_000_001,
        nameEn: "Test apple",
        nameUa: "Яблуко тестове",
        categoryId: category.id,
        categoryCode: category.code,
        defaultMeasurementUnitId: gram.id,
        defaultMeasurementUnitCode: "g",
        preparationMethod: "RAW",
        foodState: "RAW",
        modifiersEn: [],
        modifiersUa: [],
        unclassifiedParts: [],
        nutrients: [
          {
            nutrientId: energy.id,
            nutrientCode: energy.code,
            valuePer100g: 52,
            valueType: "ANALYTICAL",
            source: {
              usdaNutrientId: 1008,
              rowId: "test-nutrient-1",
              derivationExternalId: null,
              dataPoints: 1,
            },
          },
        ],
        portions: [
          {
            amount: 1,
            gramWeight: 100,
            labelEn: "piece",
            labelUa: "штука",
            kind: "COUNT",
            weightType: "UNKNOWN",
            measurementUnitId: null,
            measurementUnitCode: null,
            source: {
              rowId: "test-portion-1",
              sequence: 1,
              measurementUnitExternalId: "9999",
              measurementUnitName: null,
              modifier: null,
              portionDescription: null,
              dataPoints: 1,
            },
          },
        ],
        source: {
          provider: "USDA",
          fdcId: 999_000_001,
          dataset: "FOUNDATION_FOOD",
          dataType: "foundation_food",
          originalDescription: "Test apple",
          foodCategoryExternalId: "9",
          publicationDate: "2026-01-01",
          ndbNumber: null,
        },
      },
    ],
  };
}

function findReference<Row extends { readonly id: string; readonly code: string }>(
  rows: readonly Row[],
  code: string,
): Row {
  const row = rows.find((candidate) => candidate.code === code);

  if (!row) {
    throw new Error(`Missing test reference ${code}.`);
  }

  return row;
}

function assertEqual(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}.`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown USDA catalog test error";

  console.error(`USDA catalog import integration test failed: ${message}`);
  process.exitCode = 1;
});
