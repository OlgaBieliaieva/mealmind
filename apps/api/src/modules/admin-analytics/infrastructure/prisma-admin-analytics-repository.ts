import { Prisma, type DatabaseClient } from "@mealmind/db";

import type {
  AdminAnalyticsRepository,
  OverviewAnalyticsSnapshot,
  ProductsAnalyticsSnapshot,
  RecipesAnalyticsSnapshot,
  UsersAnalyticsSnapshot,
} from "../domain/admin-analytics-repository.js";
import type {
  AnalyticsRankingItem,
  AnalyticsGranularity,
  ProductsAnalyticsPoint,
  ResolvedAnalyticsPeriod,
  UsersAnalyticsPoint,
} from "../domain/admin-analytics-types.js";

interface SeriesRow {
  readonly period: Date;
  readonly users: bigint;
  readonly families: bigint;
  readonly profiles: bigint;
}

interface ProductSeriesRow {
  readonly period: Date;
  readonly value: bigint;
}

interface ProductSourceRow {
  readonly source: "USDA" | "MEALMIND_ADMIN" | "MEALMIND_USER" | "UNASSIGNED";
  readonly value: bigint;
}

interface RecipeAuthorTypeRow {
  readonly authorType: "MEALMIND" | "EXPERT" | "BLOGGER" | "USER" | "UNASSIGNED";
  readonly value: bigint;
}

