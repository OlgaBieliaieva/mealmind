import { Prisma, type DatabaseClient } from "@mealmind/db";

import type {
  JsonObject,
  JsonValue,
  ProductImportCandidateDetails,
  ProductImportCandidateEvent,
  ProductImportCandidateListQuery,
  ProductImportCandidateSummary,
  ProductImportCatalogMatch,
  ProductImportReviewRepository,
} from "../domain/product-import-review-repository.js";

const candidateInclude = {
  batch: {
    select: {
      provider: true,
      dataset: true,
      generatedAt: true,
      sourceLocale: true,
      localizedLocale: true,
    },
  },
  reviewedByUser: { select: { email: true } },
  events: {
    include: { actor: { select: { email: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.ProductImportCandidateInclude;

const catalogProductSelect = {
  id: true,
  gtin: true,
  nameUa: true,
  nameEn: true,
  brand: { select: { name: true } },
  category: { select: { nameUa: true, nameEn: true } },
} satisfies Prisma.ProductSelect;

type CandidateRow = Prisma.ProductImportCandidateGetPayload<{ include: typeof candidateInclude }>;
type CatalogProductRow = Prisma.ProductGetPayload<{ select: typeof catalogProductSelect }>;

export function createPrismaProductImportReviewRepository(
  database: DatabaseClient,
): ProductImportReviewRepository {
  const repository: ProductImportReviewRepository = {
    async list(query) {
      const where = candidateWhere(query);
      const [rows, total] = await database.$transaction([
        database.productImportCandidate.findMany({
          where,
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          include: { reviewedByUser: { select: { email: true } } },
        }),
        database.productImportCandidate.count({ where }),
      ]);

      return Object.freeze({
        items: Object.freeze(rows.map(mapCandidateSummary)),
        page: query.page,
        pageSize: query.pageSize,
        total,
      });
    },

    async findById(id) {
      const row = await database.productImportCandidate.findUnique({
        where: { id },
        include: candidateInclude,
      });
      return row === null ? null : mapCandidateDetails(row);
    },

    async findCatalogMatches(candidate) {
      const exactPackages =
        candidate.normalizedGtin === null
          ? []
          : await database.productPackage.findMany({
              where: { gtin: candidate.normalizedGtin },
              select: {
                id: true,
                gtin: true,
                product: { select: catalogProductSelect },
              },
            });
      const exactProductIds = new Set(exactPackages.map((item) => item.product.id));
      const exactMatches = exactPackages.map<ProductImportCatalogMatch>((item) =>
        mapCatalogMatch(item.product, "GTIN", item.id, item.gtin),
      );

      const similarityConditions = buildSimilarityConditions(candidate);
      if (similarityConditions.length === 0) return Object.freeze(exactMatches);

      const similarWhere: Prisma.ProductWhereInput = {
        ...(exactProductIds.size === 0 ? {} : { id: { notIn: [...exactProductIds] } }),
        type: "BRANDED",
        status: { not: "ARCHIVED" },
        OR: similarityConditions,
      };
      const similar = await database.product.findMany({
        where: similarWhere,
        take: 5,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        select: catalogProductSelect,
      });
      return Object.freeze([
        ...exactMatches,
        ...similar.map((product) =>
          mapCatalogMatch(product, "SIMILAR_PRODUCT", null, product.gtin),
        ),
      ]);
    },

    async mutate(input) {
      return database.$transaction(async (transaction) => {
        const updated = await transaction.productImportCandidate.updateMany({
          where: {
            id: input.id,
            status: input.fromStatus,
            updatedAt: new Date(input.expectedUpdatedAt),
            ...(input.fromStatus === "IN_REVIEW" ? { reviewedByUserId: input.actorUserId } : {}),
          },
          data: {
            status: input.toStatus,
            reviewedByUserId: input.actorUserId,
            ...(input.reviewDraft === undefined
              ? {}
              : { reviewDraft: input.reviewDraft as Prisma.InputJsonValue }),
            ...(input.reviewedAt === undefined ? {} : { reviewedAt: input.reviewedAt }),
          },
        });
        if (updated.count !== 1) return null;

        await transaction.productImportCandidateEvent.create({
          data: {
            candidateId: input.id,
            action: input.action,
            actorUserId: input.actorUserId,
            fromStatus: input.fromStatus,
            toStatus: input.toStatus,
            ...(input.changeSet === undefined
              ? {}
              : { changeSet: input.changeSet as Prisma.InputJsonValue }),
            comment: input.comment ?? null,
          },
        });

        const row = await transaction.productImportCandidate.findUniqueOrThrow({
          where: { id: input.id },
          include: candidateInclude,
        });
        return mapCandidateDetails(row);
      });
    },
  };

  return Object.freeze(repository);
}

function candidateWhere(
  query: ProductImportCandidateListQuery,
): Prisma.ProductImportCandidateWhereInput {
  const search = query.search?.trim();
  return {
    ...(query.batchId === undefined ? {} : { batchId: query.batchId }),
    ...(query.disposition === undefined ? {} : { disposition: query.disposition }),
    ...(query.status === undefined ? {} : { status: query.status }),
    ...(query.matchStatus === undefined ? {} : { matchStatus: query.matchStatus }),
    ...(query.reviewedByUserId === undefined ? {} : { reviewedByUserId: query.reviewedByUserId }),
    ...(query.reasonCode === undefined
      ? {}
      : { reasonCodes: { array_contains: [query.reasonCode] } }),
    ...(search === undefined
      ? {}
      : {
          OR: [
            { sourceSku: { contains: search, mode: "insensitive" } },
            { normalizedGtin: { contains: search } },
            { reviewDraft: { path: ["title"], string_contains: search, mode: "insensitive" } },
            { reviewDraft: { path: ["brandName"], string_contains: search, mode: "insensitive" } },
          ],
        }),
  };
}

function mapCandidateSummary(
  row: Prisma.ProductImportCandidateGetPayload<{
    include: { reviewedByUser: { select: { email: true } } };
  }>,
): ProductImportCandidateSummary {
  const draft = asJsonObject(row.reviewDraft);
  return Object.freeze({
    id: row.id,
    batchId: row.batchId,
    storeExternalId: row.storeExternalId,
    sourceSku: row.sourceSku,
    disposition: row.disposition,
    status: row.status,
    reasonCodes: Object.freeze(asStringArray(row.reasonCodes)),
    matchStatus: row.matchStatus,
    normalizedGtin: row.normalizedGtin,
    title: stringValue(draft.title),
    brandName: stringValue(draft.brandName),
    sourceImageUrl: stringValue(draft.sourceImageUrl),
    reviewedByUserId: row.reviewedByUserId,
    reviewedByEmail: row.reviewedByUser?.email ?? null,
    reviewedAt: iso(row.reviewedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function mapCandidateDetails(row: CandidateRow): ProductImportCandidateDetails {
  return Object.freeze({
    ...mapCandidateSummary(row),
    classificationDecision: row.classificationDecision,
    sourceCategoryIds: asJsonValue(row.sourceCategoryIds),
    sourceDraft: asJsonObject(row.sourceDraft),
    reviewDraft: asJsonObject(row.reviewDraft),
    fieldProvenance: asJsonValue(row.fieldProvenance),
    sourceSnapshots: asJsonValue(row.sourceSnapshots),
    batch: Object.freeze({
      provider: row.batch.provider,
      dataset: row.batch.dataset,
      generatedAt: row.batch.generatedAt.toISOString(),
      sourceLocale: row.batch.sourceLocale,
      localizedLocale: row.batch.localizedLocale,
    }),
    events: Object.freeze(row.events.map(mapEvent)),
    publishedProductId: row.publishedProductId,
    publishedPackageId: row.publishedPackageId,
  });
}

function mapEvent(row: CandidateRow["events"][number]): ProductImportCandidateEvent {
  return Object.freeze({
    id: row.id,
    action: row.action,
    actorUserId: row.actorUserId,
    actorEmail: row.actor?.email ?? null,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    changeSet: row.changeSet === null ? null : asJsonValue(row.changeSet),
    comment: row.comment,
    createdAt: row.createdAt.toISOString(),
  });
}

function buildSimilarityConditions(
  candidate: ProductImportCandidateDetails,
): Prisma.ProductWhereInput[] {
  const conditions: Prisma.ProductWhereInput[] = [];
  if (candidate.brandName) {
    conditions.push({ brand: { name: { equals: candidate.brandName, mode: "insensitive" } } });
  }
  const titleToken = candidate.title?.split(/[^\p{L}\p{N}]+/u).find((token) => token.length >= 4);
  if (titleToken) {
    conditions.push({
      OR: [
        { nameUa: { contains: titleToken, mode: "insensitive" } },
        { nameEn: { contains: titleToken, mode: "insensitive" } },
      ],
    });
  }
  return conditions;
}

function mapCatalogMatch(
  product: CatalogProductRow,
  matchReason: ProductImportCatalogMatch["matchReason"],
  packageId: string | null,
  gtin: string | null,
): ProductImportCatalogMatch {
  return Object.freeze({
    productId: product.id,
    packageId,
    name: product.nameUa ?? product.nameEn,
    brandName: product.brand?.name ?? null,
    categoryName: product.category.nameUa ?? product.category.nameEn,
    gtin,
    matchReason,
  });
}

function asJsonValue(value: Prisma.JsonValue): JsonValue {
  return value as JsonValue;
}

function asJsonObject(value: Prisma.JsonValue): JsonObject {
  if (value === null || Array.isArray(value) || typeof value !== "object") return Object.freeze({});
  return value as JsonObject;
}

function asStringArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function stringValue(value: JsonValue | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function iso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}
