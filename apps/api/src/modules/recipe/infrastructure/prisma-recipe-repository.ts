import { Prisma, type DatabaseClient } from "@mealmind/db";

import { RecipeConflictError, RecipeInvariantError } from "../application/recipe-errors.js";
import { RECIPE_CALCULATOR_VERSION } from "../application/recipe-nutrition-calculator.js";
import type {
  RecipeDetails,
  RecipeIngredientInput,
  RecipeListQuery,
  RecipeMutationData,
  RecipeRepository,
  RecipeSummary,
  RecipeUpdateData,
  ResolvedRecipeIngredient,
} from "../domain/recipe-repository.js";

const recipeInclude = {
  recipeType: { select: { nameUa: true, nameEn: true } },
  author: { select: { displayName: true, bio: true } },
  ingredients: {
    include: {
      product: { select: { nameUa: true, nameEn: true } },
      measurementUnit: { select: { symbol: true } },
    },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  },
  steps: { orderBy: [{ position: "asc" }, { id: "asc" }] },
  sources: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
  cuisines: {
    include: { cuisine: { select: { nameUa: true, nameEn: true } } },
    orderBy: { cuisine: { sortOrder: "asc" } },
  },
  dietaryTags: {
    include: { dietaryTag: { select: { nameUa: true, nameEn: true } } },
    orderBy: { dietaryTag: { sortOrder: "asc" } },
  },
  media: {
    where: { kind: "EXTERNAL_VIDEO", status: "ACTIVE" },
    include: { author: { select: { displayName: true } } },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  },
  nutrients: {
    include: {
      nutrient: {
        select: {
          code: true,
          nameUa: true,
          nameEn: true,
          unit: true,
          group: true,
          sortOrder: true,
        },
      },
    },
    orderBy: { nutrient: { sortOrder: "asc" } },
  },
} satisfies Prisma.RecipeInclude;

type RecipeRow = Prisma.RecipeGetPayload<{ include: typeof recipeInclude }>;

export function createPrismaRecipeRepository(database: DatabaseClient): RecipeRepository {
  const repository: RecipeRepository = {
    async list(query) {
      const where = listWhere(query);
      const [rows, total] = await database.$transaction([
        database.recipe.findMany({
          where,
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
          include: recipeInclude,
        }),
        database.recipe.count({ where }),
      ]);
      return Object.freeze({
        items: Object.freeze(rows.map(mapSummary)),
        page: query.page,
        pageSize: query.pageSize,
        total,
      });
    },

    async findAdminById(id) {
      const row = await database.recipe.findUnique({ where: { id }, include: recipeInclude });
      return row === null ? null : mapDetails(row);
    },

    async findPublicById(id) {
      const row = await database.recipe.findFirst({
        where: { id, status: "PUBLISHED", visibility: "PUBLIC" },
        include: recipeInclude,
      });
      return row === null ? null : mapDetails(row);
    },

    async resolveIngredients(inputs) {
      return resolveIngredients(database, inputs);
    },

    async create(data, actorUserId) {
      try {
        const row = await database.$transaction(
          async (transaction) =>
            await transaction.recipe.create({
              data: createData(data, actorUserId),
              include: recipeInclude,
            }),
        );
        return mapDetails(row);
      } catch (error) {
        throw mapMutationError(error);
      }
    },

    async update(id, data, actorUserId) {
      try {
        const row = await database.$transaction(async (transaction) => {
          const existing = await transaction.recipe.findUnique({
            where: { id },
            select: { nutrients: { select: { inputFingerprint: true }, take: 1 } },
          });
          if (existing === null) return null;
          const fingerprint =
            data.ingredientFingerprint ?? existing.nutrients[0]?.inputFingerprint ?? "0".repeat(64);
          return await transaction.recipe.update({
            where: { id },
            data: updateData(data, actorUserId, fingerprint),
            include: recipeInclude,
          });
        });
        return row === null ? null : mapDetails(row);
      } catch (error) {
        throw mapMutationError(error);
      }
    },

    async updateStatus(id, status) {
      try {
        const row = await database.recipe.update({
          where: { id },
          data: {
            status,
            ...(status === "PUBLISHED" ? { publishedAt: new Date(), archivedAt: null } : {}),
            ...(status === "ARCHIVED" ? { archivedAt: new Date() } : {}),
            ...(status === "DRAFT" || status === "READY"
              ? { publishedAt: null, archivedAt: null }
              : {}),
          },
          include: recipeInclude,
        });
        return mapDetails(row);
      } catch (error) {
        if (isKnownPrismaError(error, "P2025")) return null;
        throw mapMutationError(error);
      }
    },
  };
  return Object.freeze(repository);
}