export function createPrismaAdminAnalyticsRepository(
  database: DatabaseClient,
): AdminAnalyticsRepository {
  return Object.freeze({
    async getOverview(period: ResolvedAnalyticsPeriod): Promise<OverviewAnalyticsSnapshot> {
      const timestampRange = createdAtRange(period.from, addOneDay(period.to), period.timezone);
      const dateRange = {
        gte: new Date(`${period.from}T00:00:00.000Z`),
        lt: new Date(`${addOneDay(period.to)}T00:00:00.000Z`),
      };
      const [
        activeUsers,
        createdUsers,
        activeFamilies,
        createdFamilies,
        productsTotal,
        productsAwaitingVerification,
        recipesTotal,
        recipeDrafts,
        scheduledMealPlans,
        completedCookingSessions,
        confirmedConsumptionEntries,
      ] = await Promise.all([
        database.user.count({ where: { deletedAt: null } }),
        database.user.count({ where: { createdAt: timestampRange } }),
        database.family.count({ where: { archivedAt: null } }),
        database.family.count({ where: { createdAt: timestampRange } }),
        database.product.count(),
        database.product.count({
          where: { archivedAt: null, status: { not: "ARCHIVED" }, verificationStatus: "UNVERIFIED" },
        }),
        database.recipe.count(),
        database.recipe.count({ where: { archivedAt: null, status: "DRAFT" } }),
        database.mealPlan.count({ where: { weekStart: dateRange } }),
        database.cookingSession.count({
          where: { status: "COMPLETED", completedAt: timestampRange },
        }),
        database.consumptionEntry.count({
          where: { status: "CONFIRMED", consumedAt: timestampRange },
        }),
      ]);

      return Object.freeze({
        users: Object.freeze({ active: activeUsers, created: createdUsers }),
        families: Object.freeze({ active: activeFamilies, created: createdFamilies }),
        products: Object.freeze({
          total: productsTotal,
          awaitingVerification: productsAwaitingVerification,
        }),
        recipes: Object.freeze({ total: recipesTotal, drafts: recipeDrafts }),
        activity: Object.freeze({
          scheduledMealPlans,
          completedCookingSessions,
          confirmedConsumptionEntries,
        }),
      });
    },
    async getUsers(period: ResolvedAnalyticsPeriod): Promise<UsersAnalyticsSnapshot> {
      const currentRange = createdAtRange(period.from, addOneDay(period.to), period.timezone);
      const previousRange = createdAtRange(period.previousFrom, period.from, period.timezone);

      const [
        activeUsers,
        deletedUsers,
        activeFamilies,
        archivedFamilies,
        activeProfiles,
        archivedProfiles,
        completedOnboarding,
        completedProfiles,
        activeMemberships,
        activeFamilyMembers,
        currentCreatedUsers,
        previousCreatedUsers,
        currentCreatedFamilies,
        previousCreatedFamilies,
        currentCreatedProfiles,
        previousCreatedProfiles,
        series,
      ] = await Promise.all([
        database.user.count({ where: { deletedAt: null } }),
        database.user.count({ where: { deletedAt: { not: null } } }),
        database.family.count({ where: { archivedAt: null } }),
        database.family.count({ where: { archivedAt: { not: null } } }),
        database.personProfile.count({ where: { archivedAt: null } }),
        database.personProfile.count({ where: { archivedAt: { not: null } } }),
        database.user.count({
          where: { deletedAt: null, onboardingCompletedAt: { not: null } },
        }),
        database.personProfile.count({
          where: { archivedAt: null, profileCompletedAt: { not: null } },
        }),
        database.familyMembership.count({
          where: { status: "ACTIVE", family: { archivedAt: null }, user: { deletedAt: null } },
        }),
        database.familyMember.count({
          where: {
            archivedAt: null,
            family: { archivedAt: null },
            personProfile: { archivedAt: null },
          },
        }),
        database.user.count({ where: { createdAt: currentRange } }),
        database.user.count({ where: { createdAt: previousRange } }),
        database.family.count({ where: { createdAt: currentRange } }),
        database.family.count({ where: { createdAt: previousRange } }),
        database.personProfile.count({ where: { createdAt: currentRange } }),
        database.personProfile.count({ where: { createdAt: previousRange } }),
        usersSeries(database, period),
      ]);

      return Object.freeze({
        activeUsers,
        deletedUsers,
        activeFamilies,
        archivedFamilies,
        activeProfiles,
        archivedProfiles,
        completedOnboarding,
        completedProfiles,
        activeMemberships,
        activeFamilyMembers,
        currentCreatedUsers,
        previousCreatedUsers,
        currentCreatedFamilies,
        previousCreatedFamilies,
        currentCreatedProfiles,
        previousCreatedProfiles,
        series,
      });
    },
    async getProducts(
      period: ResolvedAnalyticsPeriod,
      generatedAt: Date,
    ): Promise<ProductsAnalyticsSnapshot> {
      const currentRange = createdAtRange(period.from, addOneDay(period.to), period.timezone);
      const previousRange = createdAtRange(period.previousFrom, period.from, period.timezone);
      const activeWhere = { archivedAt: null, status: { not: "ARCHIVED" as const } };
      const [
        total,
        createdLast24Hours,
        awaitingVerification,
        drafts,
        currentCreated,
        previousCreated,
        types,
        foodStates,
        statuses,
        verification,
        sources,
        categories,
        brands,
        favorites,
        series,
      ] = await Promise.all([
        database.product.count(),
        database.product.count({
          where: {
            ...activeWhere,
            createdAt: { gte: new Date(generatedAt.getTime() - 86_400_000) },
          },
        }),
        database.product.count({
          where: { ...activeWhere, verificationStatus: "UNVERIFIED" },
        }),
        database.product.count({ where: { archivedAt: null, status: "DRAFT" } }),
        database.product.count({ where: { createdAt: currentRange } }),
        database.product.count({ where: { createdAt: previousRange } }),
        database.product.groupBy({ by: ["type"], _count: { _all: true } }),
        database.product.groupBy({ by: ["foodState"], _count: { _all: true } }),
        database.product.groupBy({ by: ["status"], _count: { _all: true } }),
        database.product.groupBy({ by: ["verificationStatus"], _count: { _all: true } }),
        productSources(database),
        productCategoryRanking(database),
        productBrandRanking(database),
        productFavoriteRanking(database),
        productsSeries(database, period),
      ]);

      const typeCounts = countsByKey(types, "type");
      const foodStateCounts = countsByKey(foodStates, "foodState");
      const statusCounts = countsByKey(statuses, "status");
      const verificationCounts = countsByKey(verification, "verificationStatus");
      const sourceCounts = new Map(sources.map((row) => [row.source, Number(row.value)]));

      return Object.freeze({
        total,
        createdLast24Hours,
        awaitingVerification,
        drafts,
        currentCreated,
        previousCreated,
        types: Object.freeze({
          GENERIC: typeCounts.get("GENERIC") ?? 0,
          BRANDED: typeCounts.get("BRANDED") ?? 0,
        }),
        foodStates: Object.freeze({
          UNSPECIFIED: foodStateCounts.get("UNSPECIFIED") ?? 0,
          RAW: foodStateCounts.get("RAW") ?? 0,
          COOKED: foodStateCounts.get("COOKED") ?? 0,
          PROCESSED: foodStateCounts.get("PROCESSED") ?? 0,
          READY_TO_EAT: foodStateCounts.get("READY_TO_EAT") ?? 0,
        }),
        statuses: Object.freeze({
          DRAFT: statusCounts.get("DRAFT") ?? 0,
          ACTIVE: statusCounts.get("ACTIVE") ?? 0,
          ARCHIVED: statusCounts.get("ARCHIVED") ?? 0,
        }),
        verification: Object.freeze({
          UNVERIFIED: verificationCounts.get("UNVERIFIED") ?? 0,
          VERIFIED: verificationCounts.get("VERIFIED") ?? 0,
          REJECTED: verificationCounts.get("REJECTED") ?? 0,
        }),
        sources: Object.freeze({
          USDA: sourceCounts.get("USDA") ?? 0,
          MEALMIND_ADMIN: sourceCounts.get("MEALMIND_ADMIN") ?? 0,
          MEALMIND_USER: sourceCounts.get("MEALMIND_USER") ?? 0,
          UNASSIGNED: sourceCounts.get("UNASSIGNED") ?? 0,
        }),
        categories,
        brands,
        favorites,
        series,
      });
    },
    async getRecipes(period: ResolvedAnalyticsPeriod): Promise<RecipesAnalyticsSnapshot> {
      const currentRange = createdAtRange(period.from, addOneDay(period.to), period.timezone);
      const previousRange = createdAtRange(period.previousFrom, period.from, period.timezone);
      const activeWhere = { archivedAt: null, status: { not: "ARCHIVED" as const } };
      const [
        total,
        drafts,
        familyOnly,
        currentCreated,
        previousCreated,
        statuses,
        visibility,
        difficulties,
        authorTypes,
        createdByUsers,
        createdBySystem,
        recipeTypes,
        cuisines,
        dietaryTags,
        authors,
        favorites,
        series,
      ] = await Promise.all([
        database.recipe.count(),
        database.recipe.count({ where: { archivedAt: null, status: "DRAFT" } }),
        database.recipe.count({ where: { ...activeWhere, visibility: "FAMILY" } }),
        database.recipe.count({ where: { createdAt: currentRange } }),
        database.recipe.count({ where: { createdAt: previousRange } }),
        database.recipe.groupBy({ by: ["status"], _count: { _all: true } }),
        database.recipe.groupBy({ by: ["visibility"], _count: { _all: true } }),
        database.recipe.groupBy({ by: ["difficulty"], _count: { _all: true } }),
        recipeAuthorTypes(database),
        database.recipe.count({ where: { createdByUserId: { not: null } } }),
        database.recipe.count({ where: { createdByUserId: null } }),
        recipeTypeRanking(database),
        recipeCuisineRanking(database),
        recipeDietaryTagRanking(database),
        recipeAuthorRanking(database),
        recipeFavoriteRanking(database),
        recipesSeries(database, period),
      ]);

      const statusCounts = countsByKey(statuses, "status");
      const visibilityCounts = countsByKey(visibility, "visibility");
      const difficultyCounts = new Map(
        difficulties.map((row) => [row.difficulty ?? "UNASSIGNED", row._count._all]),
      );
      const authorTypeCounts = new Map(
        authorTypes.map((row) => [row.authorType, Number(row.value)]),
      );

      return Object.freeze({
        total,
        drafts,
        familyOnly,
        currentCreated,
        previousCreated,
        statuses: Object.freeze({
          DRAFT: statusCounts.get("DRAFT") ?? 0,
          READY: statusCounts.get("READY") ?? 0,
          PUBLISHED: statusCounts.get("PUBLISHED") ?? 0,
          ARCHIVED: statusCounts.get("ARCHIVED") ?? 0,
        }),
        visibility: Object.freeze({
          FAMILY: visibilityCounts.get("FAMILY") ?? 0,
          PUBLIC: visibilityCounts.get("PUBLIC") ?? 0,
        }),
        difficulties: Object.freeze({
          EASY: difficultyCounts.get("EASY") ?? 0,
          MEDIUM: difficultyCounts.get("MEDIUM") ?? 0,
          HARD: difficultyCounts.get("HARD") ?? 0,
          UNASSIGNED: difficultyCounts.get("UNASSIGNED") ?? 0,
        }),
        authorTypes: Object.freeze({
          MEALMIND: authorTypeCounts.get("MEALMIND") ?? 0,
          EXPERT: authorTypeCounts.get("EXPERT") ?? 0,
          BLOGGER: authorTypeCounts.get("BLOGGER") ?? 0,
          USER: authorTypeCounts.get("USER") ?? 0,
          UNASSIGNED: authorTypeCounts.get("UNASSIGNED") ?? 0,
        }),
        creatorOrigins: Object.freeze({
          USER: createdByUsers,
          SYSTEM: createdBySystem,
        }),
        recipeTypes,
        cuisines,
        dietaryTags,
        authors,
        favorites,
        series,
      });
    },
    async getReferences() {
      const [
        allergens,
        authors,
        brands,
        cuisines,
        dietaryTags,
        mealTypes,
        measurementUnits,
        nutrients,
        productCategories,
        recipeTypes,
        brandStatuses,
        brandVerification,
        activeUnverifiedBrands,
        authorTypes,
        categoriesWithoutProducts,
        recipeTypesWithoutRecipes,
        cuisinesWithoutRecipes,
        dietaryTagsWithoutUsage,
      ] = await Promise.all([
        booleanResource(database.allergen),
        archivedResource(database.author),
        brandResource(database),
        booleanResource(database.cuisine),
        booleanResource(database.dietaryTag),
        booleanResource(database.mealType),
        booleanResource(database.measurementUnit),
        booleanResource(database.nutrient),
        booleanResource(database.productCategory),
        booleanResource(database.recipeType),
        database.brand.groupBy({ by: ["status"], _count: { _all: true } }),
        database.brand.groupBy({ by: ["verificationStatus"], _count: { _all: true } }),
        database.brand.count({
          where: {
            archivedAt: null,
            status: { not: "ARCHIVED" },
            verificationStatus: "UNVERIFIED",
          },
        }),
        database.author.groupBy({ by: ["type"], _count: { _all: true } }),
        database.productCategory.count({ where: { products: { none: {} } } }),
        database.recipeType.count({ where: { recipes: { none: {} } } }),
        database.cuisine.count({ where: { recipeLinks: { none: {} } } }),
        database.dietaryTag.count({
          where: { recipeLinks: { none: {} }, productLinks: { none: {} } },
        }),
      ]);

      const statusCounts = countsByKey(brandStatuses, "status");
      const verificationCounts = countsByKey(brandVerification, "verificationStatus");
      const authorTypeCounts = countsByKey(authorTypes, "type");
      return Object.freeze({
        resources: Object.freeze([
          resourceMetric("allergens", allergens),
          resourceMetric("authors", authors),
          resourceMetric("brands", brands),
          resourceMetric("cuisines", cuisines),
          resourceMetric("dietary-tags", dietaryTags),
          resourceMetric("meal-types", mealTypes),
          resourceMetric("measurement-units", measurementUnits),
          resourceMetric("nutrients", nutrients),
          resourceMetric("product-categories", productCategories),
          resourceMetric("recipe-types", recipeTypes),
        ]),
        brands: Object.freeze({
          statuses: Object.freeze({
            DRAFT: statusCounts.get("DRAFT") ?? 0,
            ACTIVE: statusCounts.get("ACTIVE") ?? 0,
            ARCHIVED: statusCounts.get("ARCHIVED") ?? 0,
          }),
          verification: Object.freeze({
            UNVERIFIED: verificationCounts.get("UNVERIFIED") ?? 0,
            VERIFIED: verificationCounts.get("VERIFIED") ?? 0,
            REJECTED: verificationCounts.get("REJECTED") ?? 0,
          }),
        }),
        authors: Object.freeze({
          types: Object.freeze({
            MEALMIND: authorTypeCounts.get("MEALMIND") ?? 0,
            EXPERT: authorTypeCounts.get("EXPERT") ?? 0,
            BLOGGER: authorTypeCounts.get("BLOGGER") ?? 0,
            USER: authorTypeCounts.get("USER") ?? 0,
          }),
        }),
        quality: Object.freeze({
          brandsAwaitingVerification: activeUnverifiedBrands,
          draftBrands: statusCounts.get("DRAFT") ?? 0,
          categoriesWithoutProducts,
          recipeTypesWithoutRecipes,
          cuisinesWithoutRecipes,
          dietaryTagsWithoutUsage,
        }),
      });
    },
  });
}

