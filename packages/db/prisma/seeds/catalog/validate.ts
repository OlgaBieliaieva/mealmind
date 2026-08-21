import type { DatabaseClient } from "../../../src/client.js";
import { validateFinalProducts } from "../../../scripts/usda/src/validate-final-products.js";
import type { FinalProductsDocument } from "../../../scripts/usda/src/final-product-types.js";

import type { UsdaCatalogManifest } from "./types.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FOOD_STATES = new Set(["UNSPECIFIED", "RAW", "COOKED", "PROCESSED", "READY_TO_EAT"]);
const DATASETS = new Set(["FOUNDATION_FOOD", "SR_LEGACY"]);
const VALUE_TYPES = new Set([
  "ANALYTICAL",
  "DERIVED",
  "ESTIMATED",
  "CALCULATED",
  "LABEL",
  "UNKNOWN",
]);
const PORTION_KINDS = new Set(["MASS", "VOLUME", "COUNT", "OTHER"]);
const WEIGHT_TYPES = new Set(["ANALYTICAL", "DERIVED", "ESTIMATED", "LABEL", "UNKNOWN"]);

interface ReferenceIdentity {
  readonly id: string;
  readonly code: string;
}

export function validateUsdaCatalogDocument(
  manifest: UsdaCatalogManifest,
  document: FinalProductsDocument,
): void {
  const audit = validateFinalProducts(document);
  const auditProblems =
    audit.productsWithoutNameEn +
    audit.productsWithoutNameUa +
    audit.productsWithoutEnergy +
    audit.invalidModifierTranslations +
    audit.invalidPortionTranslations +
    audit.invalidNutrientValues +
    audit.invalidPortionValues +
    audit.statisticsProblems;

  if (audit.distinctFdcIds !== audit.productsTotal || auditProblems !== 0) {
    throw new Error(`USDA final dataset audit failed with ${auditProblems} problem(s).`);
  }

  if (
    manifest.statistics.products !== audit.productsTotal ||
    manifest.statistics.nutrientValues !== audit.nutrientValuesTotal ||
    manifest.statistics.portions !== audit.portionsTotal
  ) {
    throw new Error("USDA catalog statistics do not match the manifest.");
  }

  const globalSourceRows = new Set<string>();

  for (const product of document.products) {
    assertStringLength(product.nameEn, 1, 240, `USDA product ${product.fdcId} nameEn`);
    assertStringLength(product.nameUa, 1, 240, `USDA product ${product.fdcId} nameUa`);
    assertUuid(product.categoryId, `USDA product ${product.fdcId} categoryId`);
    assertUuid(
      product.defaultMeasurementUnitId,
      `USDA product ${product.fdcId} defaultMeasurementUnitId`,
    );

    if (!FOOD_STATES.has(product.foodState)) {
      throw new Error(`USDA product ${product.fdcId} has unsupported foodState.`);
    }

    if (product.source.provider !== "USDA" || !DATASETS.has(product.source.dataset)) {
      throw new Error(`USDA product ${product.fdcId} has unsupported source identity.`);
    }

    if (product.source.publicationDate !== null && !isIsoDate(product.source.publicationDate)) {
      throw new Error(`USDA product ${product.fdcId} has invalid publicationDate.`);
    }

    const nutrientIds = new Set<string>();

    for (const nutrient of product.nutrients) {
      assertUuid(nutrient.nutrientId, `USDA product ${product.fdcId} nutrientId`);

      if (!VALUE_TYPES.has(nutrient.valueType)) {
        throw new Error(`USDA product ${product.fdcId} has unsupported nutrient valueType.`);
      }

      if (nutrientIds.has(nutrient.nutrientId)) {
        throw new Error(
          `USDA product ${product.fdcId} contains duplicate nutrient ${nutrient.nutrientId}.`,
        );
      }

      nutrientIds.add(nutrient.nutrientId);
      assertSourceRowUnique(globalSourceRows, product, nutrient.source.rowId, "nutrient");
    }

    for (const [index, portion] of product.portions.entries()) {
      assertStringLength(portion.labelEn, 1, 200, `USDA product ${product.fdcId} portion labelEn`);
      assertStringLength(portion.labelUa, 1, 200, `USDA product ${product.fdcId} portion labelUa`);

      if (!PORTION_KINDS.has(portion.kind) || !WEIGHT_TYPES.has(portion.weightType)) {
        throw new Error(`USDA product ${product.fdcId} portion ${index} has unsupported enums.`);
      }

      if (portion.measurementUnitId !== null) {
        assertUuid(
          portion.measurementUnitId,
          `USDA product ${product.fdcId} portion measurementUnitId`,
        );
      }

      if (portion.source.measurementUnitExternalId === null) {
        throw new Error(
          `USDA product ${product.fdcId} portion ${index} has incomplete source metadata.`,
        );
      }

      assertSourceRowUnique(globalSourceRows, product, portion.source.rowId, "portion");
    }
  }
}

