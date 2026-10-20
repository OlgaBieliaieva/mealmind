import { randomUUID } from "node:crypto";

import { Prisma, type DatabaseClient } from "@mealmind/db";

import { ProductConflictError, ProductInvariantError } from "../application/product-errors.js";
import type {
  ProductDetails,
  ProductListQuery,
  ProductMediaRecord,
  ProductRepository,
  ProductSearchItem,
  ProductSearchQuery,
  ProductSummary,
  ProductUpdate,
  ProductWrite,
} from "../domain/product-repository.js";
import { evaluateProductVerification } from "../domain/product-verification.js";

const productInclude = {
  category: { select: { nameUa: true, nameEn: true } },
  brand: { select: { name: true } },
  defaultMeasurementUnit: { select: { symbol: true } },
  baseProduct: {
    select: {
      nameUa: true,
      nameEn: true,
      nutrients: {
        include: { nutrient: { select: { code: true, nameUa: true, nameEn: true, unit: true } } },
        orderBy: [{ nutrient: { sortOrder: "asc" } }, { nutrientId: "asc" }],
      },
    },
  },
  sourceReferences: {
    where: { isPrimary: true },
    orderBy: [{ createdAt: "asc" }],
    take: 1,
    select: { provider: true, dataset: true },
  },
  nutrients: {
    include: { nutrient: { select: { code: true, nameUa: true, nameEn: true, unit: true } } },
    orderBy: [{ nutrient: { sortOrder: "asc" } }, { nutrientId: "asc" }],
  },
  portions: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
  packages: {
    include: {
      ingredientTexts: { orderBy: [{ locale: "asc" }, { isPrimary: "desc" }, { id: "asc" }] },
      shelfLifeRules: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }, { id: "asc" }],
  },
  foodCharacteristics: {
    include: { characteristic: true },
    orderBy: [{ sortOrder: "asc" }, { characteristic: { sortOrder: "asc" } }],
  },
  dietaryTags: {
    include: { dietaryTag: { select: { code: true, nameUa: true } } },
    orderBy: [{ dietaryTag: { sortOrder: "asc" } }, { dietaryTagId: "asc" }],
  },
  allergens: {
    include: { allergen: { select: { code: true, nameUa: true } } },
    orderBy: { allergenId: "asc" },
  },
  media: {
    where: { status: { not: "ARCHIVED" } },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.ProductInclude;

const productSearchSelect = {
  id: true,
  type: true,
  nameUa: true,
  nameEn: true,
  foodState: true,
  foodCharacteristics: {
    include: { characteristic: true },
    orderBy: [{ sortOrder: "asc" }, { characteristic: { sortOrder: "asc" } }],
  },
  category: {
    select: {
      nameUa: true,
      nameEn: true,
    },
  },
  brand: {
    select: {
      name: true,
    },
  },
} satisfies Prisma.ProductSelect;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
type ProductSearchRow = Prisma.ProductGetPayload<{ select: typeof productSearchSelect }>;

export function createPrismaProductRepository(database: DatabaseClient): ProductRepository {
  const repository: ProductRepository = {
    async list(query) {
      const where = productListWhere(query);
      const [rows, total] = await database.$transaction([
        database.product.findMany({
          where,
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
          include: productInclude,
        }),
        database.product.count({ where }),
      ]);

      return Object.freeze({
        items: Object.freeze(rows.map(mapProductSummary)),
        page: query.page,
        pageSize: query.pageSize,
        total,
      });
    },

    async searchActive(query) {
      const where = productSearchWhere(query);
      const [rows, total] = await database.$transaction([
        database.product.findMany({
          where,
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          orderBy: [{ nameUa: { sort: "asc", nulls: "last" } }, { nameEn: "asc" }, { id: "asc" }],
          select: productSearchSelect,
        }),
        database.product.count({ where }),
      ]);

      return Object.freeze({
        items: Object.freeze(rows.map(mapProductSearchItem)),
        page: query.page,
        pageSize: query.pageSize,
        total,
      });
    },

    async findById(id) {
      const row = await database.product.findUnique({ where: { id }, include: productInclude });
      return row === null ? null : mapProductDetails(row);
    },

    async findNutrientCodes(ids) {
      if (ids.length === 0) return new Map();
      const rows = await database.nutrient.findMany({
        where: { id: { in: [...new Set(ids)] } },
        select: { id: true, code: true },
      });
      return new Map(rows.map((row) => [row.id, row.code]));
    },

    async create(data) {
      try {
        const productId = randomUUID();
        const row = await database.product.create({
          data: productCreateData(productId, data),
          include: productInclude,
        });
        return mapProductDetails(row);
      } catch (error) {
        throw mapProductMutationError(error);
      }
    },

    async update(id, data) {
      try {
        const row = await database.$transaction(async (transaction) => {
          const updated = await transaction.product.update({
            where: { id },
            data: productUpdateData(data),
            include: productInclude,
          });

          if (data.gtin !== undefined && data.packages === undefined) {
            await syncLegacyDefaultPackage(transaction, updated, data.gtin);
          }

          if (data.packages !== undefined) {
            await updateProductPackages(transaction, id, data.packages);
          }
          if (data.dietaryTags !== undefined || data.allergens !== undefined) {
            if (data.attributeActorUserId === undefined) {
              throw new ProductInvariantError("Для перевірки атрибутів потрібен адміністратор");
            }
            await updateVerifiedAttributes(transaction, id, data, data.attributeActorUserId);
          }
          if (updated.type === "GENERIC" && data.nutrients !== undefined) {
            await transaction.product.updateMany({
              where: { baseProductId: id, verificationStatus: "VERIFIED" },
              data: {
                verificationStatus: "UNVERIFIED",
                verifiedByUserId: null,
                verifiedAt: null,
              },
            });
          }

          return transaction.product.findUniqueOrThrow({
            where: { id },
            include: productInclude,
          });
        });
        return mapProductDetails(row);
      } catch (error) {
        if (isKnownPrismaError(error, "P2025")) return null;
        throw mapProductMutationError(error);
      }
    },

    async updateStatus(id, status) {
      try {
        const changedAt = new Date();
        const row = await database.$transaction(async (transaction) => {
          const updated = await transaction.product.update({
            where: { id },
            data: { status, archivedAt: status === "ARCHIVED" ? changedAt : null },
            include: productInclude,
          });

          if (updated.gtin !== null) {
            await transaction.productPackage.updateMany({
              where: { productId: id, gtin: updated.gtin, isDefault: true },
              data: {
                status,
                archivedAt: status === "ARCHIVED" ? changedAt : null,
              },
            });
          }

          return updated;
        });
        return mapProductDetails(row);
      } catch (error) {
        if (isKnownPrismaError(error, "P2025")) return null;
        throw mapProductMutationError(error);
      }
    },

    async createPendingMedia(data) {
      try {
        const row = await database.productMedia.create({
          data: {
            id: data.id,
            productId: data.productId,
            kind: data.kind,
            storageObjectPath: data.storageObjectPath,
            mimeType: data.mimeType,
            byteSize: BigInt(data.byteSize),
            ...(data.altTextUa === undefined ? {} : { altTextUa: data.altTextUa }),
            ...(data.altTextEn === undefined ? {} : { altTextEn: data.altTextEn }),
            isPrimary: data.isPrimary,
            uploadedByUserId: data.uploadedByUserId,
          },
        });
        return mapMedia(row);
      } catch (error) {
        throw mapProductMutationError(error);
      }
    },

    async findMedia(id) {
      const row = await database.productMedia.findUnique({ where: { id } });
      return row === null ? null : mapMedia(row);
    },

    async activateMedia(id, data) {
      try {
        const row = await database.$transaction(async (transaction) => {
          const current = await transaction.productMedia.findUnique({ where: { id } });
          if (current === null) return null;

          if (current.isPrimary) {
            await transaction.productMedia.updateMany({
              where: { productId: current.productId, id: { not: id }, status: "ACTIVE" },
              data: { isPrimary: false },
            });
          }

          return transaction.productMedia.update({
            where: { id },
            data: {
              status: "ACTIVE",
              widthPx: data.widthPx,
              heightPx: data.heightPx,
              checksumSha256: data.checksumSha256,
              verifiedAt: new Date(),
            },
          });
        });

        return row === null ? null : mapMedia(row);
      } catch (error) {
        if (isKnownPrismaError(error, "P2025")) return null;
        throw mapProductMutationError(error);
      }
    },

    async markMediaFailed(id) {
      await database.productMedia.updateMany({
        where: { id, status: { not: "ARCHIVED" } },
        data: { status: "FAILED", isPrimary: false },
      });
    },

    async archiveMedia(id) {
      await database.productMedia.updateMany({
        where: { id, status: { not: "ARCHIVED" } },
        data: { status: "ARCHIVED", archivedAt: new Date(), isPrimary: false },
      });
    },

    async listStaleMedia(olderThan) {
      const rows = await database.productMedia.findMany({
        where: { status: { in: ["PENDING", "FAILED"] }, createdAt: { lt: olderThan } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      return Object.freeze(rows.map(mapMedia));
    },
  };

  return Object.freeze(repository);
}

function productListWhere(query: ProductListQuery): Prisma.ProductWhereInput {
  return {
    ...(query.type === undefined ? {} : { type: query.type }),
    ...(query.status === undefined ? {} : { status: query.status }),
    ...(query.verificationStatus === undefined
      ? {}
      : { verificationStatus: query.verificationStatus }),
    ...(query.foodState === undefined ? {} : { foodState: query.foodState }),
    ...(query.createdFrom === undefined ? {} : { createdAt: { gte: query.createdFrom } }),
    ...(query.includeArchived === false
      ? {
          archivedAt: null,
          ...(query.status === undefined ? { status: { not: "ARCHIVED" as const } } : {}),
        }
      : {}),
    ...(query.sourceProvider === undefined
      ? {}
      : query.sourceProvider === "UNASSIGNED"
        ? { sourceReferences: { none: { isPrimary: true } } }
        : {
            sourceReferences: {
              some: { isPrimary: true, provider: query.sourceProvider },
            },
          }),
    ...(query.categoryId === undefined ? {} : { categoryId: query.categoryId }),
    ...(query.brandId === undefined ? {} : { brandId: query.brandId }),
    ...(query.search === undefined
      ? {}
      : {
          OR: [
            { nameEn: { contains: query.search, mode: "insensitive" } },
            { nameUa: { contains: query.search, mode: "insensitive" } },
            { gtin: { contains: query.search } },
            { brand: { name: { contains: query.search, mode: "insensitive" } } },
          ],
        }),
  };
}

function productSearchWhere(query: ProductSearchQuery): Prisma.ProductWhereInput {
  return {
    status: "ACTIVE",
    OR: [
      { nameEn: { contains: query.search, mode: "insensitive" } },
      { nameUa: { contains: query.search, mode: "insensitive" } },
      { gtin: { contains: query.search } },
      { brand: { name: { contains: query.search, mode: "insensitive" } } },
    ],
  };
}

function mapProductSearchItem(row: ProductSearchRow): ProductSearchItem {
  return Object.freeze({
    id: row.id,
    name: row.nameUa ?? row.nameEn,
    type: row.type,
    categoryName: row.category.nameUa ?? row.category.nameEn,
    brandName: row.brand?.name ?? null,
    foodState: row.foodState,
    foodCharacteristics: Object.freeze(
      row.foodCharacteristics.map((assignment) =>
        Object.freeze({
          id: assignment.characteristic.id,
          code: assignment.characteristic.code,
          kind: assignment.characteristic.kind,
          nameUa: assignment.characteristic.nameUa,
          nameEn: assignment.characteristic.nameEn,
          source: assignment.source,
          confidence: assignment.confidence,
        }),
      ),
    ),
  });
}

function productCreateData(id: string, data: ProductWrite): Prisma.ProductCreateInput {
  return {
    id,
    type: data.type,
    nameEn: data.nameEn,
    ...(data.nameUa === undefined ? {} : { nameUa: data.nameUa }),
    ...(data.gtin === undefined ? {} : { gtin: data.gtin }),
    category: { connect: { id: data.categoryId } },
    ...(data.brandId === undefined || data.brandId === null
      ? {}
      : { brand: { connect: { id: data.brandId } } }),
    defaultMeasurementUnit: { connect: { id: data.defaultMeasurementUnitId } },
    ...(data.baseProductId === undefined || data.baseProductId === null
      ? {}
      : { baseProduct: { connect: { id: data.baseProductId } } }),
    foodState: data.foodState,
    foodCharacteristics: {
      create: (data.characteristicIds ?? []).map((characteristicId, sortOrder) => ({
        characteristic: { connect: { id: characteristicId } },
        source: "MANUAL",
        confidence: "UNSPECIFIED",
        sortOrder,
      })),
    },
    ...(data.ediblePortionPercent === undefined
      ? {}
      : { ediblePortionPercent: data.ediblePortionPercent }),
    status: data.status,
    ...(data.verificationStatus === undefined
      ? {}
      : { verificationStatus: data.verificationStatus }),
    ...(data.notes === undefined ? {} : { notes: data.notes }),
    archivedAt: data.status === "ARCHIVED" ? new Date() : null,
    nutrients: { create: data.nutrients.map(nutrientCreateData) },
    portions: { create: data.portions.map(portionCreateData) },
    ...(data.gtin === undefined || data.gtin === null
      ? {}
      : {
          packages: {
            create: {
              gtin: data.gtin,
              kind: "UNSPECIFIED",
              isDefault: true,
              status: data.status,
              archivedAt: data.status === "ARCHIVED" ? new Date() : null,
            },
          },
        }),
    sourceReferences: {
      create: {
        provider: data.source.provider,
        dataset: data.source.dataset,
        externalId: id,
        sourceRelease: data.source.sourceRelease,
        isPrimary: true,
      },
    },
  };
}

function productUpdateData(data: ProductUpdate): Prisma.ProductUpdateInput {
  return {
    ...(data.nameEn === undefined ? {} : { nameEn: data.nameEn }),
    ...(data.nameUa === undefined ? {} : { nameUa: data.nameUa }),
    ...(data.gtin === undefined ? {} : { gtin: data.gtin }),
    ...(data.categoryId === undefined ? {} : { category: { connect: { id: data.categoryId } } }),
    ...(data.brandId === undefined ? {} : { brand: { connect: { id: data.brandId } } }),
    ...(data.defaultMeasurementUnitId === undefined
      ? {}
      : { defaultMeasurementUnit: { connect: { id: data.defaultMeasurementUnitId } } }),
    ...(data.foodState === undefined ? {} : { foodState: data.foodState }),
    ...(data.characteristicIds === undefined
      ? {}
      : {
          foodCharacteristics: {
            deleteMany: {},
            create: data.characteristicIds.map((characteristicId, sortOrder) => ({
              characteristic: { connect: { id: characteristicId } },
              source: "MANUAL" as const,
              confidence: "UNSPECIFIED" as const,
              sortOrder,
            })),
          },
        }),
    ...(data.ediblePortionPercent === undefined
      ? {}
      : { ediblePortionPercent: data.ediblePortionPercent }),
    ...(data.notes === undefined ? {} : { notes: data.notes }),
    ...(data.verificationStatus === undefined
      ? {}
      : { verificationStatus: data.verificationStatus }),
    ...(data.verifiedByUserId === undefined
      ? {}
      : data.verifiedByUserId === null
        ? { verifiedByUser: { disconnect: true } }
        : { verifiedByUser: { connect: { id: data.verifiedByUserId } } }),
    ...(data.verifiedAt === undefined ? {} : { verifiedAt: data.verifiedAt }),
    ...(data.nutrients === undefined
      ? {}
      : {
          nutrients: {
            deleteMany: {},
            create: data.nutrients.map(nutrientCreateData),
          },
        }),
    ...(data.portions === undefined
      ? {}
      : {
          portions: {
            deleteMany: {},
            create: data.portions.map(portionCreateData),
          },
        }),
  };
}

async function syncLegacyDefaultPackage(
  transaction: Prisma.TransactionClient,
  product: { readonly id: string; readonly status: "DRAFT" | "ACTIVE" | "ARCHIVED" },
  gtin: string | null,
): Promise<void> {
  const currentDefault = await transaction.productPackage.findFirst({
    where: {
      productId: product.id,
      isDefault: true,
      status: { not: "ARCHIVED" },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  if (currentDefault !== null) {
    await transaction.productPackage.update({
      where: { id: currentDefault.id },
      data: { gtin },
    });
    return;
  }

  const archivedDefault = await transaction.productPackage.findFirst({
    where: {
      productId: product.id,
      isDefault: true,
      status: "ARCHIVED",
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  if (archivedDefault !== null) {
    await transaction.productPackage.update({
      where: { id: archivedDefault.id },
      data: {
        gtin,
        status: product.status,
        archivedAt: product.status === "ARCHIVED" ? new Date() : null,
      },
    });
    return;
  }

  if (gtin === null) return;

  await transaction.productPackage.create({
    data: {
      productId: product.id,
      gtin,
      kind: "UNSPECIFIED",
      isDefault: true,
      status: product.status,
      archivedAt: product.status === "ARCHIVED" ? new Date() : null,
    },
  });
}

function nutrientCreateData(
  data: ProductWrite["nutrients"][number],
): Prisma.ProductNutrientUncheckedCreateWithoutProductInput {
  return {
    nutrientId: data.nutrientId,
    valuePer100g: data.valuePer100g,
    valueType: data.valueType,
  };
}

function portionCreateData(
  data: ProductWrite["portions"][number],
): Prisma.ProductPortionUncheckedCreateWithoutProductInput {
  return {
    ...(data.productPackageId === undefined ? {} : { productPackageId: data.productPackageId }),
    amount: data.amount,
    gramWeight: data.gramWeight,
    labelEn: data.labelEn,
    ...(data.labelUa === undefined ? {} : { labelUa: data.labelUa }),
    kind: data.kind,
    weightType: data.weightType,
    ...(data.measurementUnitId === undefined ? {} : { measurementUnitId: data.measurementUnitId }),
    isDefault: data.isDefault,
    isActive: data.isActive,
    sortOrder: data.sortOrder,
  };
}

function mapProductDetails(row: ProductRow): ProductDetails {
  const source = row.sourceReferences[0] ?? null;
  const ownNutrients = row.nutrients.map((item) => mapNutrient(item, "PRODUCT"));
  const ownNutrientIds = new Set(ownNutrients.map((item) => item.nutrientId));
  const inheritedNutrients = (row.baseProduct?.nutrients ?? [])
    .filter((item) => !ownNutrientIds.has(item.nutrientId))
    .map((item) => mapNutrient(item, "BASE_PRODUCT"));

  return Object.freeze({
    id: row.id,
    type: row.type,
    nameEn: row.nameEn,
    nameUa: row.nameUa,
    gtin: row.gtin,
    categoryId: row.categoryId,
    categoryName: row.category.nameUa ?? row.category.nameEn,
    brandId: row.brandId,
    brandName: row.brand?.name ?? null,
    defaultMeasurementUnitId: row.defaultMeasurementUnitId,
    defaultMeasurementUnitSymbol: row.defaultMeasurementUnit.symbol,
    baseProductId: row.baseProductId,
    baseProductName:
      row.baseProduct === null ? null : (row.baseProduct.nameUa ?? row.baseProduct.nameEn),
    sourceProvider: source?.provider ?? null,
    sourceDataset: source?.dataset ?? null,
    foodState: row.foodState,
    foodCharacteristics: Object.freeze(
      row.foodCharacteristics.map((assignment) =>
        Object.freeze({
          id: assignment.characteristic.id,
          code: assignment.characteristic.code,
          kind: assignment.characteristic.kind,
          nameUa: assignment.characteristic.nameUa,
          nameEn: assignment.characteristic.nameEn,
          source: assignment.source,
          confidence: assignment.confidence,
        }),
      ),
    ),
    ediblePortionPercent: row.ediblePortionPercent?.toString() ?? null,
    status: row.status,
    verificationStatus: row.verificationStatus,
    verifiedByUserId: row.verifiedByUserId,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    notes: row.notes,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    nutrients: Object.freeze([...ownNutrients, ...inheritedNutrients]),
    ownNutrients: Object.freeze(ownNutrients),
    portions: Object.freeze(
      row.portions.map((portion) =>
        Object.freeze({
          id: portion.id,
          productPackageId: portion.productPackageId,
          amount: portion.amount.toString(),
          gramWeight: portion.gramWeight.toString(),
          labelEn: portion.labelEn,
          labelUa: portion.labelUa,
          kind: portion.kind,
          weightType: portion.weightType,
          measurementUnitId: portion.measurementUnitId,
          isDefault: portion.isDefault,
          isActive: portion.isActive,
          sortOrder: portion.sortOrder,
        }),
      ),
    ),
    packages: Object.freeze(
      row.packages.map((item) =>
        Object.freeze({
          id: item.id,
          gtin: item.gtin,
          kind: item.kind,
          weightG: item.weightG?.toString() ?? null,
          volumeMl: item.volumeMl?.toString() ?? null,
          itemCount: item.itemCount,
          labelUa: item.labelUa,
          labelEn: item.labelEn,
          isDefault: item.isDefault,
          status: item.status,
          archivedAt: item.archivedAt?.toISOString() ?? null,
          ingredientStatements: Object.freeze(
            item.ingredientTexts.map((statement) =>
              Object.freeze({
                id: statement.id,
                locale: statement.locale,
                statement: statement.statement,
                isPrimary: statement.isPrimary,
                source:
                  statement.sourceReferenceId === null ? ("MANUAL" as const) : ("SOURCE" as const),
              }),
            ),
          ),
          shelfLifeRules: Object.freeze(
            item.shelfLifeRules.map((rule) =>
              Object.freeze({
                id: rule.id,
                rawShelfLife: rule.rawShelfLife,
                rawTemperatureRange: rule.rawTemperatureRange,
                durationValue: rule.durationValue?.toString() ?? null,
                durationUnit: rule.durationUnit,
                minTemperatureC: rule.minTemperatureC?.toString() ?? null,
                maxTemperatureC: rule.maxTemperatureC?.toString() ?? null,
                sortOrder: rule.sortOrder,
                source: rule.sourceReferenceId === null ? ("MANUAL" as const) : ("SOURCE" as const),
              }),
            ),
          ),
        }),
      ),
    ),
    dietaryTags: Object.freeze(
      row.dietaryTags.map((item) =>
        Object.freeze({
          dietaryTagId: item.dietaryTagId,
          code: item.dietaryTag.code,
          nameUa: item.dietaryTag.nameUa,
          status: item.status,
          method: item.method,
          evidenceNote: item.evidenceNote,
          verifiedAt: item.verifiedAt?.toISOString() ?? null,
        }),
      ),
    ),
    allergens: Object.freeze(
      row.allergens.map((item) =>
        Object.freeze({
          allergenId: item.allergenId,
          code: item.allergen.code,
          nameUa: item.allergen.nameUa,
          declaration: item.declaration,
          status: item.status,
          method: item.method,
          evidenceNote: item.evidenceNote,
          verifiedAt: item.verifiedAt?.toISOString() ?? null,
        }),
      ),
    ),
    media: Object.freeze(row.media.map(mapMedia)),
  });
}

async function updateVerifiedAttributes(
  transaction: Prisma.TransactionClient,
  productId: string,
  data: ProductUpdate,
  actorUserId: string,
): Promise<void> {
  const now = new Date();
  if (data.dietaryTags !== undefined) {
    const ids = [...new Set(data.dietaryTags.map((item) => item.dietaryTagId))];
    const active = await transaction.dietaryTag.count({
      where: { id: { in: ids }, isActive: true },
    });
    if (active !== ids.length)
      throw new ProductInvariantError("Один або кілька dietary tags недоступні");
    await transaction.productDietaryTag.deleteMany({
      where: { productId, method: "MANUAL_REVIEW", dietaryTagId: { notIn: ids } },
    });
    for (const item of data.dietaryTags) {
      await transaction.productDietaryTag.upsert({
        where: { productId_dietaryTagId: { productId, dietaryTagId: item.dietaryTagId } },
        create: {
          productId,
          dietaryTagId: item.dietaryTagId,
          status: "VERIFIED",
          method: "MANUAL_REVIEW",
          evidenceNote: item.evidenceNote,
          assignedByUserId: actorUserId,
          verifiedByUserId: actorUserId,
          verifiedAt: now,
          createdAt: now,
        },
        update: {
          status: "VERIFIED",
          method: "MANUAL_REVIEW",
          sourceReferenceId: null,
          ruleCode: null,
          ruleVersion: null,
          evidenceNote: item.evidenceNote,
          assignedByUserId: actorUserId,
          verifiedByUserId: actorUserId,
          verifiedAt: now,
        },
      });
    }
  }

  if (data.allergens !== undefined) {
    const ids = [...new Set(data.allergens.map((item) => item.allergenId))];
    const active = await transaction.allergen.count({ where: { id: { in: ids }, isActive: true } });
    if (active !== ids.length)
      throw new ProductInvariantError("Один або кілька алергенів недоступні");
    await transaction.productAllergen.deleteMany({
      where: { productId, method: "MANUAL_REVIEW", allergenId: { notIn: ids } },
    });
    for (const item of data.allergens) {
      await transaction.productAllergen.upsert({
        where: { productId_allergenId: { productId, allergenId: item.allergenId } },
        create: {
          productId,
          allergenId: item.allergenId,
          declaration: item.declaration,
          status: "VERIFIED",
          method: "MANUAL_REVIEW",
          evidenceNote: item.evidenceNote,
          assignedByUserId: actorUserId,
          verifiedByUserId: actorUserId,
          verifiedAt: now,
          createdAt: now,
        },
        update: {
          declaration: item.declaration,
          status: "VERIFIED",
          method: "MANUAL_REVIEW",
          sourceReferenceId: null,
          ruleCode: null,
          ruleVersion: null,
          evidenceNote: item.evidenceNote,
          assignedByUserId: actorUserId,
          verifiedByUserId: actorUserId,
          verifiedAt: now,
        },
      });
    }
  }
}

async function updateProductPackages(
  transaction: Prisma.TransactionClient,
  productId: string,
  packages: NonNullable<ProductUpdate["packages"]>,
): Promise<void> {
  for (const item of packages) {
    if (item.id !== undefined) {
      const exists = await transaction.productPackage.findFirst({
        where: { id: item.id, productId },
        select: { id: true },
      });
      if (exists === null) throw new ProductInvariantError("Пакування не належить цьому продукту");
    }

    if (item.isDefault && item.status !== "ARCHIVED") {
      await transaction.productPackage.updateMany({
        where: { productId, isDefault: true, status: { not: "ARCHIVED" } },
        data: { isDefault: false },
      });
    }

    const data = {
      gtin: item.gtin,
      kind: item.kind,
      weightG: item.weightG,
      volumeMl: item.volumeMl,
      itemCount: item.itemCount,
      labelUa: item.labelUa,
      labelEn: item.labelEn,
      isDefault: item.status === "ARCHIVED" ? false : item.isDefault,
      status: item.status,
      archivedAt: item.status === "ARCHIVED" ? new Date() : null,
    } as const;

    let packageId: string;
    if (item.id === undefined) {
      const created = await transaction.productPackage.create({ data: { ...data, productId } });
      packageId = created.id;
    } else {
      await transaction.productPackage.update({ where: { id: item.id }, data });
      packageId = item.id;
    }

    if (item.ingredientStatements !== undefined) {
      await transaction.productIngredientStatement.deleteMany({
        where: { productPackageId: packageId, sourceReferenceId: null },
      });
      for (const statement of item.ingredientStatements) {
        await transaction.productIngredientStatement.create({
          data: {
            productPackageId: packageId,
            locale: statement.locale,
            statement: statement.statement,
            isPrimary: false,
          },
        });
      }
      const statements = await transaction.productIngredientStatement.findMany({
        where: { productPackageId: packageId },
        orderBy: [{ sourceReferenceId: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
        select: { id: true, locale: true },
      });
      for (const locale of new Set(statements.map((statement) => statement.locale))) {
        await transaction.productIngredientStatement.updateMany({
          where: { productPackageId: packageId, locale },
          data: { isPrimary: false },
        });
        const primary = statements.find((statement) => statement.locale === locale);
        if (primary !== undefined) {
          await transaction.productIngredientStatement.update({
            where: { id: primary.id },
            data: { isPrimary: true },
          });
        }
      }
    }

    if (item.shelfLifeRules !== undefined) {
      await transaction.productPackageShelfLifeRule.deleteMany({
        where: { productPackageId: packageId, sourceReferenceId: null },
      });
      if (item.shelfLifeRules.length > 0) {
        await transaction.productPackageShelfLifeRule.createMany({
          data: item.shelfLifeRules.map((rule) => ({
            productPackageId: packageId,
            rawShelfLife: rule.rawShelfLife,
            rawTemperatureRange: rule.rawTemperatureRange,
            durationValue: rule.durationValue,
            durationUnit: rule.durationUnit,
            minTemperatureC: rule.minTemperatureC,
            maxTemperatureC: rule.maxTemperatureC,
            sortOrder: rule.sortOrder,
          })),
        });
      }
    }
  }

  const currentDefault = await transaction.productPackage.findFirst({
    where: { productId, isDefault: true, status: { not: "ARCHIVED" } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { gtin: true },
  });
  await transaction.product.update({
    where: { id: productId },
    data: { gtin: currentDefault?.gtin ?? null },
  });
}

function mapNutrient(item: ProductRow["nutrients"][number], origin: "PRODUCT" | "BASE_PRODUCT") {
  return Object.freeze({
    nutrientId: item.nutrientId,
    nutrientCode: item.nutrient.code,
    nutrientName: item.nutrient.nameUa ?? item.nutrient.nameEn,
    unit: item.nutrient.unit,
    valuePer100g: item.valuePer100g.toString(),
    valueType: origin === "BASE_PRODUCT" ? ("ESTIMATED" as const) : item.valueType,
    origin,
  });
}

function mapProductSummary(row: ProductRow): ProductSummary {
  const details = mapProductDetails(row);
  const primaryMedia = details.media.find((media) => media.status === "ACTIVE") ?? null;

  return Object.freeze({
    id: details.id,
    type: details.type,
    nameEn: details.nameEn,
    nameUa: details.nameUa,
    gtin: details.gtin,
    categoryId: details.categoryId,
    categoryName: details.categoryName,
    brandId: details.brandId,
    brandName: details.brandName,
    sourceProvider: details.sourceProvider,
    sourceDataset: details.sourceDataset,
    foodState: details.foodState,
    foodCharacteristics: details.foodCharacteristics,
    status: details.status,
    verificationStatus: details.verificationStatus,
    verifiedByUserId: details.verifiedByUserId,
    verifiedAt: details.verifiedAt,
    verificationReadiness: evaluateProductVerification(details),
    updatedAt: details.updatedAt,
    primaryMedia,
  });
}

function mapMedia(row: {
  readonly id: string;
  readonly productId: string;
  readonly kind: ProductMediaRecord["kind"];
  readonly status: ProductMediaRecord["status"];
  readonly storageObjectPath: string;
  readonly mimeType: string | null;
  readonly byteSize: bigint | null;
  readonly widthPx: number | null;
  readonly heightPx: number | null;
  readonly checksumSha256: string | null;
  readonly altTextUa: string | null;
  readonly altTextEn: string | null;
  readonly isPrimary: boolean;
  readonly sortOrder: number;
  readonly createdAt: Date;
}): ProductMediaRecord {
  return Object.freeze({
    ...row,
    byteSize: row.byteSize?.toString() ?? null,
    createdAt: row.createdAt.toISOString(),
  });
}

function mapProductMutationError(error: unknown): unknown {
  if (isKnownPrismaError(error, "P2002")) return new ProductConflictError();
  if (isKnownPrismaError(error, "P2003")) {
    return new ProductInvariantError("A related category, brand, unit or nutrient does not exist");
  }
  return error;
}

function isKnownPrismaError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}
