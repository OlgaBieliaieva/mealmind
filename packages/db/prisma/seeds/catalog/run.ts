import { v5 as uuidV5 } from "uuid";

import type { DatabaseClient } from "../../../src/client.js";
import type { FinalProduct } from "../../../scripts/usda/src/final-product-types.js";

import type {
  UsdaCatalogCleanupReport,
  UsdaCatalogImportReport,
  UsdaCatalogManifest,
} from "./types.js";
import { validateUsdaCatalogDocument, validateUsdaCatalogReferences } from "./validate.js";

const USDA_UUID_NAMESPACE = "bc9d6d1a-12e2-47e9-9f0e-483b1682cf19";
const DEFAULT_BATCH_SIZE = 50;

interface ImportUsdaCatalogOptions {
  readonly database: DatabaseClient;
  readonly manifest: UsdaCatalogManifest;
  readonly document: Parameters<typeof validateUsdaCatalogDocument>[1];
  readonly dryRun?: boolean;
  readonly batchSize?: number;
}

interface ExistingSourceReference {
  readonly id: string;
  readonly productId: string;
  readonly dataset: "FOUNDATION_FOOD" | "SR_LEGACY";
  readonly externalId: string;
}

export async function importUsdaCatalog(
  options: ImportUsdaCatalogOptions,
): Promise<UsdaCatalogImportReport> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;

  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
    throw new Error("USDA import batchSize must be an integer between 1 and 500.");
  }

  validateUsdaCatalogDocument(options.manifest, options.document);
  await validateUsdaCatalogReferences(options.database, options.document);

  const existingReferences = await options.database.productSourceReference.findMany({
    where: { provider: "USDA" },
    select: {
      id: true,
      productId: true,
      dataset: true,
      externalId: true,
    },
  });
  const existingBySourceIdentity = new Map(
    existingReferences.map((reference) => [sourceIdentity(reference), reference]),
  );

  await assertNoProductIdentityConflicts(
    options.database,
    options.document.products,
    existingBySourceIdentity,
  );

  const productsCreated = options.document.products.filter(
    (product) => !existingBySourceIdentity.has(sourceIdentity(product.source)),
  ).length;
  const productsUpdated = options.document.products.length - productsCreated;
  const batches = Math.ceil(options.document.products.length / batchSize);

  if (!options.dryRun) {
    for (let offset = 0; offset < options.document.products.length; offset += batchSize) {
      const batch = options.document.products.slice(offset, offset + batchSize);

      await importBatch(options.database, batch, options.manifest, existingBySourceIdentity);
    }
  }

  return {
    dryRun: options.dryRun ?? false,
    productsTotal: options.document.products.length,
    productsCreated,
    productsUpdated,
    nutrientValues: options.document.statistics.nutrientValuesTotal,
    portions: options.document.statistics.portionsTotal,
    batches,
  };
}

export async function cleanupLocalUsdaCatalog(
  database: DatabaseClient,
): Promise<UsdaCatalogCleanupReport> {
  const references = await database.productSourceReference.findMany({
    where: { provider: "USDA" },
    select: { productId: true },
  });
  const productIds = [...new Set(references.map((reference) => reference.productId))];

  if (productIds.length === 0) {
    return { productsDeleted: 0 };
  }

  const result = await database.product.deleteMany({
    where: { id: { in: productIds } },
  });

  return { productsDeleted: result.count };
}