export async function validateUsdaCatalogReferences(
  database: DatabaseClient,
  document: FinalProductsDocument,
): Promise<void> {
  const expectedCategories = collectReferences(
    document.products.map((product) => ({ id: product.categoryId, code: product.categoryCode })),
    "ProductCategory",
  );
  const expectedNutrients = collectReferences(
    document.products.flatMap((product) =>
      product.nutrients.map((nutrient) => ({
        id: nutrient.nutrientId,
        code: nutrient.nutrientCode,
      })),
    ),
    "Nutrient",
  );
  const expectedUnits = collectReferences(
    document.products.flatMap((product) => [
      {
        id: product.defaultMeasurementUnitId,
        code: product.defaultMeasurementUnitCode,
      },
      ...product.portions.flatMap((portion) =>
        portion.measurementUnitId && portion.measurementUnitCode
          ? [{ id: portion.measurementUnitId, code: portion.measurementUnitCode }]
          : [],
      ),
    ]),
    "MeasurementUnit",
  );

  const [categories, nutrients, units] = await Promise.all([
    database.productCategory.findMany({
      where: { id: { in: [...expectedCategories.keys()] } },
      select: { id: true, code: true, isActive: true, isAssignable: true },
    }),
    database.nutrient.findMany({
      where: { id: { in: [...expectedNutrients.keys()] } },
      select: { id: true, code: true, isActive: true },
    }),
    database.measurementUnit.findMany({
      where: { id: { in: [...expectedUnits.keys()] } },
      select: { id: true, code: true, isActive: true },
    }),
  ]);

  assertDatabaseReferences(
    "ProductCategory",
    expectedCategories,
    categories.map((row) => ({ ...row, usable: row.isActive && row.isAssignable })),
  );
  assertDatabaseReferences(
    "Nutrient",
    expectedNutrients,
    nutrients.map((row) => ({ ...row, usable: row.isActive })),
  );
  assertDatabaseReferences(
    "MeasurementUnit",
    expectedUnits,
    units.map((row) => ({ ...row, usable: row.isActive })),
  );
}

function collectReferences(
  references: readonly ReferenceIdentity[],
  entity: string,
): ReadonlyMap<string, string> {
  const result = new Map<string, string>();

  for (const reference of references) {
    const existingCode = result.get(reference.id);

    if (existingCode && existingCode !== reference.code) {
      throw new Error(`${entity} ${reference.id} has conflicting codes in USDA catalog.`);
    }

    result.set(reference.id, reference.code);
  }

  return result;
}

function assertDatabaseReferences(
  entity: string,
  expected: ReadonlyMap<string, string>,
  actual: readonly (ReferenceIdentity & { readonly usable: boolean })[],
): void {
  const actualById = new Map(actual.map((row) => [row.id, row]));

  for (const [id, code] of expected) {
    const row = actualById.get(id);

    if (!row) {
      throw new Error(`${entity} reference ${code} (${id}) is missing. Run reference seed first.`);
    }

    if (row.code !== code) {
      throw new Error(`${entity} reference ${id} expected code ${code}, received ${row.code}.`);
    }

    if (!row.usable) {
      throw new Error(`${entity} reference ${code} (${id}) cannot be used by USDA import.`);
    }
  }
}

function assertSourceRowUnique(
  rows: Set<string>,
  product: FinalProductsDocument["products"][number],
  rowId: string | null,
  kind: "nutrient" | "portion",
): void {
  if (rowId === null) {
    return;
  }

  const key = `${product.source.dataset}:${product.fdcId}:${kind}:${rowId}`;

  if (rows.has(key)) {
    throw new Error(`USDA product ${product.fdcId} contains duplicate ${kind} row ${rowId}.`);
  }

  rows.add(key);
}

function assertStringLength(value: string, minimum: number, maximum: number, label: string): void {
  const length = value.trim().length;

  if (length < minimum || length > maximum) {
    throw new Error(`${label} length ${length} is outside ${minimum}..${maximum}.`);
  }
}

function assertUuid(value: string, label: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`${label} must be a UUID.`);
  }
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}
