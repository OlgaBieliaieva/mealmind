import { Prisma, type DatabaseClient } from "@mealmind/db";

import type { ProductMediaStorage } from "../../product/domain/product-media-storage.js";
import {
  ProductImportReviewConflictError,
  ProductImportReviewInvariantError,
} from "../application/product-import-review-errors.js";
import type {
  ProductImportPublicationDraft,
  ProductImportPublisher,
  PublishProductImportCandidateInput,
} from "../domain/product-import-publisher.js";
import {
  prepareZakazProductMedia,
  type PreparedZakazProductMedia,
} from "./zakaz-product-media-preparer.js";

export function createPrismaProductImportPublisher(
  database: DatabaseClient,
  storage: ProductMediaStorage,
  prepareMedia: typeof prepareZakazProductMedia = prepareZakazProductMedia,
  now: () => Date = () => new Date(),
): ProductImportPublisher {
  return Object.freeze({
    async publish(input: PublishProductImportCandidateInput) {
      const preparedMedia = await prepareMedia(
        input.candidate.id,
        input.publication.sourceImageUrl,
        storage,
      );
      try {
        return await database.$transaction(async (transaction) => {
          const productId = await resolveProduct(transaction, input);
          const productSource = await ensureProductSourceReference(transaction, input, productId);
          const productPackage = await resolvePackage(transaction, input, productId);
          const packageSource = await ensurePackageSourceReference(
            transaction,
            input,
            productPackage.id,
          );

          await persistPackageDetails(
            transaction,
            input,
            productId,
            productPackage.id,
            productPackage.isDefault,
            packageSource.id,
          );
          await persistNutrients(transaction, input, productId, productSource.id);
          await persistMedia(
            transaction,
            input,
            productId,
            productPackage.id,
            packageSource.id,
            preparedMedia,
            now(),
          );

          const changed = await transaction.productImportCandidate.updateMany({
            where: {
              id: input.candidate.id,
              status: "APPROVED",
              updatedAt: new Date(input.expectedUpdatedAt),
              publishedProductId: null,
              publishedPackageId: null,
            },
            data: {
              status: "PUBLISHED",
              publishedProductId: productId,
              publishedPackageId: productPackage.id,
            },
          });
          if (changed.count !== 1) throw new ConcurrentPublishError();

          await transaction.productImportCandidateEvent.create({
            data: {
              candidateId: input.candidate.id,
              action: "PUBLISHED",
              actorUserId: input.actorUserId,
              fromStatus: "APPROVED",
              toStatus: "PUBLISHED",
              changeSet: {
                productId,
                packageId: productPackage.id,
                resolutionMode: input.publication.mode,
              },
            },
          });

          return true;
        });
      } catch (error) {
        if (preparedMedia !== null) {
          await storage
            .remove([preparedMedia.objectPath, preparedMedia.thumbnailPath])
            .catch(() => undefined);
        }
        if (error instanceof ConcurrentPublishError) return false;
        if (error instanceof ProductImportReviewInvariantError) throw error;
        if (isKnownPrismaError(error, "P2002")) {
          throw new ProductImportReviewConflictError(
            "GTIN або source identity вже належить іншому запису каталогу",
          );
        }
        if (isKnownPrismaError(error, "P2025") || isKnownPrismaError(error, "P2003")) {
          throw new ProductImportReviewInvariantError(
            "Canonical category, brand, unit або base product більше не доступні",
          );
        }
        throw error;
      }
    },
  });
}

async function persistMedia(
  transaction: Prisma.TransactionClient,
  input: PublishProductImportCandidateInput,
  productId: string,
  productPackageId: string,
  packageSourceReferenceId: string,
  media: PreparedZakazProductMedia | null,
  verifiedAt: Date,
): Promise<void> {
  if (media === null) return;
  const hasPrimary =
    (await transaction.productMedia.count({
      where: { productId, status: "ACTIVE", isPrimary: true },
    })) > 0;
  await transaction.productMedia.create({
    data: {
      id: media.id,
      productId,
      productPackageId,
      packageSourceReferenceId,
      kind: "PACKAGING",
      status: "ACTIVE",
      storageObjectPath: media.objectPath,
      mimeType: "image/webp",
      byteSize: media.byteSize,
      widthPx: media.widthPx,
      heightPx: media.heightPx,
      checksumSha256: media.checksumSha256,
      sourceUrl: media.sourceUrl,
      altTextUa: input.publication.nameUa,
      altTextEn: input.publication.nameEn,
      isPrimary: !hasPrimary,
      uploadedByUserId: input.actorUserId,
      createdAt: verifiedAt,
      verifiedAt,
    },
  });
}