type CountDelegate = {
  count(args?: { readonly where?: Readonly<Record<string, unknown>> }): Promise<number>;
};

async function booleanResource(delegate: CountDelegate) {
  const [total, active] = await Promise.all([
    delegate.count(),
    delegate.count({ where: { isActive: true } }),
  ]);
  return { total, active };
}

async function archivedResource(delegate: CountDelegate) {
  const [total, active] = await Promise.all([
    delegate.count(),
    delegate.count({ where: { archivedAt: null } }),
  ]);
  return { total, active };
}

async function brandResource(database: DatabaseClient) {
  const [total, active] = await Promise.all([
    database.brand.count(),
    database.brand.count({ where: { status: "ACTIVE", archivedAt: null } }),
  ]);
  return { total, active };
}

function resourceMetric(
  resource: import("../domain/admin-analytics-types.js").AnalyticsReferenceResource,
  counts: { readonly total: number; readonly active: number },
) {
  return Object.freeze({
    resource,
    total: counts.total,
    active: counts.active,
    inactive: counts.total - counts.active,
  });
}

function countsByKey<TKey extends string, TField extends string>(
  rows: readonly (Record<TField, TKey> & { readonly _count: { readonly _all: number } })[],
  field: TField,
): ReadonlyMap<TKey, number> {
  return new Map(rows.map((row) => [row[field], row._count._all]));
}

