import assert from "node:assert/strict";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";

import { createDatabaseClient } from "@mealmind/db";

import { ProductConflictError } from "../application/product-errors.js";
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

try {
  const [category, unit, nutrient] = await Promise.all([
    database.productCategory.findFirstOrThrow({ where: { isAssignable: true, isActive: true } }),
    database.measurementUnit.findFirstOrThrow({ where: { isActive: true } }),
    database.nutrient.findFirstOrThrow({ where: { isActive: true } }),
  ]);
  const brand = await database.brand.create({
    data: { name: `Integration Brand ${crypto.randomUUID()}`, status: "ACTIVE" },
  });
  brandId = brand.id;

  const generic = await repository.create({
    type: "GENERIC",
    nameEn: `Integration Apple ${crypto.randomUUID()}`,
    categoryId: category.id,
    defaultMeasurementUnitId: unit.id,
    foodState: "RAW",
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
  });
  createdProductIds.push(generic.id);

  const updatedWithoutRelations = await repository.update(generic.id, { notes: "updated" });
  assert.equal(updatedWithoutRelations?.nutrients.length, 1);
  assert.equal(updatedWithoutRelations?.portions.length, 1);

  const explicitlyCleared = await repository.update(generic.id, { nutrients: [] });
  assert.equal(explicitlyCleared?.nutrients.length, 0);
  assert.equal(explicitlyCleared?.portions.length, 1);

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
  });
  createdProductIds.push(branded.id);

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
    }),
    ProductConflictError,
  );

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
  });

  const page = await repository.list({ search: "Integration", page: 1, pageSize: 1 });
  assert.equal(page.items.length, 1);
  assert.ok(page.total >= 2);

  console.info("Product repository PostgreSQL integration test passed.");
} finally {
  if (createdProductIds.length > 0) {
    await database.product.deleteMany({ where: { id: { in: createdProductIds } } });
  }
  if (brandId !== undefined) await database.brand.deleteMany({ where: { id: brandId } });
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