function listWhere(query: RecipeListQuery): Prisma.RecipeWhereInput {
  return {
    ...(query.status === undefined ? {} : { status: query.status }),
    ...(query.visibility === undefined ? {} : { visibility: query.visibility }),
    ...(query.recipeTypeId === undefined ? {} : { recipeTypeId: query.recipeTypeId }),
    ...(query.authorId === undefined ? {} : { authorId: query.authorId }),
    ...(query.search === undefined
      ? {}
      : {
          OR: [
            { title: { contains: query.search, mode: "insensitive" } },
            { summary: { contains: query.search, mode: "insensitive" } },
            { author: { displayName: { contains: query.search, mode: "insensitive" } } },
          ],
        }),
  };
}

async function resolveIngredients(
  database: DatabaseClient,
  inputs: readonly RecipeIngredientInput[],
): Promise<readonly ResolvedRecipeIngredient[]> {
  const productIds = [...new Set(inputs.map((item) => item.productId))];
  const unitIds = [
    ...new Set(inputs.flatMap((item) => (item.measurementUnitId ? [item.measurementUnitId] : []))),
  ];
  const [products, units] = await Promise.all([
    database.product.findMany({
      where: { id: { in: productIds }, status: { not: "ARCHIVED" } },
      select: {
        id: true,
        nameUa: true,
        nameEn: true,
        nutrients: { select: { nutrientId: true, valuePer100g: true } },
        portions: {
          where: { isActive: true },
          select: { id: true, amount: true, gramWeight: true },
        },
      },
    }),
    database.measurementUnit.findMany({
      where: { id: { in: unitIds }, isActive: true },
      select: { id: true, symbol: true, dimension: true, factorToBaseUnit: true },
    }),
  ]);
  const productById = new Map(products.map((product) => [product.id, product]));
  const unitById = new Map(units.map((unit) => [unit.id, unit]));

  return Object.freeze(
    inputs.map((input, position) => {
      const product = productById.get(input.productId);
      if (product === undefined)
        throw new RecipeInvariantError("Ingredient product is unavailable");
      const quantity = Number(input.quantity);
      let gramWeight: number;
      let conversionMethod: ResolvedRecipeIngredient["conversionMethod"];
      let unitSymbol: string | null = null;

      if (input.productPortionId) {
        const portion = product.portions.find((item) => item.id === input.productPortionId);
        if (portion === undefined)
          throw new RecipeInvariantError("Product portion does not belong to ingredient product");
        gramWeight = (quantity * Number(portion.gramWeight)) / Number(portion.amount);
        conversionMethod = "PRODUCT_PORTION";
      } else if (input.measurementUnitId) {
        const unit = unitById.get(input.measurementUnitId);
        if (unit === undefined || unit.dimension !== "MASS") {
          throw new RecipeInvariantError("Only mass units can be converted directly to grams");
        }
        gramWeight = quantity * Number(unit.factorToBaseUnit);
        conversionMethod = "DIRECT_MASS";
        unitSymbol = unit.symbol;
      } else if (input.gramWeight !== undefined && input.gramWeight !== null) {
        gramWeight = Number(input.gramWeight);
        conversionMethod = "MANUAL";
      } else {
        throw new RecipeInvariantError(
          "Ingredient requires a mass unit, product portion or manual gram weight",
        );
      }

      if (!Number.isFinite(gramWeight) || gramWeight <= 0 || gramWeight > 1_000_000) {
        throw new RecipeInvariantError("Ingredient gram weight is outside the supported range");
      }

      return Object.freeze({
        ...input,
        position: position + 1,
        gramWeight: decimalString(gramWeight, 4),
        conversionMethod,
        productName: product.nameUa ?? product.nameEn,
        measurementUnitSymbol: unitSymbol,
        nutrients: Object.freeze(
          product.nutrients.map((item) => ({
            nutrientId: item.nutrientId,
            valuePer100g: item.valuePer100g.toString(),
          })),
        ),
      });
    }),
  );
}