async function productSources(database: DatabaseClient): Promise<readonly ProductSourceRow[]> {
  return database.$queryRaw<ProductSourceRow[]>(Prisma.sql`
    WITH primary_sources AS (
      SELECT DISTINCT ON (product_id)
        product_id,
        provider
      FROM product_source_references
      WHERE is_primary = true
      ORDER BY product_id, created_at ASC, id ASC
    )
    SELECT
      CASE primary_sources.provider::text
        WHEN 'usda' THEN 'USDA'
        WHEN 'mealmind_admin' THEN 'MEALMIND_ADMIN'
        WHEN 'mealmind_user' THEN 'MEALMIND_USER'
        ELSE 'UNASSIGNED'
      END AS source,
      COUNT(products.id)::bigint AS value
    FROM products
    LEFT JOIN primary_sources ON primary_sources.product_id = products.id
    GROUP BY source
  `);
}

async function productCategoryRanking(
  database: DatabaseClient,
): Promise<readonly AnalyticsRankingItem[]> {
  const rows = await database.product.groupBy({
    by: ["categoryId"],
    where: { archivedAt: null, status: { not: "ARCHIVED" } },
    _count: { _all: true },
    orderBy: { _count: { categoryId: "desc" } },
    take: 10,
  });
  const labels = await database.productCategory.findMany({
    where: { id: { in: rows.map((row) => row.categoryId) } },
    select: { id: true, nameUa: true, nameEn: true },
  });
  return rankingWithLabels(
    rows,
    labels.map((category) => ({
      id: category.id,
      name: category.nameUa || category.nameEn,
    })),
    "categoryId",
  );
}

