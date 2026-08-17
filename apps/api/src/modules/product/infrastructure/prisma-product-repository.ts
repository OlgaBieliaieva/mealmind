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

const productInclude = {
  category: { select: { nameUa: true, nameEn: true } },
  brand: { select: { name: true } },
  defaultMeasurementUnit: { select: { symbol: true } },
  baseProduct: { select: { nameUa: true, nameEn: true } },
  nutrients: {
    include: { nutrient: { select: { nameUa: true, nameEn: true, unit: true } } },
    orderBy: [{ nutrient: { sortOrder: "asc" } }, { nutrientId: "asc" }],
  },
  portions: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
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

    async create(data) {
      try {
        const row = await database.product.create({
          data: productCreateData(data),
          include: productInclude,
        });
        return mapProductDetails(row);
      } catch (error) {
        throw mapProductMutationError(error);
      }
    },

    async update(id, data) {
      try {
        const row = await database.product.update({
          where: { id },
          data: productUpdateData(data),
          include: productInclude,
        });
        return mapProductDetails(row);
      } catch (error) {
        if (isKnownPrismaError(error, "P2025")) return null;
        throw mapProductMutationError(error);
      }
    },

    async updateStatus(id, status) {
      try {
        const row = await database.product.update({
          where: { id },
          data: { status, archivedAt: status === "ARCHIVED" ? new Date() : null },
          include: productInclude,
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
  });
}

function productCreateData(data: ProductWrite): Prisma.ProductCreateInput {
  return {
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
    ...(data.ediblePortionPercent === undefined
      ? {}
      : { ediblePortionPercent: data.ediblePortionPercent }),
    status: data.status,
    ...(data.notes === undefined ? {} : { notes: data.notes }),
    archivedAt: data.status === "ARCHIVED" ? new Date() : null,
    nutrients: { create: data.nutrients.map(nutrientCreateData) },
    portions: { create: data.portions.map(portionCreateData) },
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
    ...(data.ediblePortionPercent === undefined
      ? {}
      : { ediblePortionPercent: data.ediblePortionPercent }),
    ...(data.notes === undefined ? {} : { notes: data.notes }),
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
    foodState: row.foodState,
    ediblePortionPercent: row.ediblePortionPercent?.toString() ?? null,
    status: row.status,
    verificationStatus: row.verificationStatus,
    notes: row.notes,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    nutrients: Object.freeze(
      row.nutrients.map((item) =>
        Object.freeze({
          nutrientId: item.nutrientId,
          nutrientName: item.nutrient.nameUa ?? item.nutrient.nameEn,
          unit: item.nutrient.unit,
          valuePer100g: item.valuePer100g.toString(),
          valueType: item.valueType,
        }),
      ),
    ),
    portions: Object.freeze(
      row.portions.map((portion) =>
        Object.freeze({
          id: portion.id,
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
    media: Object.freeze(row.media.map(mapMedia)),
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
    status: details.status,
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
