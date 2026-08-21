import assert from "node:assert/strict";
import test from "node:test";

import type { FinalProductsDocument } from "../../../scripts/usda/src/final-product-types.js";

import type { UsdaCatalogManifest } from "./types.js";
import { validateUsdaCatalogDocument } from "./validate.js";

const manifest: UsdaCatalogManifest = {
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

function buildDocument(): FinalProductsDocument {
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
        fdcId: 100,
        nameEn: "Apple",
        nameUa: "Яблуко",
        categoryId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        categoryCode: "fruits",
        defaultMeasurementUnitId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        defaultMeasurementUnitCode: "g",
        preparationMethod: "RAW",
        foodState: "RAW",
        modifiersEn: [],
        modifiersUa: [],
        unclassifiedParts: [],
        nutrients: [
          {
            nutrientId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            nutrientCode: "energy_kcal",
            valuePer100g: 52,
            valueType: "ANALYTICAL",
            source: {
              usdaNutrientId: 1008,
              rowId: "nutrient-1",
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
              rowId: "portion-1",
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
          fdcId: 100,
          dataset: "FOUNDATION_FOOD",
          dataType: "foundation_food",
          originalDescription: "Apple",
          foodCategoryExternalId: "9",
          publicationDate: "2026-01-01",
          ndbNumber: null,
        },
      },
    ],
  };
}

test("accepts an import-ready localized USDA document", () => {
  assert.doesNotThrow(() => validateUsdaCatalogDocument(manifest, buildDocument()));
});

test("rejects fields that exceed the Prisma schema limit", () => {
  const document = buildDocument();
  const product = document.products[0];

  assert.ok(product);

  const invalidDocument: FinalProductsDocument = {
    ...document,
    products: [{ ...product, nameUa: "а".repeat(241) }],
  };

  assert.throws(() => validateUsdaCatalogDocument(manifest, invalidDocument), /outside 1\.\.240/);
});