async function productBrandRanking(
  database: DatabaseClient,
): Promise<readonly AnalyticsRankingItem[]> {
  const rows = await database.product.groupBy({
    by: ["brandId"],
    where: { archivedAt: null, status: { not: "ARCHIVED" }, brandId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { brandId: "desc" } },
    take: 10,
  });
  const normalizedRows = rows.filter(
    (row): row is typeof row & { readonly brandId: string } => row.brandId !== null,
  );
  const labels = await database.brand.findMany({
    where: { id: { in: normalizedRows.map((row) => row.brandId) } },
    select: { id: true, name: true },
  });
  return rankingWithLabels(normalizedRows, labels, "brandId");
}

async function productFavoriteRanking(
  database: DatabaseClient,
): Promise<readonly AnalyticsRankingItem[]> {
  const rows = await database.productFavorite.groupBy({
    by: ["productId"],
    where: { product: { archivedAt: null, status: { not: "ARCHIVED" } } },
    _count: { _all: true },
    orderBy: { _count: { productId: "desc" } },
    take: 10,
  });
  const products = await database.product.findMany({
    where: { id: { in: rows.map((row) => row.productId) } },
    select: { id: true, nameUa: true, nameEn: true },
  });
  const labels = products.map((product) => ({
    id: product.id,
    name: product.nameUa ?? product.nameEn,
  }));
  return rankingWithLabels(rows, labels, "productId");
}