function createData(data: RecipeMutationData, actorUserId: string): Prisma.RecipeCreateInput {
  return {
    title: data.title,
    ...(data.summary === undefined ? {} : { summary: data.summary }),
    ...(data.description === undefined ? {} : { description: data.description }),
    status: "DRAFT",
    visibility: data.visibility,
    ...(data.difficulty === undefined ? {} : { difficulty: data.difficulty }),
    ...(data.baseServings === undefined ? {} : { baseServings: data.baseServings }),
    ...(data.yieldWeightG === undefined ? {} : { yieldWeightG: data.yieldWeightG }),
    ...(data.prepTimeMin === undefined ? {} : { prepTimeMin: data.prepTimeMin }),
    ...(data.cookTimeMin === undefined ? {} : { cookTimeMin: data.cookTimeMin }),
    ...(data.restTimeMin === undefined ? {} : { restTimeMin: data.restTimeMin }),
    ...(data.recipeTypeId ? { recipeType: { connect: { id: data.recipeTypeId } } } : {}),
    ...(data.authorId ? { author: { connect: { id: data.authorId } } } : {}),
    ...(data.originalRecipeId
      ? { originalRecipe: { connect: { id: data.originalRecipeId } } }
      : {}),
    createdByUser: { connect: { id: actorUserId } },
    ingredients: { create: data.ingredients.map(ingredientData) },
    steps: { create: data.steps.map(stepData) },
    sources: { create: data.sources.map(sourceData) },
    cuisines: {
      create: data.cuisineIds.map((cuisineId) => ({ cuisine: { connect: { id: cuisineId } } })),
    },
    dietaryTags: {
      create: dietaryTagData(data.dietaryTagIds, data.ingredientFingerprint, actorUserId),
    },
    media: { create: data.videos.map((item) => videoData(item, actorUserId)) },
    nutrients: { create: data.nutrients.map(nutrientData) },
  };
}

function updateData(
  data: RecipeUpdateData,
  actorUserId: string,
  fingerprint: string,
): Prisma.RecipeUpdateInput {
  return {
    ...(data.title === undefined ? {} : { title: data.title }),
    ...(data.summary === undefined ? {} : { summary: data.summary }),
    ...(data.description === undefined ? {} : { description: data.description }),
    ...(data.visibility === undefined ? {} : { visibility: data.visibility }),
    ...(data.difficulty === undefined ? {} : { difficulty: data.difficulty }),
    ...(data.baseServings === undefined ? {} : { baseServings: data.baseServings }),
    ...(data.yieldWeightG === undefined ? {} : { yieldWeightG: data.yieldWeightG }),
    ...(data.prepTimeMin === undefined ? {} : { prepTimeMin: data.prepTimeMin }),
    ...(data.cookTimeMin === undefined ? {} : { cookTimeMin: data.cookTimeMin }),
    ...(data.restTimeMin === undefined ? {} : { restTimeMin: data.restTimeMin }),
    ...(data.recipeTypeId === undefined ? {} : relationUpdate("recipeType", data.recipeTypeId)),
    ...(data.authorId === undefined ? {} : relationUpdate("author", data.authorId)),
    ...(data.originalRecipeId === undefined
      ? {}
      : relationUpdate("originalRecipe", data.originalRecipeId)),
    ...(data.ingredients === undefined
      ? {}
      : { ingredients: { deleteMany: {}, create: data.ingredients.map(ingredientData) } }),
    ...(data.steps === undefined
      ? {}
      : {
          steps: {
            deleteMany: {},
            create: data.steps.map(stepData),
          },
        }),
    ...(data.sources === undefined
      ? {}
      : { sources: { deleteMany: {}, create: data.sources.map(sourceData) } }),
    ...(data.cuisineIds === undefined
      ? {}
      : {
          cuisines: {
            deleteMany: {},
            create: data.cuisineIds.map((cuisineId) => ({
              cuisine: { connect: { id: cuisineId } },
            })),
          },
        }),
    ...(data.dietaryTagIds === undefined
      ? {}
      : {
          dietaryTags: {
            deleteMany: {},
            create: dietaryTagData(data.dietaryTagIds, fingerprint, actorUserId),
          },
        }),
    ...(data.videos === undefined
      ? {}
      : {
          media: {
            deleteMany: { kind: "EXTERNAL_VIDEO" },
            create: data.videos.map((item) => videoData(item, actorUserId)),
          },
        }),
    ...(data.nutrients === undefined
      ? {}
      : { nutrients: { deleteMany: {}, create: data.nutrients.map(nutrientData) } }),
  };
}