async function resolveProduct(
  transaction: Prisma.TransactionClient,
  input: PublishProductImportCandidateInput,
): Promise<string> {
  const publication = input.publication;
  if (publication.mode === "ADD_PACKAGE_TO_EXISTING_PRODUCT") {
    const product = await transaction.product.findFirst({
      where: {
        id: publication.targetProductId!,
        type: "BRANDED",
        status: { not: "ARCHIVED" },
        archivedAt: null,
      },
      select: { id: true },
    });
    if (product === null) {
      throw new ProductImportReviewInvariantError(
        "Обраний branded product не існує або архівований",
      );
    }
    return product.id;
  }

  const product = await transaction.product.create({
    data: {
      type: "BRANDED",
      nameEn: publication.nameEn,
      nameUa: publication.nameUa,
      gtin: publication.gtin,
      categoryId: publication.categoryId!,
      brandId: publication.brandId!,
      defaultMeasurementUnitId: publication.defaultMeasurementUnitId!,
      baseProductId: publication.baseProductId,
      foodState: "UNSPECIFIED",
      status: "ACTIVE",
      verificationStatus: "UNVERIFIED",
      notes: publication.description,
    },
    select: { id: true },
  });
  return product.id;
}

async function ensureProductSourceReference(
  transaction: Prisma.TransactionClient,
  input: PublishProductImportCandidateInput,
  productId: string,
) {
  const externalId = sourceExternalId(input);
  const existing = await transaction.productSourceReference.findUnique({
    where: {
      provider_dataset_externalId: {
        provider: "ZAKAZ",
        dataset: "ZAKAZ_RETAIL_CATALOG",
        externalId,
      },
    },
  });
  if (existing !== null) {
    if (existing.productId !== productId) {
      throw new ProductImportReviewConflictError(
        "Zakaz source identity вже пов’язаний з іншим продуктом",
      );
    }
    return existing;
  }

  return transaction.productSourceReference.create({
    data: {
      productId,
      provider: "ZAKAZ",
      dataset: "ZAKAZ_RETAIL_CATALOG",
      externalId,
      sourceRelease: input.candidate.batch.generatedAt,
      isPrimary: true,
    },
  });
}

async function resolvePackage(
  transaction: Prisma.TransactionClient,
  input: PublishProductImportCandidateInput,
  productId: string,
) {
  const source = await transaction.productPackageSourceReference.findUnique({
    where: {
      provider_dataset_storeExternalId_externalId: {
        provider: "ZAKAZ",
        dataset: "ZAKAZ_RETAIL_CATALOG",
        storeExternalId: input.candidate.storeExternalId,
        externalId: input.candidate.sourceSku,
      },
    },
    include: { productPackage: { select: { productId: true } } },
  });
  if (source !== null) {
    if (source.productPackage.productId !== productId) {
      throw new ProductImportReviewConflictError(
        "Zakaz SKU вже пов’язаний з пакуванням іншого продукту",
      );
    }
    return transaction.productPackage.findUniqueOrThrow({ where: { id: source.productPackageId } });
  }

  const byGtin =
    input.publication.gtin === null
      ? null
      : await transaction.productPackage.findUnique({
          where: { gtin: input.publication.gtin },
        });
  if (byGtin !== null) {
    if (
      input.publication.mode !== "ADD_PACKAGE_TO_EXISTING_PRODUCT" ||
      byGtin.productId !== productId
    ) {
      throw new ProductImportReviewConflictError(
        "Пакування з таким GTIN уже належить іншому продукту",
      );
    }
    return byGtin;
  }

  const hasPackage =
    (await transaction.productPackage.count({
      where: { productId, status: { not: "ARCHIVED" } },
    })) > 0;
  const labels = packageLabels(input.publication);
  return transaction.productPackage.create({
    data: {
      productId,
      gtin: input.publication.gtin,
      kind: input.publication.package.kind,
      weightG: input.publication.package.weightG,
      volumeMl: input.publication.package.volumeMl,
      itemCount: input.publication.package.itemCount,
      labelUa: labels.ua,
      labelEn: labels.en,
      isDefault: !hasPackage,
      status: "ACTIVE",
    },
  });
}

async function ensurePackageSourceReference(
  transaction: Prisma.TransactionClient,
  input: PublishProductImportCandidateInput,
  productPackageId: string,
) {
  return transaction.productPackageSourceReference.upsert({
    where: {
      provider_dataset_storeExternalId_externalId: {
        provider: "ZAKAZ",
        dataset: "ZAKAZ_RETAIL_CATALOG",
        storeExternalId: input.candidate.storeExternalId,
        externalId: input.candidate.sourceSku,
      },
    },
    create: {
      productPackageId,
      provider: "ZAKAZ",
      dataset: "ZAKAZ_RETAIL_CATALOG",
      storeExternalId: input.candidate.storeExternalId,
      externalId: input.candidate.sourceSku,
      webUrl: input.publication.webUrl,
      rawProducerName: input.publication.rawProducerName,
      sourceFingerprint: input.candidate.sourceFingerprint,
      inStock: input.publication.inStock,
      observedAt: input.candidate.batch.generatedAt,
      isPrimary: true,
    },
    update: {
      webUrl: input.publication.webUrl,
      rawProducerName: input.publication.rawProducerName,
      inStock: input.publication.inStock,
      observedAt: input.candidate.batch.generatedAt,
    },
  });
}

