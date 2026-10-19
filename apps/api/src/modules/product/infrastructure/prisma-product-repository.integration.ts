import assert from "node:assert/strict";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";

import { createDatabaseClient } from "@mealmind/db";

import { ProductConflictError } from "../application/product-errors.js";
import { findEffectiveProductNutrients } from "./effective-product-nutrients.js";
import { createPrismaProductRepository } from "./prisma-product-repository.js";

try {
  loadEnvFile(resolve(process.cwd(), "../../.env"));
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
}

const connectionString = requireSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL);
const database = createDatabaseClient({ connectionString, log: ["error"] });
const repository = createPrismaProductRepository(database);
const createdProductIds: string[] = [];
let brandId: string | undefined;
let verifierId: string | undefined;
const adminSource = {
  provider: "MEALMIND_ADMIN",
  dataset: "ADMIN_CATALOG",
  sourceRelease: new Date("2026-09-18"),
} as const;

try {
  const [category, unit, nutrient, characteristic] = await Promise.all([
    database.productCategory.findFirstOrThrow({ where: { isAssignable: true, isActive: true } }),
    database.measurementUnit.findFirstOrThrow({ where: { isActive: true } }),
    database.nutrient.findFirstOrThrow({ where: { isActive: true } }),
    database.productFoodCharacteristic.findFirstOrThrow({ where: { code: "frozen" } }),
  ]);
  const brand = await database.brand.create({
    data: { name: `Integration Brand ${crypto.randomUUID()}`, status: "ACTIVE" },
  });
  brandId = brand.id;
  const verifier = await database.user.create({
    data: {
      externalSubject: crypto.randomUUID(),
      email: `product-verifier-${crypto.randomUUID()}@example.test`,
      applicationRole: "ADMIN",
    },
  });
  verifierId = verifier.id;

  const generic = await repository.create({
    type: "GENERIC",
    nameEn: `Integration Apple ${crypto.randomUUID()}`,
    categoryId: category.id,
    defaultMeasurementUnitId: unit.id,
    foodState: "RAW",
    characteristicIds: [characteristic.id],
    ediblePortionPercent: "95",
    status: "ACTIVE",
    nutrients: [{ nutrientId: nutrient.id, valuePer100g: "1.25", valueType: "ANALYTICAL" }],
    portions: [
      {
        amount: "1",
        gramWeight: "100",
        labelEn: "serving",
        kind: "SERVING",
        weightType: "MEASURED",
        measurementUnitId: unit.id,
        isDefault: true,
        isActive: true,
        sortOrder: 0,
      },
    ],
    source: adminSource,
  });
  createdProductIds.push(generic.id);
  assert.deepEqual(
    generic.foodCharacteristics.map((item) => item.code),
    ["frozen"],
  );
  assert.equal(generic.foodCharacteristics[0]?.source, "MANUAL");

  const updatedWithoutRelations = await repository.update(generic.id, {
    notes: "updated",
    verificationStatus: "VERIFIED",
    verifiedByUserId: verifier.id,
    verifiedAt: new Date("2026-10-19T12:00:00.000Z"),
  });
  assert.equal(updatedWithoutRelations?.nutrients.length, 1);
  assert.equal(updatedWithoutRelations?.portions.length, 1);
  assert.equal(updatedWithoutRelations?.verificationStatus, "VERIFIED");
  assert.deepEqual(
    updatedWithoutRelations?.foodCharacteristics.map((item) => item.code),
    ["frozen"],
  );

  const explicitlyCleared = await repository.update(generic.id, { nutrients: [] });
  assert.equal(explicitlyCleared?.nutrients.length, 0);
  assert.equal(explicitlyCleared?.portions.length, 1);

  const characteristicsCleared = await repository.update(generic.id, { characteristicIds: [] });
  assert.equal(characteristicsCleared?.foodCharacteristics.length, 0);

  const restoredGenericNutrients = await repository.update(generic.id, {
    nutrients: [{ nutrientId: nutrient.id, valuePer100g: "2.5", valueType: "ANALYTICAL" }],
  });
  assert.equal(restoredGenericNutrients?.nutrients[0]?.valuePer100g, "2.5");

  const gtin = String(Date.now()).slice(-12).padStart(14, "0");
  const branded = await repository.create({
    type: "BRANDED",
    nameEn: "Integration branded apple",
    gtin,
    categoryId: category.id,
    brandId: brand.id,
    defaultMeasurementUnitId: unit.id,
    baseProductId: generic.id,
    foodState: "RAW",
    status: "DRAFT",
    nutrients: [],
    portions: [],
    source: adminSource,
  });
  createdProductIds.push(branded.id);
  assert.equal(branded.sourceProvider, "MEALMIND_ADMIN");
  assert.equal(branded.sourceDataset, "ADMIN_CATALOG");
  assert.equal(branded.ownNutrients.length, 0);
  assert.equal(branded.nutrients.length, 1);
  assert.equal(branded.nutrients[0]?.valuePer100g, "2.5");
  assert.equal(branded.nutrients[0]?.valueType, "ESTIMATED");
  assert.equal(branded.nutrients[0]?.origin, "BASE_PRODUCT");

  await repository.update(generic.id, {
    nutrients: [{ nutrientId: nutrient.id, valuePer100g: "3.75", valueType: "ANALYTICAL" }],
  });
  const brandedAfterBaseUpdate = await repository.findById(branded.id);
  assert.equal(brandedAfterBaseUpdate?.nutrients[0]?.valuePer100g, "3.75");
  assert.equal(brandedAfterBaseUpdate?.ownNutrients.length, 0);
  const effectiveNutrients = await findEffectiveProductNutrients(database, [branded.id]);
  assert.equal(effectiveNutrients[0]?.valuePer100g.toString(), "3.75");
  assert.equal(effectiveNutrients[0]?.origin, "BASE_PRODUCT");

  const createdDefaultPackage = await database.productPackage.findFirstOrThrow({
    where: { productId: branded.id, isDefault: true, status: { not: "ARCHIVED" } },
  });
  assert.equal(createdDefaultPackage.gtin, gtin);
  assert.equal(createdDefaultPackage.kind, "UNSPECIFIED");
  assert.equal(createdDefaultPackage.status, "DRAFT");

  await assert.rejects(
    repository.create({
      type: "BRANDED",
      nameEn: "Duplicate barcode",
      gtin,
      categoryId: category.id,
      brandId: brand.id,
      defaultMeasurementUnitId: unit.id,
      baseProductId: generic.id,
      foodState: "RAW",
      status: "DRAFT",
      nutrients: [],
      portions: [],
      source: adminSource,
    }),
    ProductConflictError,
  );

  const updatedGtin = String(Date.now() + 1)
    .slice(-12)
    .padStart(14, "0");
  const updatedBranded = await repository.update(branded.id, { gtin: updatedGtin });
  assert.equal(updatedBranded?.gtin, updatedGtin);

  const updatedDefaultPackage = await database.productPackage.findUniqueOrThrow({
    where: { id: createdDefaultPackage.id },
  });
  assert.equal(updatedDefaultPackage.gtin, updatedGtin);

  const clearedBranded = await repository.update(branded.id, { gtin: null });
  assert.equal(clearedBranded?.gtin, null);

  const clearedDefaultPackage = await database.productPackage.findUniqueOrThrow({
    where: { id: createdDefaultPackage.id },
  });
  assert.equal(clearedDefaultPackage.gtin, null);

  await repository.update(branded.id, { gtin: updatedGtin });
  await repository.updateStatus(branded.id, "ARCHIVED");
  const archivedGtin = String(Date.now() + 2)
    .slice(-12)
    .padStart(14, "0");
  await repository.update(branded.id, { gtin: archivedGtin });

  const archivedDefaultPackage = await database.productPackage.findUniqueOrThrow({
    where: { id: createdDefaultPackage.id },
  });
  assert.equal(archivedDefaultPackage.gtin, archivedGtin);
  assert.equal(archivedDefaultPackage.status, "ARCHIVED");
  assert.ok(archivedDefaultPackage.archivedAt instanceof Date);

  await repository.updateStatus(branded.id, "DRAFT");

  const restoredDefaultPackage = await database.productPackage.findUniqueOrThrow({
    where: { id: createdDefaultPackage.id },
  });
  assert.equal(restoredDefaultPackage.status, "DRAFT");
  assert.equal(restoredDefaultPackage.archivedAt, null);

  const activeSearchTerm = `Selector-${crypto.randomUUID()}`;

  const searchableActive = await repository.create({
    type: "GENERIC",
    nameEn: `${activeSearchTerm} Active`,
    nameUa: `${activeSearchTerm} Активний`,
    categoryId: category.id,
    defaultMeasurementUnitId: unit.id,
    foodState: "RAW",
    status: "ACTIVE",
    nutrients: [],
    portions: [],
    source: adminSource,
  });
  createdProductIds.push(searchableActive.id);

  const searchableDraft = await repository.create({
    type: "GENERIC",
    nameEn: `${activeSearchTerm} Draft`,
    nameUa: `${activeSearchTerm} Чернетка`,
    categoryId: category.id,
    defaultMeasurementUnitId: unit.id,
    foodState: "RAW",
    status: "DRAFT",
    nutrients: [],
    portions: [],
    source: adminSource,
  });
  createdProductIds.push(searchableDraft.id);

  const searchableArchived = await repository.create({
    type: "GENERIC",
    nameEn: `${activeSearchTerm} Archived`,
    nameUa: `${activeSearchTerm} Архівний`,
    categoryId: category.id,
    defaultMeasurementUnitId: unit.id,
    foodState: "RAW",
    status: "ARCHIVED",
    nutrients: [],
    portions: [],
    source: adminSource,
  });
  createdProductIds.push(searchableArchived.id);

  const searchPage = await repository.searchActive({
    search: activeSearchTerm,
    page: 1,
    pageSize: 20,
  });

  assert.equal(searchPage.total, 1);
  assert.equal(searchPage.items.length, 1);
  assert.deepEqual(searchPage.items[0], {
    id: searchableActive.id,
    name: searchableActive.nameUa ?? searchableActive.nameEn,
    type: searchableActive.type,
    categoryName: searchableActive.categoryName,
    brandName: searchableActive.brandName,
    foodState: searchableActive.foodState,
    foodCharacteristics: searchableActive.foodCharacteristics,
  });

  const page = await repository.list({ search: "Integration", page: 1, pageSize: 1 });
  assert.equal(page.items.length, 1);
  assert.ok(page.total >= 2);

  const verifiedPage = await repository.list({ search: generic.nameEn, page: 1, pageSize: 20 });
  assert.equal(
    verifiedPage.items.find((item) => item.id === generic.id)?.verificationStatus,
    "VERIFIED",
  );

  console.info("Product repository PostgreSQL integration test passed.");
} finally {
  if (createdProductIds.length > 0) {
    await database.product.deleteMany({ where: { id: { in: createdProductIds } } });
  }
  if (brandId !== undefined) await database.brand.deleteMany({ where: { id: brandId } });
  if (verifierId !== undefined) await database.user.deleteMany({ where: { id: verifierId } });
  await database.$disconnect();
}

function requireSafeTestDatabaseUrl(rawValue: string | undefined): string {
  if (rawValue === undefined) throw new Error("TEST_DATABASE_URL is required");
  const url = new URL(rawValue);
  const allowedHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ""));

  if (
    !allowedHosts.has(url.hostname) ||
    url.port !== "54322" ||
    databaseName !== "mealmind_test" ||
    url.searchParams.has("schema")
  ) {
    throw new Error("Product repository test may use only local mealmind_test on port 54322");
  }
  return url.toString();
}