function relationUpdate(name: "recipeType" | "author" | "originalRecipe", id: string | null) {
  return { [name]: id === null ? { disconnect: true } : { connect: { id } } };
}

function ingredientData(item: ResolvedRecipeIngredient) {
  return {
    product: { connect: { id: item.productId } },
    quantity: item.quantity,
    ...(item.measurementUnitId
      ? { measurementUnit: { connect: { id: item.measurementUnitId } } }
      : {}),
    ...(item.productPortionId
      ? { productPortion: { connect: { id: item.productPortionId } } }
      : {}),
    gramWeight: item.gramWeight,
    conversionMethod: item.conversionMethod,
    isOptional: item.isOptional,
    position: item.position,
    ...(item.note === undefined ? {} : { note: item.note }),
  };
}

function stepData(item: RecipeMutationData["steps"][number], position: number) {
  return {
    instruction: item.instruction,
    position: position + 1,
    ...(item.timerSeconds === undefined ? {} : { timerSeconds: item.timerSeconds }),
  };
}

function sourceData(item: RecipeMutationData["sources"][number]) {
  return {
    kind: item.kind,
    url: item.url,
    ...(item.title === undefined ? {} : { title: item.title }),
  };
}

function nutrientData(item: RecipeMutationData["nutrients"][number]) {
  return {
    nutrient: { connect: { id: item.nutrientId } },
    valueTotal: item.valueTotal,
    completeness: item.completeness,
    ingredientCount: item.ingredientCount,
    coveredIngredientCount: item.coveredIngredientCount,
    inputFingerprint: item.inputFingerprint,
    calculationMethod: "INGREDIENT_SUM" as const,
    calculatorVersion: RECIPE_CALCULATOR_VERSION,
    calculatedAt: new Date(),
  };
}

function dietaryTagData(ids: readonly string[], fingerprint: string, actorUserId: string) {
  return ids.map((dietaryTagId) => ({
    dietaryTag: { connect: { id: dietaryTagId } },
    validationMethod: "MANUAL_REVIEW" as const,
    ingredientFingerprint: fingerprint,
    validatedBy: { connect: { id: actorUserId } },
    validatedAt: new Date(),
  }));
}

function videoData(item: RecipeMutationData["videos"][number], actorUserId: string) {
  return {
    kind: "EXTERNAL_VIDEO" as const,
    status: "ACTIVE" as const,
    platform: item.platform,
    externalUrl: item.externalUrl,
    ...(item.title === undefined ? {} : { title: item.title }),
    ...(item.durationSec === undefined ? {} : { durationSec: item.durationSec }),
    ...(item.authorId ? { author: { connect: { id: item.authorId } } } : {}),
    createdByUser: { connect: { id: actorUserId } },
    sortOrder: item.sortOrder,
    verifiedAt: new Date(),
  };
}

function mapSummary(row: RecipeRow): RecipeSummary {
  return Object.freeze({
    id: row.id,
    title: row.title,
    status: row.status,
    visibility: row.visibility,
    difficulty: row.difficulty,
    recipeTypeName: row.recipeType?.nameUa ?? row.recipeType?.nameEn ?? null,
    authorName: row.author?.displayName ?? null,
    baseServings: row.baseServings,
    updatedAt: row.updatedAt.toISOString(),
  });
}