async function recipeAuthorTypes(
  database: DatabaseClient,
): Promise<readonly RecipeAuthorTypeRow[]> {
  return database.$queryRaw<RecipeAuthorTypeRow[]>(Prisma.sql`
    SELECT
      CASE authors.type::text
        WHEN 'mealmind' THEN 'MEALMIND'
        WHEN 'expert' THEN 'EXPERT'
        WHEN 'blogger' THEN 'BLOGGER'
        WHEN 'user' THEN 'USER'
        ELSE 'UNASSIGNED'
      END AS "authorType",
      COUNT(recipes.id)::bigint AS value
    FROM recipes
    LEFT JOIN authors ON authors.id = recipes.author_id
    GROUP BY "authorType"
  `);
}

async function recipeTypeRanking(
  database: DatabaseClient,
): Promise<readonly AnalyticsRankingItem[]> {
  const rows = await database.recipe.groupBy({
    by: ["recipeTypeId"],
    where: { archivedAt: null, status: { not: "ARCHIVED" }, recipeTypeId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { recipeTypeId: "desc" } },
    take: 10,
  });
  const normalized = rows.filter(
    (row): row is typeof row & { readonly recipeTypeId: string } => row.recipeTypeId !== null,
  );
  const entities = await database.recipeType.findMany({
    where: { id: { in: normalized.map((row) => row.recipeTypeId) } },
    select: { id: true, nameUa: true, nameEn: true },
  });
  return rankingWithLabels(
    normalized,
    entities.map((item) => ({ id: item.id, name: item.nameUa || item.nameEn })),
    "recipeTypeId",
  );
}

async function recipeCuisineRanking(
  database: DatabaseClient,
): Promise<readonly AnalyticsRankingItem[]> {
  const rows = await database.recipeCuisine.groupBy({
    by: ["cuisineId"],
    where: { recipe: { archivedAt: null, status: { not: "ARCHIVED" } } },
    _count: { _all: true },
    orderBy: { _count: { cuisineId: "desc" } },
    take: 10,
  });
  const entities = await database.cuisine.findMany({
    where: { id: { in: rows.map((row) => row.cuisineId) } },
    select: { id: true, nameUa: true, nameEn: true },
  });
  return rankingWithLabels(
    rows,
    entities.map((item) => ({ id: item.id, name: item.nameUa || item.nameEn })),
    "cuisineId",
  );
}

async function recipeDietaryTagRanking(
  database: DatabaseClient,
): Promise<readonly AnalyticsRankingItem[]> {
  const rows = await database.recipeDietaryTag.groupBy({
    by: ["dietaryTagId"],
    where: { recipe: { archivedAt: null, status: { not: "ARCHIVED" } } },
    _count: { _all: true },
    orderBy: { _count: { dietaryTagId: "desc" } },
    take: 10,
  });
  const entities = await database.dietaryTag.findMany({
    where: { id: { in: rows.map((row) => row.dietaryTagId) } },
    select: { id: true, nameUa: true, nameEn: true },
  });
  return rankingWithLabels(
    rows,
    entities.map((item) => ({ id: item.id, name: item.nameUa || item.nameEn })),
    "dietaryTagId",
  );
}