async function persistPackageDetails(
  transaction: Prisma.TransactionClient,
  input: PublishProductImportCandidateInput,
  productId: string,
  productPackageId: string,
  productPackageIsDefault: boolean,
  sourceReferenceId: string,
): Promise<void> {
  const publication = input.publication;
  if (publication.ingredients.length > 0) {
    await transaction.productIngredientStatement.upsert({
      where: {
        productPackageId_locale_sourceReferenceId: {
          productPackageId,
          locale: input.candidate.batch.localizedLocale,
          sourceReferenceId,
        },
      },
      create: {
        productPackageId,
        sourceReferenceId,
        locale: input.candidate.batch.localizedLocale,
        statement: publication.ingredients.join("; "),
        isPrimary: true,
      },
      update: {
        statement: publication.ingredients.join("; "),
        isPrimary: true,
      },
    });
  }

  if (publication.shelfLife.raw !== null || publication.temperatureRange.raw !== null) {
    await transaction.productPackageShelfLifeRule.deleteMany({
      where: { productPackageId, sourceReferenceId },
    });
    await transaction.productPackageShelfLifeRule.create({
      data: {
        productPackageId,
        sourceReferenceId,
        rawShelfLife: publication.shelfLife.raw,
        rawTemperatureRange: publication.temperatureRange.raw,
        durationValue: publication.shelfLife.durationValue,
        durationUnit: publication.shelfLife.durationUnit,
        minTemperatureC: publication.temperatureRange.minC,
        maxTemperatureC: publication.temperatureRange.maxC,
      },
    });
  }

  if (publication.package.weightG !== null) {
    const labels = packageLabels(publication);
    const existing = await transaction.productPortion.findFirst({
      where: { productId, productPackageId, kind: "PACKAGE", isActive: true },
      select: { id: true },
    });
    const data = {
      amount: 1,
      gramWeight: publication.package.weightG,
      labelEn: labels.en ?? "Package",
      labelUa: labels.ua,
      kind: "PACKAGE" as const,
      weightType: "LABEL" as const,
      productPackageId,
      isDefault: productPackageIsDefault,
      isActive: true,
      sortOrder: 0,
    };
    if (existing === null) {
      await transaction.productPortion.create({ data: { ...data, productId } });
    } else {
      await transaction.productPortion.update({ where: { id: existing.id }, data });
    }
  }
}

async function persistNutrients(
  transaction: Prisma.TransactionClient,
  input: PublishProductImportCandidateInput,
  productId: string,
  sourceReferenceId: string,
): Promise<void> {
  if (input.publication.nutrients.length === 0) return;
  const nutrients = await transaction.nutrient.findMany({
    where: { code: { in: input.publication.nutrients.map((item) => item.code) }, isActive: true },
    select: { id: true, code: true },
  });
  const ids = new Map(nutrients.map((item) => [item.code, item.id]));
  for (const nutrient of input.publication.nutrients) {
    const nutrientId = ids.get(nutrient.code);
    if (nutrientId === undefined) {
      throw new ProductImportReviewInvariantError(
        "У reference data відсутній активний нутрієнт " + nutrient.code,
      );
    }
    await transaction.productNutrient.upsert({
      where: { productId_nutrientId: { productId, nutrientId } },
      create: {
        productId,
        nutrientId,
        valuePer100g: nutrient.valuePer100g,
        valueType: "LABEL",
        sourceReferenceId,
        sourceRowId: input.candidate.sourceSku + ":" + nutrient.code,
      },
      update: {
        valuePer100g: nutrient.valuePer100g,
        valueType: "LABEL",
        sourceReferenceId,
        sourceRowId: input.candidate.sourceSku + ":" + nutrient.code,
      },
    });
  }
}

function sourceExternalId(input: PublishProductImportCandidateInput): string {
  return input.candidate.storeExternalId + ":" + input.candidate.sourceSku;
}

function packageLabels(publication: ProductImportPublicationDraft): {
  readonly ua: string | null;
  readonly en: string | null;
} {
  const { weightG, volumeMl, itemCount } = publication.package;
  const partsUa = [
    weightG === null ? null : formatNumber(weightG) + " г",
    volumeMl === null ? null : formatNumber(volumeMl) + " мл",
    itemCount === null ? null : String(itemCount) + " шт.",
  ].filter((value): value is string => value !== null);
  const partsEn = [
    weightG === null ? null : formatNumber(weightG) + " g",
    volumeMl === null ? null : formatNumber(volumeMl) + " ml",
    itemCount === null ? null : String(itemCount) + " pcs",
  ].filter((value): value is string => value !== null);
  return {
    ua: partsUa.length === 0 ? null : partsUa.join(" · "),
    en: partsEn.length === 0 ? null : partsEn.join(" · "),
  };
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

function isKnownPrismaError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

class ConcurrentPublishError extends Error {}