function mapDetails(row: RecipeRow): RecipeDetails {
  const baseServings = row.baseServings;
  const yieldWeight = row.yieldWeightG === null ? null : Number(row.yieldWeightG);
  return Object.freeze({
    ...mapSummary(row),
    summary: row.summary,
    description: row.description,
    recipeTypeId: row.recipeTypeId,
    authorId: row.authorId,
    author:
      row.author === null ? null : { displayName: row.author.displayName, bio: row.author.bio },
    yieldWeightG: decimalOrNull(row.yieldWeightG),
    prepTimeMin: row.prepTimeMin,
    cookTimeMin: row.cookTimeMin,
    restTimeMin: row.restTimeMin,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    ingredients: Object.freeze(
      row.ingredients.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.nameUa ?? item.product.nameEn,
        quantity: item.quantity.toString(),
        measurementUnitId: item.measurementUnitId,
        measurementUnitSymbol: item.measurementUnit?.symbol ?? null,
        productPortionId: item.productPortionId,
        gramWeight: item.gramWeight?.toString() ?? "0",
        conversionMethod: item.conversionMethod ?? "MANUAL",
        isOptional: item.isOptional,
        position: item.position,
        note: item.note,
      })),
    ),
    steps: Object.freeze(
      row.steps.map((item) => ({
        id: item.id,
        position: item.position,
        instruction: item.instruction,
        timerSeconds: item.timerSeconds,
      })),
    ),
    sources: Object.freeze(
      row.sources.map((item) => ({
        id: item.id,
        kind: item.kind,
        title: item.title,
        url: item.url,
      })),
    ),
    cuisines: Object.freeze(
      row.cuisines.map((item) => ({
        id: item.cuisineId,
        name: item.cuisine.nameUa ?? item.cuisine.nameEn,
      })),
    ),
    dietaryTags: Object.freeze(
      row.dietaryTags.map((item) => ({
        id: item.dietaryTagId,
        name: item.dietaryTag.nameUa ?? item.dietaryTag.nameEn,
      })),
    ),
    videos: Object.freeze(
      row.media.map((item) => ({
        id: item.id,
        platform: item.platform ?? "OTHER",
        title: item.title,
        externalUrl: item.externalUrl ?? "",
        durationSec: item.durationSec,
        authorId: item.authorId,
        authorName: item.author?.displayName ?? null,
        sortOrder: item.sortOrder,
      })),
    ),
    nutrients: Object.freeze(
      row.nutrients.map((item) => {
        const total = Number(item.valueTotal);
        return {
          nutrientId: item.nutrientId,
          code: item.nutrient.code,
          name: item.nutrient.nameUa ?? item.nutrient.nameEn,
          unit: item.nutrient.unit,
          group: item.nutrient.group,
          sortOrder: item.nutrient.sortOrder,
          valueTotal: decimalString(total, 8),
          valuePerServing: baseServings === null ? null : decimalString(total / baseServings, 4),
          valuePer100g:
            yieldWeight === null || yieldWeight <= 0
              ? null
              : decimalString((total * 100) / yieldWeight, 4),
          completeness: item.completeness,
          ingredientCount: item.ingredientCount,
          coveredIngredientCount: item.coveredIngredientCount,
        };
      }),
    ),
  });
}

function decimalOrNull(value: Prisma.Decimal | null): string | null {
  return value === null ? null : value.toString();
}

function decimalString(value: number, scale: number): string {
  return value.toFixed(scale).replace(/\.?0+$/, "");
}

function mapMutationError(error: unknown): Error {
  if (isKnownPrismaError(error, "P2002")) return new RecipeConflictError();
  if (isKnownPrismaError(error, "P2003") || isKnownPrismaError(error, "P2025")) {
    return new RecipeInvariantError("Recipe references an unavailable related record");
  }
  return error instanceof Error ? error : new Error("Recipe persistence failed");
}

function isKnownPrismaError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}