async function recipeAuthorRanking(
  database: DatabaseClient,
): Promise<readonly AnalyticsRankingItem[]> {
  const rows = await database.recipe.groupBy({
    by: ["authorId"],
    where: { archivedAt: null, status: { not: "ARCHIVED" }, authorId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { authorId: "desc" } },
    take: 10,
  });
  const normalized = rows.filter(
    (row): row is typeof row & { readonly authorId: string } => row.authorId !== null,
  );
  const entities = await database.author.findMany({
    where: { id: { in: normalized.map((row) => row.authorId) } },
    select: { id: true, displayName: true },
  });
  return rankingWithLabels(
    normalized,
    entities.map((item) => ({ id: item.id, name: item.displayName })),
    "authorId",
  );
}

async function recipeFavoriteRanking(
  database: DatabaseClient,
): Promise<readonly AnalyticsRankingItem[]> {
  const rows = await database.recipeFavorite.groupBy({
    by: ["recipeId"],
    where: { recipe: { archivedAt: null, status: { not: "ARCHIVED" } } },
    _count: { _all: true },
    orderBy: { _count: { recipeId: "desc" } },
    take: 10,
  });
  const entities = await database.recipe.findMany({
    where: { id: { in: rows.map((row) => row.recipeId) } },
    select: { id: true, title: true },
  });
  return rankingWithLabels(
    rows,
    entities.map((item) => ({ id: item.id, name: item.title })),
    "recipeId",
  );
}

function rankingWithLabels<
  TKey extends string,
  TRow extends Record<TKey, string> & { readonly _count: { readonly _all: number } },
>(
  rows: readonly TRow[],
  labels: readonly { readonly id: string; readonly name: string }[],
  key: TKey,
): readonly AnalyticsRankingItem[] {
  const labelsById = new Map(labels.map((item) => [item.id, item.name]));
  return Object.freeze(
    rows.map((row) =>
      Object.freeze({
        id: row[key],
        label: labelsById.get(row[key]) ?? "Невідомо",
        value: row._count._all,
      }),
    ),
  );
}

async function recipesSeries(
  database: DatabaseClient,
  period: ResolvedAnalyticsPeriod,
): Promise<readonly ProductsAnalyticsPoint[]> {
  const unit = period.granularity;
  const step = seriesStep(period.granularity);
  const rows = await database.$queryRaw<ProductSeriesRow[]>(Prisma.sql`
    WITH parameters AS (
      SELECT
        ${period.from}::date AS from_date,
        ${period.to}::date AS to_date,
        ${period.timezone}::text AS timezone
    ), buckets AS (
      SELECT generate_series(
        date_trunc(${unit}, from_date::timestamp),
        date_trunc(${unit}, to_date::timestamp),
        ${step}
      ) AS bucket
      FROM parameters
    )
    SELECT
      buckets.bucket::date AS period,
      COUNT(recipes.id)::bigint AS value
    FROM buckets
    CROSS JOIN parameters
    LEFT JOIN recipes
      ON (recipes.created_at AT TIME ZONE parameters.timezone) >= buckets.bucket
      AND (recipes.created_at AT TIME ZONE parameters.timezone) < buckets.bucket + ${step}
      AND (recipes.created_at AT TIME ZONE parameters.timezone) >= parameters.from_date
      AND (recipes.created_at AT TIME ZONE parameters.timezone) < parameters.to_date + INTERVAL '1 day'
    GROUP BY buckets.bucket
    ORDER BY buckets.bucket
  `);
  return Object.freeze(
    rows.map((row) =>
      Object.freeze({ period: row.period.toISOString().slice(0, 10), value: Number(row.value) }),
    ),
  );
}

