import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";

import { createDatabaseClient } from "@mealmind/db";

import type { ProductMediaStorage } from "../../product/domain/product-media-storage.js";
import { parseProductImportPublicationDraft } from "../application/product-import-publication-draft.js";
import { createPrismaProductImportReviewRepository } from "./prisma-product-import-review-repository.js";
import { createPrismaProductImportPublisher } from "./prisma-product-import-publisher.js";
import type { PreparedZakazProductMedia } from "./zakaz-product-media-preparer.js";

try {
  loadEnvFile(resolve(process.cwd(), "../../.env"));
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
}

const database = createDatabaseClient({
  connectionString: requireSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL),
  log: ["error"],
});
const repository = createPrismaProductImportReviewRepository(database);
const sourceSku = "integration-" + randomUUID();
const sourceBrandName = "Zakaz " + sourceSku;
const mediaTimestamp = new Date("2000-01-01T00:00:00.000Z");
const publisher = createPrismaProductImportPublisher(
  database,
  noopStorage(),
  prepareMediaFixture,
  () => mediaTimestamp,
);

try {
  const [category, unit] = await Promise.all([
    database.productCategory.findFirstOrThrow({
      where: { isAssignable: true, isActive: true },
    }),
    database.measurementUnit.findFirstOrThrow({ where: { isActive: true } }),
  ]);
  const admin = await database.user.create({
    data: {
      externalSubject: randomUUID(),
      email: `zakaz-publish-${randomUUID()}@example.test`,
      applicationRole: "ADMIN",
    },
  });
  const brand = await database.brand.create({
    data: {
      name: "Zakaz integration " + randomUUID(),
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
    },
  });
  const batch = await database.productImportBatch.create({
    data: {
      provider: "ZAKAZ",
      dataset: "ZAKAZ_RETAIL_CATALOG",
      artifactSchema: "integration-test",
      manifestChecksum: randomUUID().replaceAll("-", "").padEnd(64, "0").slice(0, 64),
      generatedAt: new Date("2026-10-08T10:00:00Z"),
      sourceLocale: "en",
      localizedLocale: "uk",
      status: "COMPLETED",
      candidateCount: 1,
      reviewRequiredCount: 0,
      rejectedCount: 0,
      totalCount: 1,
      completedAt: new Date("2026-10-08T10:01:00Z"),
    },
  });
  const candidate = await database.productImportCandidate.create({
    data: {
      batchId: batch.id,
      storeExternalId: "48215625",
      sourceSku,
      disposition: "CANDIDATE",
      status: "PENDING",
      reasonCodes: [],
      matchStatus: "MATCHED",
      classificationDecision: "ELIGIBLE",
      normalizedGtin: null,
      sourceFingerprint: randomUUID().replaceAll("-", "").padEnd(64, "0").slice(0, 64),
      sourceCategoryIds: { source: ["milk-metro"], localized: ["milk-metro"] },
      sourceDraft: {},
      reviewDraft: {
        title: "Інтеграційне молоко",
        sourceTitle: "Integration milk",
        brandName: sourceBrandName,
        description: "Перевірено адміністратором",
        package: { kind: "FIXED_MASS", weightG: 950 },
        ingredients: ["Milk"],
        nutritionFacts: {
          ingredient_energy: "53 ккал",
          ingredient_protein: "2.8 г",
          ingredient_fat: "2.5 г",
          ingredient_carbohydrates: "4.7 г",
        },
        shelfLife: "180 діб",
        temperatureRange: "1...25",
        availability: { inStock: false },
        sourceImageUrl: "https://img3.zakaz.ua/integration-product.jpg",
        reviewResolution: { mode: "CREATE_NEW_PRODUCT", targetProductId: null },
        canonical: {
          nameUa: "Інтеграційне молоко",
          nameEn: "Integration milk",
          categoryId: category.id,
          brandId: brand.id,
          defaultMeasurementUnitId: unit.id,
        },
      },
      fieldProvenance: {},
      sourceSnapshots: {},
    },
  });
  const filteredPage = await repository.list({
    brandName: sourceBrandName,
    packageKind: "FIXED_MASS",
    page: 1,
    pageSize: 25,
  });
  assert.equal(filteredPage.total, 1);
  assert.equal(filteredPage.items[0]?.id, candidate.id);
  assert.equal(filteredPage.items[0]?.packageWeightG, 950);

  const pendingDetails = await repository.findById(candidate.id);
  assert.notEqual(pendingDetails, null);

  const activeReview = await repository.mutate({
    id: candidate.id,
    actorUserId: admin.id,
    expectedUpdatedAt: pendingDetails!.updatedAt,
    fromStatus: "PENDING",
    toStatus: "IN_REVIEW",
    action: "REVIEW_STARTED",
    reviewedAt: null,
  });
  assert.notEqual(activeReview, null);
  assert.equal(activeReview!.status, "IN_REVIEW");
  assert.equal(activeReview!.reviewedByUserId, admin.id);
  assert.equal(activeReview!.reviewedAt, null);

  const details = await repository.mutate({
    id: candidate.id,
    actorUserId: admin.id,
    expectedUpdatedAt: activeReview!.updatedAt,
    fromStatus: "IN_REVIEW",
    toStatus: "APPROVED",
    action: "APPROVED",
    reviewedAt: new Date("2026-10-08T11:00:00Z"),
  });
  assert.notEqual(details, null);
  assert.equal(details!.status, "APPROVED");
  assert.equal(details!.reviewedAt, "2026-10-08T11:00:00.000Z");

  const published = await publisher.publish({
    candidate: details!,
    publication: parseProductImportPublicationDraft(details!),
    expectedUpdatedAt: details!.updatedAt,
    actorUserId: admin.id,
  });
  assert.equal(published, true);

  const result = await database.productImportCandidate.findUniqueOrThrow({
    where: { id: candidate.id },
    include: {
      publishedProduct: {
        include: {
          packages: {
            include: {
              sourceReferences: true,
              shelfLifeRules: true,
              ingredientTexts: true,
              portions: true,
            },
          },
          nutrients: { include: { nutrient: true } },
          media: true,
        },
      },
      events: true,
    },
  });
  assert.equal(result.status, "PUBLISHED");
  assert.equal(result.publishedProduct?.status, "ACTIVE");
  assert.equal(result.publishedProduct?.verificationStatus, "UNVERIFIED");
  assert.equal(result.publishedProduct?.packages.length, 1);
  assert.equal(result.publishedProduct?.packages[0]?.sourceReferences[0]?.inStock, false);
  assert.equal(result.publishedProduct?.packages[0]?.ingredientTexts[0]?.statement, "Milk");
  assert.equal(result.publishedProduct?.packages[0]?.shelfLifeRules[0]?.durationUnit, "DAYS");
  assert.equal(result.publishedProduct?.packages[0]?.portions[0]?.gramWeight.toString(), "950");
  assert.equal(result.publishedProduct?.media.length, 1);
  assert.equal(result.publishedProduct?.media[0]?.status, "ACTIVE");
  assert.equal(result.publishedProduct?.media[0]?.sourceUrl, details!.sourceImageUrl);
  assert.equal(
    result.publishedProduct?.media[0]?.createdAt.toISOString(),
    mediaTimestamp.toISOString(),
  );
  assert.equal(
    result.publishedProduct?.media[0]?.verifiedAt?.toISOString(),
    mediaTimestamp.toISOString(),
  );
  assert.deepEqual(result.publishedProduct?.nutrients.map((item) => item.nutrient.code).sort(), [
    "carbohydrate",
    "energy_kcal",
    "protein",
    "total_fat",
  ]);
  assert.deepEqual(
    result.events.map((event) => event.action),
    ["REVIEW_STARTED", "APPROVED", "PUBLISHED"],
  );

  const secondSourceSku = "integration-" + randomUUID();
  const secondCandidate = await database.productImportCandidate.create({
    data: {
      batchId: batch.id,
      storeExternalId: "48215625",
      sourceSku: secondSourceSku,
      disposition: "CANDIDATE",
      status: "APPROVED",
      reasonCodes: [],
      matchStatus: "MATCHED",
      classificationDecision: "ELIGIBLE",
      normalizedGtin: "01234567890123",
      sourceFingerprint: randomUUID().replaceAll("-", "").padEnd(64, "0").slice(0, 64),
      sourceCategoryIds: { source: ["milk-metro"], localized: ["milk-metro"] },
      sourceDraft: {},
      reviewDraft: {
        title: "Інтеграційне молоко, менше пакування",
        sourceTitle: "Integration milk, smaller package",
        brandName: sourceBrandName,
        description: "Друге пакування наявного продукту",
        gtin: { normalized: "01234567890123" },
        package: { kind: "FIXED_MASS", weightG: 500 },
        ingredients: ["Milk"],
        nutritionFacts: {
          ingredient_energy: "53 ккал",
          ingredient_protein: "2.8 г",
          ingredient_fat: "2.5 г",
          ingredient_carbohydrates: "4.7 г",
        },
        availability: { inStock: true },
        reviewResolution: {
          mode: "ADD_PACKAGE_TO_EXISTING_PRODUCT",
          targetProductId: result.publishedProduct!.id,
        },
        canonical: {
          nameUa: "Інтеграційне молоко",
          nameEn: "Integration milk",
        },
      },
      fieldProvenance: {},
      sourceSnapshots: {},
      reviewedByUserId: admin.id,
      reviewedAt: new Date("2026-10-08T12:00:00Z"),
    },
  });
  const secondDetails = await repository.findById(secondCandidate.id);
  assert.notEqual(secondDetails, null);

  const secondPublished = await publisher.publish({
    candidate: secondDetails!,
    publication: parseProductImportPublicationDraft(secondDetails!),
    expectedUpdatedAt: secondDetails!.updatedAt,
    actorUserId: admin.id,
  });
  assert.equal(secondPublished, true);

  const productWithSecondPackage = await database.product.findUniqueOrThrow({
    where: { id: result.publishedProduct!.id },
    include: {
      packages: { orderBy: { createdAt: "asc" } },
      sourceReferences: { orderBy: { createdAt: "asc" } },
    },
  });
  const publishedSecondCandidate = await database.productImportCandidate.findUniqueOrThrow({
    where: { id: secondCandidate.id },
  });
  assert.equal(publishedSecondCandidate.status, "PUBLISHED");
  assert.equal(productWithSecondPackage.packages.length, 2);
  assert.equal(productWithSecondPackage.sourceReferences.length, 2);
  assert.equal(
    productWithSecondPackage.sourceReferences.filter((source) => source.isPrimary).length,
    1,
  );
  assert.equal(
    productWithSecondPackage.sourceReferences.find(
      (source) => source.externalId === `48215625:${secondSourceSku}`,
    )?.isPrimary,
    false,
  );
  console.log("Zakaz product import publication integration test passed.");
} finally {
  // Audit events are append-only and keep RESTRICT references.
  // The database smoke command recreates isolated mealmind_test before this scenario.
  await database.$disconnect();
}

function noopStorage(): ProductMediaStorage {
  return {
    async createUploadUrl() {
      return { uploadUrl: "", token: "" };
    },
    async createReadUrl() {
      return "";
    },
    async read() {
      return Buffer.alloc(0);
    },
    async write() {},
    async remove() {},
  };
}

async function prepareMediaFixture(
  candidateId: string,
  sourceUrl: string | null,
): Promise<PreparedZakazProductMedia | null> {
  if (sourceUrl === null) return null;
  return {
    id: randomUUID(),
    objectPath: `products/zakaz-imports/${candidateId}/integration/original.webp`,
    thumbnailPath: `products/zakaz-imports/${candidateId}/integration/thumbnail.webp`,
    byteSize: 1_024,
    widthPx: 1_000,
    heightPx: 1_000,
    checksumSha256: "a".repeat(64),
    sourceUrl,
  };
}

function requireSafeTestDatabaseUrl(value: string | undefined): string {
  if (value === undefined) throw new Error("TEST_DATABASE_URL is required");
  const url = new URL(value);
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    throw new Error("Integration tests only run against local PostgreSQL");
  }
  if (!url.pathname.endsWith("/mealmind_test")) {
    throw new Error("Integration tests require the isolated mealmind_test database");
  }
  return value;
}