async function importBatch(
  database: DatabaseClient,
  products: readonly FinalProduct[],
  manifest: UsdaCatalogManifest,
  existingBySourceIdentity: ReadonlyMap<string, ExistingSourceReference>,
): Promise<void> {
  const sourceRelease = parseDate(manifest.sourceRelease, "sourceRelease");
  const contexts = products.map((product) => {
    const existingReference = existingBySourceIdentity.get(sourceIdentity(product.source));

    return {
      product,
      productId: existingReference?.productId ?? productDatabaseId(product),
      sourceReferenceId: existingReference?.id ?? sourceReferenceDatabaseId(product),
    };
  });

  await database.$transaction(
    async (transaction) => {
      for (const { product, productId, sourceReferenceId } of contexts) {
        await transaction.product.upsert({
          where: { id: productId },
          create: {
            id: productId,
            type: manifest.importPolicy.productType,
            nameEn: product.nameEn,
            nameUa: product.nameUa,
            categoryId: product.categoryId,
            defaultMeasurementUnitId: product.defaultMeasurementUnitId,
            foodState: product.foodState,
            status: manifest.importPolicy.productStatus,
            verificationStatus: manifest.importPolicy.verificationStatus,
          },
          update: {
            type: manifest.importPolicy.productType,
            nameEn: product.nameEn,
            nameUa: product.nameUa,
            categoryId: product.categoryId,
            defaultMeasurementUnitId: product.defaultMeasurementUnitId,
            foodState: product.foodState,
            status: manifest.importPolicy.productStatus,
            verificationStatus: manifest.importPolicy.verificationStatus,
            archivedAt: null,
          },
        });

        await transaction.productSourceReference.upsert({
          where: {
            provider_dataset_externalId: {
              provider: "USDA",
              dataset: product.source.dataset,
              externalId: String(product.fdcId),
            },
          },
          create: {
            id: sourceReferenceId,
            productId,
            provider: "USDA",
            dataset: product.source.dataset,
            externalId: String(product.fdcId),
            sourceRelease,
            publicationDate: nullableDate(product.source.publicationDate, "publicationDate"),
            isPrimary: true,
          },
          update: {
            sourceRelease,
            publicationDate: nullableDate(product.source.publicationDate, "publicationDate"),
            isPrimary: true,
          },
        });
      }

      const productIds = contexts.map((context) => context.productId);

      await transaction.productNutrient.deleteMany({ where: { productId: { in: productIds } } });
      await transaction.productPortion.deleteMany({ where: { productId: { in: productIds } } });

      const nutrientValues = contexts.flatMap(({ product, productId, sourceReferenceId }) =>
        product.nutrients.map((nutrient) => ({
          productId,
          nutrientId: nutrient.nutrientId,
          valuePer100g: nutrient.valuePer100g,
          valueType: nutrient.valueType,
          sourceReferenceId,
          sourceRowId: nutrient.source.rowId,
          sourceNutrientExternalId: String(nutrient.source.usdaNutrientId),
          sourceDerivationExternalId: nutrient.source.derivationExternalId,
          sourceDataPoints: nutrient.source.dataPoints,
        })),
      );

      if (nutrientValues.length > 0) {
        await transaction.productNutrient.createMany({ data: nutrientValues });
      }

      const portions = contexts.flatMap(({ product, productId, sourceReferenceId }) =>
        product.portions.map((portion, index) => ({
          id: portionDatabaseId(product, portion.source.rowId),
          productId,
          amount: portion.amount,
          gramWeight: portion.gramWeight,
          labelEn: portion.labelEn,
          labelUa: portion.labelUa,
          kind: portion.kind,
          weightType: portion.weightType,
          measurementUnitId: portion.measurementUnitId,
          sourceReferenceId,
          sourceRowId: portion.source.rowId,
          sourceSequence: portion.source.sequence,
          sourceMeasurementUnitExternalId: portion.source.measurementUnitExternalId,
          sourceDataPoints: portion.source.dataPoints,
          isDefault: false,
          isActive: true,
          sortOrder: index,
        })),
      );

      if (portions.length > 0) {
        await transaction.productPortion.createMany({ data: portions });
      }
    },
    {
      maxWait: 30_000,
      timeout: 120_000,
    },
  );
}

async function assertNoProductIdentityConflicts(
  database: DatabaseClient,
  products: readonly FinalProduct[],
  existingBySourceIdentity: ReadonlyMap<string, ExistingSourceReference>,
): Promise<void> {
  const newProductIds = products
    .filter((product) => !existingBySourceIdentity.has(sourceIdentity(product.source)))
    .map(productDatabaseId);

  if (newProductIds.length === 0) {
    return;
  }

  const conflicts = await database.product.findMany({
    where: { id: { in: newProductIds } },
    select: { id: true },
  });

  if (conflicts.length > 0) {
    throw new Error(
      `USDA deterministic product identity conflicts with ${conflicts.length} existing product(s).`,
    );
  }
}

function productDatabaseId(product: FinalProduct): string {
  return uuidV5(`product:${sourceIdentity(product.source)}`, USDA_UUID_NAMESPACE);
}

function sourceReferenceDatabaseId(product: FinalProduct): string {
  return uuidV5(`source-reference:${sourceIdentity(product.source)}`, USDA_UUID_NAMESPACE);
}

function portionDatabaseId(product: FinalProduct, sourceRowId: string): string {
  return uuidV5(`portion:${sourceIdentity(product.source)}:${sourceRowId}`, USDA_UUID_NAMESPACE);
}

function sourceIdentity(source: {
  readonly dataset: "FOUNDATION_FOOD" | "SR_LEGACY";
  readonly fdcId?: number;
  readonly externalId?: string;
}): string {
  const externalId = source.externalId ?? String(source.fdcId);

  return `USDA:${source.dataset}:${externalId}`;
}

function nullableDate(value: string | null, label: string): Date | null {
  return value === null ? null : parseDate(value, label);
}

function parseDate(value: string, label: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} must be a valid YYYY-MM-DD date.`);
  }

  return parsed;
}