async function productsSeries(
  database: DatabaseClient,
  period: ResolvedAnalyticsPeriod,
): Promise<readonly ProductsAnalyticsPoint[]> {
  const unit = period.granularity;
  const step = seriesStep(period.granularity);
  const rows = await database.$queryRaw<ProductSeriesRow[]>(Prisma.sql`
    WITH parameters AS (
      SELECT
        ${period.from}::date AS from_date,
        ${period.to}::date AS to_date,
        ${period.timezone}::text AS timezone
    ), buckets AS (
      SELECT generate_series(
        date_trunc(${unit}, from_date::timestamp),
        date_trunc(${unit}, to_date::timestamp),
        ${step}
      ) AS bucket
      FROM parameters
    )
    SELECT
      buckets.bucket::date AS period,
      COUNT(products.id)::bigint AS value
    FROM buckets
    CROSS JOIN parameters
    LEFT JOIN products
      ON (products.created_at AT TIME ZONE parameters.timezone) >= buckets.bucket
      AND (products.created_at AT TIME ZONE parameters.timezone) < buckets.bucket + ${step}
      AND (products.created_at AT TIME ZONE parameters.timezone) >= parameters.from_date
      AND (products.created_at AT TIME ZONE parameters.timezone) < parameters.to_date + INTERVAL '1 day'
    GROUP BY buckets.bucket
    ORDER BY buckets.bucket
  `);
  return Object.freeze(
    rows.map((row) =>
      Object.freeze({ period: row.period.toISOString().slice(0, 10), value: Number(row.value) }),
    ),
  );
}

async function usersSeries(
  database: DatabaseClient,
  period: ResolvedAnalyticsPeriod,
): Promise<readonly UsersAnalyticsPoint[]> {
  const unit = period.granularity;
  const step = seriesStep(period.granularity);
  const rows = await database.$queryRaw<SeriesRow[]>(Prisma.sql`
    WITH parameters AS (
      SELECT
        ${period.from}::date AS from_date,
        ${period.to}::date AS to_date,
        ${period.timezone}::text AS timezone
    ), buckets AS (
      SELECT generate_series(
        date_trunc(${unit}, from_date::timestamp),
        date_trunc(${unit}, to_date::timestamp),
        ${step}
      ) AS bucket
      FROM parameters
    ), events AS (
      SELECT created_at, 'users'::text AS kind FROM users
      UNION ALL
      SELECT created_at, 'families'::text AS kind FROM families
      UNION ALL
      SELECT created_at, 'profiles'::text AS kind FROM person_profiles
    )
    SELECT
      buckets.bucket::date AS period,
      COUNT(events.created_at) FILTER (WHERE events.kind = 'users')::bigint AS users,
      COUNT(events.created_at) FILTER (WHERE events.kind = 'families')::bigint AS families,
      COUNT(events.created_at) FILTER (WHERE events.kind = 'profiles')::bigint AS profiles
    FROM buckets
    CROSS JOIN parameters
    LEFT JOIN events
      ON events.created_at >= buckets.bucket AT TIME ZONE parameters.timezone
      AND events.created_at < (buckets.bucket + ${step}) AT TIME ZONE parameters.timezone
      AND events.created_at >= parameters.from_date::timestamp AT TIME ZONE parameters.timezone
      AND events.created_at < (parameters.to_date + 1)::timestamp AT TIME ZONE parameters.timezone
    GROUP BY buckets.bucket
    ORDER BY buckets.bucket ASC
  `);

  return Object.freeze(
    rows.map((row) =>
      Object.freeze({
        period: row.period.toISOString().slice(0, 10),
        users: Number(row.users),
        families: Number(row.families),
        profiles: Number(row.profiles),
      }),
    ),
  );
}

function seriesStep(granularity: AnalyticsGranularity): Prisma.Sql {
  switch (granularity) {
    case "day":
      return Prisma.sql`INTERVAL '1 day'`;
    case "week":
      return Prisma.sql`INTERVAL '1 week'`;
    case "month":
      return Prisma.sql`INTERVAL '1 month'`;
  }
}

function createdAtRange(from: string, toExclusive: string, timezone: string) {
  return {
    gte: localMidnight(from, timezone),
    lt: localMidnight(toExclusive, timezone),
  };
}

function localMidnight(value: string, timezone: string): Date {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
  });
  const offset = formatter
    .formatToParts(new Date(`${value}T12:00:00.000Z`))
    .find((part) => part.type === "timeZoneName")?.value;
  const isoOffset = offset === "GMT" ? "+00:00" : offset?.replace("GMT", "");
  return new Date(`${value}T00:00:00${isoOffset ?? "+00:00"}`);
}

function addOneDay(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
