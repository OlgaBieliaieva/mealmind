import { Prisma, type DatabaseClient } from "@mealmind/db";

import type {
  FoodKind,
  FoodRepository,
  FoodSearchItem,
  FoodSearchQuery,
  ProductFoodDetails,
  RecipeFoodDetails,
} from "../domain/food-repository.js";

interface SearchRow {
  readonly kind: string | null;
  readonly id: string | null;
  readonly name: string | null;
  readonly summary: string | null;
  readonly categoryId: string | null;
  readonly categoryCode: string | null;
  readonly categoryName: string | null;
  readonly brandName: string | null;
  readonly difficulty: string | null;
  readonly totalTimeMin: number | null;
  readonly recipeTypeId: string | null;
  readonly recipeTypeCode: string | null;
  readonly recipeTypeName: string | null;
  readonly authorId: string | null;
  readonly authorName: string | null;
  readonly authorType: string | null;
  readonly cuisineNames: readonly string[] | null;
  readonly dietaryTagNames: readonly string[] | null;
  readonly imageObjectPath: string | null;
  readonly nutritionBasis: string | null;
  readonly energyKcal: number | null;
  readonly proteinG: number | null;
  readonly fatG: number | null;
  readonly carbohydrateG: number | null;
  readonly isFavorite: boolean | null;
  readonly total: number;
}

export function createPrismaFoodRepository(database: DatabaseClient): FoodRepository {
  const repository: FoodRepository = {
    async search(familyId, query) {
      const rows = await searchFood(database, familyId, query);
      const first = rows[0];

      return {
        items: rows.flatMap(mapSearchRow),
        page: query.page,
        pageSize: query.pageSize,
        total: first?.total ?? 0,
      };
    },

    async findProduct(familyId, id) {
      const product = await database.product.findFirst({
        where: { id, status: "ACTIVE", archivedAt: null },
        select: {
          id: true,
          nameEn: true,
          nameUa: true,
          foodState: true,
          category: { select: { id: true, code: true, nameUa: true } },
          brand: {
            select: {
              nameUa: true,
              name: true,
              countryCode: true,
              websiteUrl: true,
            },
          },
          media: {
            where: { status: "ACTIVE", archivedAt: null },
            select: { storageObjectPath: true },
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
            take: 1,
          },
          defaultMeasurementUnit: { select: { id: true, symbol: true } },
          favorites: { where: { familyId }, select: { familyId: true } },
          nutrients: {
            select: {
              valuePer100g: true,
              valueType: true,
              nutrient: {
                select: {
                  id: true,
                  code: true,
                  nameUa: true,
                  group: true,
                  unit: true,
                  sortOrder: true,
                },
              },
            },
            orderBy: { nutrient: { sortOrder: "asc" } },
          },
          portions: {
            where: { isActive: true },
            select: {
              id: true,
              amount: true,
              gramWeight: true,
              labelEn: true,
              labelUa: true,
              measurementUnit: { select: { symbol: true } },
            },
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          },
          recipeIngredients: {
            where: {
              recipe: {
                status: "PUBLISHED",
                archivedAt: null,
                OR: [{ visibility: "PUBLIC" }, { visibility: "FAMILY", familyId }],
              },
            },
            select: {
              recipe: {
                select: {
                  id: true,
                  title: true,
                  summary: true,
                  difficulty: true,
                  prepTimeMin: true,
                  cookTimeMin: true,
                  restTimeMin: true,
                  baseServings: true,
                  yieldWeightG: true,
                  recipeType: { select: { code: true, nameUa: true } },
                  author: { select: { displayName: true, type: true } },
                  cuisines: { select: { cuisine: { select: { nameUa: true } } } },
                  dietaryTags: {
                    select: { dietaryTag: { select: { nameUa: true } } },
                  },
                  media: {
                    where: { kind: "STORED_IMAGE", status: "ACTIVE", archivedAt: null },
                    select: { storageObjectPath: true },
                    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
                    take: 1,
                  },
                  nutrients: {
                    where: {
                      nutrient: {
                        code: { in: ["energy_kcal", "protein", "total_fat", "carbohydrate"] },
                      },
                    },
                    select: {
                      valueTotal: true,
                      nutrient: { select: { code: true } },
                    },
                  },
                  favorites: { where: { familyId }, select: { familyId: true } },
                },
              },
            },
            orderBy: { recipe: { publishedAt: "desc" } },
            take: 6,
          },
        },
      });

      if (!product) return null;

      const relatedRecipes = uniqueById(product.recipeIngredients.map((item) => item.recipe));

      return {
        kind: "product",
        id: product.id,
        name: product.nameUa ?? product.nameEn,
        nameEn: product.nameEn,
        category: {
          id: product.category.id,
          code: product.category.code,
          name: product.category.nameUa,
        },
        brand: product.brand
          ? {
              name: product.brand.name,
              countryCode: product.brand.countryCode,
              websiteUrl: product.brand.websiteUrl,
            }
          : null,
        imageObjectPath: product.media[0]?.storageObjectPath ?? null,
        imageUrl: null,
        foodState: product.foodState,
        defaultUnit: product.defaultMeasurementUnit,
        isFavorite: product.favorites.length > 0,
        nutrients: product.nutrients.map(({ nutrient, valuePer100g, valueType }) => ({
          id: nutrient.id,
          code: nutrient.code,
          name: nutrient.nameUa,
          group: nutrient.group,
          unit: nutrient.unit,
          valuePer100g: valuePer100g.toString(),
          completeness: valueType,
        })),
        portions: product.portions.map((portion) => ({
          id: portion.id,
          amount: portion.amount.toString(),
          gramWeight: portion.gramWeight.toString(),
          label: portion.labelUa ?? portion.labelEn,
          unitSymbol: portion.measurementUnit?.symbol ?? null,
        })),
        relatedRecipes: relatedRecipes.map((recipe) => ({
          id: recipe.id,
          title: recipe.title,
          summary: recipe.summary,
          difficulty: recipe.difficulty,
          recipeType: recipe.recipeType
            ? { code: recipe.recipeType.code, name: recipe.recipeType.nameUa }
            : null,
          cuisines: recipe.cuisines.map(({ cuisine }) => cuisine.nameUa),
          dietaryTags: recipe.dietaryTags.map(({ dietaryTag }) => dietaryTag.nameUa),
          author: recipe.author
            ? {
                name: recipe.author.displayName,
                type: recipe.author.type,
              }
            : null,
          totalTimeMin: sumTime(recipe),
          imageObjectPath: recipe.media[0]?.storageObjectPath ?? null,
          imageUrl: null,
          nutrition: recipeCardNutrition(recipe),
          isFavorite: recipe.favorites.length > 0,
        })),
      } satisfies ProductFoodDetails;
    },

    async findRecipe(familyId, id) {
      const recipe = await database.recipe.findFirst({
        where: {
          id,
          status: "PUBLISHED",
          archivedAt: null,
          OR: [{ visibility: "PUBLIC" }, { visibility: "FAMILY", familyId }],
        },
        select: {
          id: true,
          title: true,
          summary: true,
          description: true,
          difficulty: true,
          baseServings: true,
          yieldWeightG: true,
          prepTimeMin: true,
          cookTimeMin: true,
          restTimeMin: true,
          recipeType: { select: { code: true, nameUa: true } },
          author: {
            select: {
              displayName: true,
              bio: true,
              type: true,
              avatarObjectPath: true,
              links: {
                select: { id: true, type: true, url: true },
                orderBy: { position: "asc" },
              },
            },
          },
          favorites: { where: { familyId }, select: { familyId: true } },
          ingredients: {
            select: {
              id: true,
              quantity: true,
              gramWeight: true,
              isOptional: true,
              note: true,
              position: true,
              measurementUnit: { select: { symbol: true } },
              product: {
                select: {
                  id: true,
                  nameUa: true,
                  nameEn: true,
                  category: { select: { code: true, nameUa: true } },
                  media: {
                    where: { status: "ACTIVE", archivedAt: null },
                    select: { storageObjectPath: true },
                    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
                    take: 1,
                  },
                  nutrients: {
                    select: {
                      valuePer100g: true,
                      nutrient: {
                        select: {
                          id: true,
                          code: true,
                          nameUa: true,
                          group: true,
                          unit: true,
                          sortOrder: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: { position: "asc" },
          },
          steps: {
            select: { id: true, position: true, instruction: true, timerSeconds: true },
            orderBy: { position: "asc" },
          },
          cuisines: {
            select: { cuisine: { select: { id: true, nameUa: true } } },
          },
          dietaryTags: {
            select: { dietaryTag: { select: { id: true, nameUa: true } } },
          },
          sources: {
            select: { id: true, title: true, url: true },
            orderBy: { createdAt: "asc" },
          },
          media: {
            where: {
              status: "ACTIVE",
              archivedAt: null,
            },
            select: {
              id: true,
              kind: true,
              platform: true,
              title: true,
              externalUrl: true,
              storageObjectPath: true,
              altTextUa: true,
              durationSec: true,
              isPrimary: true,
            },
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
          },
          nutrients: {
            select: {
              valueTotal: true,
              completeness: true,
              nutrient: {
                select: {
                  id: true,
                  code: true,
                  nameUa: true,
                  group: true,
                  unit: true,
                  sortOrder: true,
                },
              },
            },
            orderBy: { nutrient: { sortOrder: "asc" } },
          },
        },
      });

      if (!recipe) return null;
      const calculatedYieldWeightG =
        recipe.yieldWeightG?.toNumber() ??
        recipe.ingredients.reduce(
          (total, ingredient) => total + (ingredient.gramWeight?.toNumber() ?? 0),
          0,
        );
      const effectiveNutrients =
        recipe.nutrients.length > 0
          ? recipe.nutrients.map(({ nutrient, valueTotal, completeness }) => ({
              nutrient,
              valueTotal: valueTotal.toNumber(),
              completeness,
            }))
          : calculateRecipeNutrients(recipe.ingredients);

      return {
        kind: "recipe",
        id: recipe.id,
        title: recipe.title,
        summary: recipe.summary,
        description: recipe.description,
        difficulty: recipe.difficulty,
        recipeType: recipe.recipeType
          ? { code: recipe.recipeType.code, name: recipe.recipeType.nameUa }
          : null,
        author: recipe.author
          ? {
              name: recipe.author.displayName,
              bio: recipe.author.bio,
              type: recipe.author.type,
              avatarObjectPath: recipe.author.avatarObjectPath,
              avatarUrl: null,
              links: recipe.author.links,
            }
          : null,
        imageObjectPath:
          recipe.media.find(
            (media) => media.kind === "STORED_IMAGE" && media.storageObjectPath !== null,
          )?.storageObjectPath ?? null,
        imageUrl: null,
        baseServings: recipe.baseServings,
        yieldWeightG: calculatedYieldWeightG > 0 ? nutritionDecimal(calculatedYieldWeightG) : null,
        prepTimeMin: recipe.prepTimeMin,
        cookTimeMin: recipe.cookTimeMin,
        restTimeMin: recipe.restTimeMin,
        totalTimeMin: sumTime(recipe),
        isFavorite: recipe.favorites.length > 0,
        ingredients: recipe.ingredients.map((ingredient) => ({
          id: ingredient.id,
          productId: ingredient.product.id,
          productName: ingredient.product.nameUa ?? ingredient.product.nameEn,
          category: {
            code: ingredient.product.category.code,
            name: ingredient.product.category.nameUa,
          },
          imageObjectPath: ingredient.product.media[0]?.storageObjectPath ?? null,
          imageUrl: null,
          nutrition: ingredientNutrition(
            ingredient.product.nutrients,
            ingredient.gramWeight?.toNumber() ?? null,
          ),
          quantity: ingredient.quantity.toString(),
          gramWeight: ingredient.gramWeight?.toString() ?? null,
          unitSymbol: ingredient.measurementUnit?.symbol ?? null,
          isOptional: ingredient.isOptional,
          note: ingredient.note,
          position: ingredient.position,
        })),
        steps: recipe.steps,
        cuisines: recipe.cuisines.map(({ cuisine }) => ({
          id: cuisine.id,
          name: cuisine.nameUa,
        })),
        dietaryTags: recipe.dietaryTags.map(({ dietaryTag }) => ({
          id: dietaryTag.id,
          name: dietaryTag.nameUa,
        })),
        sources: recipe.sources,
        videos: recipe.media.flatMap((media) =>
          media.kind === "EXTERNAL_VIDEO" && media.externalUrl
            ? [
                {
                  id: media.id,
                  platform: media.platform,
                  title: media.title,
                  externalUrl: media.externalUrl,
                  durationSec: media.durationSec,
                },
              ]
            : [],
        ),
        images: recipe.media.flatMap((media) =>
          media.kind === "STORED_IMAGE" && media.storageObjectPath
            ? [
                {
                  id: media.id,
                  title: media.title,
                  altText: media.altTextUa,
                  imageObjectPath: media.storageObjectPath,
                  imageUrl: null,
                },
              ]
            : [],
        ),
        nutrients: effectiveNutrients.map(({ nutrient, valueTotal, completeness }) => ({
          id: nutrient.id,
          code: nutrient.code,
          name: nutrient.nameUa,
          group: nutrient.group,
          unit: nutrient.unit,
          valueTotal: nutritionDecimal(valueTotal),
          valuePerServing:
            recipe.baseServings && recipe.baseServings > 0
              ? nutritionDecimal(valueTotal / recipe.baseServings)
              : null,
          valuePer100g:
            calculatedYieldWeightG > 0
              ? nutritionDecimal((valueTotal * 100) / calculatedYieldWeightG)
              : null,
          completeness,
        })),
      } satisfies RecipeFoodDetails;
    },

    async addFavorite(familyId, userId, kind, id) {
      return database.$transaction(async (transaction) => {
        if (!(await isVisibleFood(transaction, familyId, kind, id))) return false;

        if (kind === "product") {
          await transaction.productFavorite.upsert({
            where: { familyId_productId: { familyId, productId: id } },
            create: { familyId, productId: id, createdByUserId: userId },
            update: {},
          });
        } else {
          await transaction.recipeFavorite.upsert({
            where: { familyId_recipeId: { familyId, recipeId: id } },
            create: { familyId, recipeId: id, createdByUserId: userId },
            update: {},
          });
        }

        return true;
      });
    },

    async removeFavorite(familyId, kind, id) {
      return database.$transaction(async (transaction) => {
        if (!(await isVisibleFood(transaction, familyId, kind, id))) return false;

        if (kind === "product") {
          await transaction.productFavorite.deleteMany({ where: { familyId, productId: id } });
        } else {
          await transaction.recipeFavorite.deleteMany({ where: { familyId, recipeId: id } });
        }

        return true;
      });
    },
  };

  return Object.freeze(repository);
}

async function searchFood(
  database: DatabaseClient,
  familyId: string,
  query: FoodSearchQuery,
): Promise<readonly SearchRow[]> {
  const escaped = query.query.replace(/[\\%_]/g, "\\$&");
  const pattern = `%${escaped}%`;
  const prefix = `${escaped}%`;
  const offset = (query.page - 1) * query.pageSize;
  const includeProducts = query.type !== "recipe";
  const includeRecipes = query.type !== "product";
  const recentRecipesFirst =
    query.type === "recipe" && query.query.length === 0 && !query.favoritesOnly;

  return database.$queryRaw<SearchRow[]>(Prisma.sql`
    WITH results AS (
      SELECT
        'product'::text AS kind,
        p.id::text AS id,
        COALESCE(p.name_ua, p.name_en) AS name,
        NULL::text AS summary,
        c.id::text AS "categoryId",
        c.code AS "categoryCode",
        c.name_ua AS "categoryName",
        COALESCE(b.name, b.name_ua, b.name_en) AS "brandName",
        NULL::text AS difficulty,
        NULL::integer AS "totalTimeMin",
        NULL::text AS "recipeTypeId",
        NULL::text AS "recipeTypeCode",
        NULL::text AS "recipeTypeName",
        NULL::text AS "authorId",
        NULL::text AS "authorName",
        NULL::text AS "authorType",
        ARRAY[]::text[] AS "cuisineNames",
        ARRAY[]::text[] AS "dietaryTagNames",
        pm.storage_object_path AS "imageObjectPath",
        'PER_100G'::text AS "nutritionBasis",
        nutrition."energyKcal",
        nutrition."proteinG",
        nutrition."fatG",
        nutrition."carbohydrateG",
        EXISTS (
          SELECT 1 FROM product_favorites pf
          WHERE pf.family_id = ${familyId}::uuid AND pf.product_id = p.id
        ) AS "isFavorite",
        CASE
          WHEN lower(COALESCE(p.name_ua, p.name_en)) = lower(${query.query}) THEN 0
          WHEN COALESCE(p.name_ua, p.name_en) ILIKE ${prefix} ESCAPE '\\' THEN 1
          ELSE 2
        END AS rank,
        p.created_at AS "sortDate"
      FROM products p
      JOIN product_categories c ON c.id = p.category_id
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN LATERAL (
        SELECT media.storage_object_path
        FROM product_media media
        WHERE media.product_id = p.id
          AND media.status = 'active'
          AND media.archived_at IS NULL
        ORDER BY media.is_primary DESC, (media.kind = 'product') DESC, media.sort_order, media.id
        LIMIT 1
      ) pm ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          MAX(CASE WHEN n.code = 'energy_kcal' THEN pn.value_per_100g END)::double precision AS "energyKcal",
          MAX(CASE WHEN n.code = 'protein' THEN pn.value_per_100g END)::double precision AS "proteinG",
          MAX(CASE WHEN n.code = 'total_fat' THEN pn.value_per_100g END)::double precision AS "fatG",
          MAX(CASE WHEN n.code = 'carbohydrate' THEN pn.value_per_100g END)::double precision AS "carbohydrateG"
        FROM product_nutrients pn
        JOIN nutrients n ON n.id = pn.nutrient_id
        WHERE pn.product_id = p.id
          AND n.code IN ('energy_kcal', 'protein', 'total_fat', 'carbohydrate')
      ) nutrition ON TRUE
      WHERE ${includeProducts}
        AND p.status = 'active'
        AND p.archived_at IS NULL
        AND (
          p.name_ua ILIKE ${pattern} ESCAPE '\\'
          OR p.name_en ILIKE ${pattern} ESCAPE '\\'
          OR b.name ILIKE ${pattern} ESCAPE '\\'
          OR b.name_ua ILIKE ${pattern} ESCAPE '\\'
          OR b.name_en ILIKE ${pattern} ESCAPE '\\'
        )
        AND (
          NOT ${query.favoritesOnly}
          OR EXISTS (
            SELECT 1 FROM product_favorites pf
            WHERE pf.family_id = ${familyId}::uuid AND pf.product_id = p.id
          )
        )

      UNION ALL

      SELECT
        'recipe'::text AS kind,
        r.id::text AS id,
        r.title AS name,
        r.summary,
        NULL::text AS "categoryId",
        NULL::text AS "categoryCode",
        NULL::text AS "categoryName",
        NULL::text AS "brandName",
        r.difficulty::text,
        CASE
          WHEN r.prep_time_min IS NULL AND r.cook_time_min IS NULL AND r.rest_time_min IS NULL
            THEN NULL
          ELSE COALESCE(r.prep_time_min, 0) + COALESCE(r.cook_time_min, 0) + COALESCE(r.rest_time_min, 0)
        END AS "totalTimeMin",
        rt.id::text AS "recipeTypeId",
        rt.code AS "recipeTypeCode",
        rt.name_ua AS "recipeTypeName",
        a.id::text AS "authorId",
        a.display_name AS "authorName",
        a.type::text AS "authorType",
        ARRAY(
          SELECT cuisine.name_ua
          FROM recipe_cuisines rc
          JOIN cuisines cuisine ON cuisine.id = rc.cuisine_id
          WHERE rc.recipe_id = r.id
          ORDER BY cuisine.sort_order, cuisine.name_ua
        )::text[] AS "cuisineNames",
        ARRAY(
          SELECT tag.name_ua
          FROM recipe_dietary_tags rdt
          JOIN dietary_tags tag ON tag.id = rdt.dietary_tag_id
          WHERE rdt.recipe_id = r.id
          ORDER BY tag.sort_order, tag.name_ua
        )::text[] AS "dietaryTagNames",
        rm.storage_object_path AS "imageObjectPath",
        CASE
          WHEN r.base_servings IS NOT NULL AND r.base_servings > 0 THEN 'PER_SERVING'
          ELSE 'PER_100G'
        END::text AS "nutritionBasis",
        nutrition."energyKcal",
        nutrition."proteinG",
        nutrition."fatG",
        nutrition."carbohydrateG",
        EXISTS (
          SELECT 1 FROM recipe_favorites rf
          WHERE rf.family_id = ${familyId}::uuid AND rf.recipe_id = r.id
        ) AS "isFavorite",
        CASE
          WHEN lower(r.title) = lower(${query.query}) THEN 0
          WHEN r.title ILIKE ${prefix} ESCAPE '\\' THEN 1
          ELSE 2
        END AS rank,
        COALESCE(r.published_at, r.created_at) AS "sortDate"
      FROM recipes r
      LEFT JOIN recipe_types rt ON rt.id = r.recipe_type_id
      LEFT JOIN authors a ON a.id = r.author_id
      LEFT JOIN LATERAL (
        SELECT media.storage_object_path
        FROM recipe_media media
        WHERE media.recipe_id = r.id
          AND media.status = 'active'
          AND media.archived_at IS NULL
        ORDER BY media.is_primary DESC, media.sort_order, media.id
        LIMIT 1
      ) rm ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          MAX(CASE WHEN n.code = 'energy_kcal' THEN
            CASE
              WHEN r.base_servings IS NOT NULL AND r.base_servings > 0
                THEN rn.value_total / r.base_servings
              WHEN r.yield_weight_g IS NOT NULL AND r.yield_weight_g > 0
                THEN rn.value_total * 100 / r.yield_weight_g
            END
          END)::double precision AS "energyKcal",
          MAX(CASE WHEN n.code = 'protein' THEN
            CASE
              WHEN r.base_servings IS NOT NULL AND r.base_servings > 0
                THEN rn.value_total / r.base_servings
              WHEN r.yield_weight_g IS NOT NULL AND r.yield_weight_g > 0
                THEN rn.value_total * 100 / r.yield_weight_g
            END
          END)::double precision AS "proteinG",
          MAX(CASE WHEN n.code = 'total_fat' THEN
            CASE
              WHEN r.base_servings IS NOT NULL AND r.base_servings > 0
                THEN rn.value_total / r.base_servings
              WHEN r.yield_weight_g IS NOT NULL AND r.yield_weight_g > 0
                THEN rn.value_total * 100 / r.yield_weight_g
            END
          END)::double precision AS "fatG",
          MAX(CASE WHEN n.code = 'carbohydrate' THEN
            CASE
              WHEN r.base_servings IS NOT NULL AND r.base_servings > 0
                THEN rn.value_total / r.base_servings
              WHEN r.yield_weight_g IS NOT NULL AND r.yield_weight_g > 0
                THEN rn.value_total * 100 / r.yield_weight_g
            END
          END)::double precision AS "carbohydrateG"
        FROM recipe_nutrients rn
        JOIN nutrients n ON n.id = rn.nutrient_id
        WHERE rn.recipe_id = r.id
          AND n.code IN ('energy_kcal', 'protein', 'total_fat', 'carbohydrate')
      ) nutrition ON TRUE
      WHERE ${includeRecipes}
        AND r.status = 'published'
        AND r.archived_at IS NULL
        AND (r.visibility = 'public' OR (r.visibility = 'family' AND r.family_id = ${familyId}::uuid))
        AND (r.title ILIKE ${pattern} ESCAPE '\\' OR r.summary ILIKE ${pattern} ESCAPE '\\')
        AND (${query.difficulty}::text IS NULL OR upper(r.difficulty::text) = ${query.difficulty})
        AND (${query.recipeTypeId}::text IS NULL OR r.recipe_type_id = ${query.recipeTypeId}::uuid)
        AND (${query.authorId}::text IS NULL OR r.author_id = ${query.authorId}::uuid)
        AND (
          ${query.ingredientId}::text IS NULL
          OR EXISTS (
            SELECT 1 FROM recipe_ingredients ri
            WHERE ri.recipe_id = r.id AND ri.product_id = ${query.ingredientId}::uuid
          )
        )
        AND (
          ${query.cuisineId}::text IS NULL
          OR EXISTS (
            SELECT 1 FROM recipe_cuisines rc
            WHERE rc.recipe_id = r.id AND rc.cuisine_id = ${query.cuisineId}::uuid
          )
        )
        AND (
          ${query.dietaryTagId}::text IS NULL
          OR EXISTS (
            SELECT 1 FROM recipe_dietary_tags rdt
            WHERE rdt.recipe_id = r.id AND rdt.dietary_tag_id = ${query.dietaryTagId}::uuid
          )
        )
        AND (
          NOT ${query.favoritesOnly}
          OR EXISTS (
            SELECT 1 FROM recipe_favorites rf
            WHERE rf.family_id = ${familyId}::uuid AND rf.recipe_id = r.id
          )
        )
    ),
    counted AS (
      SELECT COUNT(*)::integer AS total FROM results
    ),
    paged AS (
      SELECT * FROM results
      ORDER BY
        CASE WHEN ${recentRecipesFirst} THEN "sortDate" END DESC NULLS LAST,
        rank, lower(name), kind, id
      LIMIT ${query.pageSize} OFFSET ${offset}
    )
    SELECT paged.kind, paged.id, paged.name, paged.summary,
           paged."categoryId", paged."categoryCode", paged."categoryName",
           paged."brandName", paged.difficulty, paged."totalTimeMin",
           paged."recipeTypeId", paged."recipeTypeCode", paged."recipeTypeName",
           paged."authorId", paged."authorName", paged."authorType",
           paged."cuisineNames", paged."dietaryTagNames", paged."imageObjectPath",
           paged."nutritionBasis", paged."energyKcal", paged."proteinG",
           paged."fatG", paged."carbohydrateG", paged."sortDate",
           paged."isFavorite", counted.total
    FROM counted
    LEFT JOIN paged ON TRUE
  `);
}

function mapSearchRow(row: SearchRow): FoodSearchItem[] {
  if (!row.kind || !row.id || !row.name || row.isFavorite === null) return [];

  if (row.kind === "product") {
    if (!row.categoryId || !row.categoryCode || !row.categoryName) return [];

    return [
      {
        kind: "product",
        id: row.id,
        name: row.name,
        category: { id: row.categoryId, code: row.categoryCode, name: row.categoryName },
        brandName: row.brandName,
        imageObjectPath: row.imageObjectPath,
        imageUrl: null,
        nutrition: mapCardNutrition(row),
        isFavorite: row.isFavorite,
      },
    ];
  }

  return [
    {
      kind: "recipe",
      id: row.id,
      name: row.name,
      summary: row.summary,
      difficulty: normalizeDifficulty(row.difficulty),
      totalTimeMin: row.totalTimeMin,
      recipeType:
        row.recipeTypeId && row.recipeTypeCode && row.recipeTypeName
          ? { id: row.recipeTypeId, code: row.recipeTypeCode, name: row.recipeTypeName }
          : null,
      cuisines: row.cuisineNames ?? [],
      dietaryTags: row.dietaryTagNames ?? [],
      author:
        row.authorId && row.authorName && normalizeAuthorType(row.authorType)
          ? {
              id: row.authorId,
              name: row.authorName,
              type: normalizeAuthorType(row.authorType)!,
            }
          : null,
      imageObjectPath: row.imageObjectPath,
      imageUrl: null,
      nutrition: mapCardNutrition(row),
      isFavorite: row.isFavorite,
    },
  ];
}

function normalizeDifficulty(value: string | null): "EASY" | "MEDIUM" | "HARD" | null {
  const normalized = value?.toUpperCase();

  return normalized === "EASY" || normalized === "MEDIUM" || normalized === "HARD"
    ? normalized
    : null;
}

function normalizeAuthorType(
  value: string | null,
): "MEALMIND" | "EXPERT" | "BLOGGER" | "USER" | null {
  const normalized = value?.toUpperCase();
  return normalized === "MEALMIND" ||
    normalized === "EXPERT" ||
    normalized === "BLOGGER" ||
    normalized === "USER"
    ? normalized
    : null;
}

function mapCardNutrition(row: SearchRow) {
  return {
    basis: row.nutritionBasis === "PER_SERVING" ? ("PER_SERVING" as const) : ("PER_100G" as const),
    energyKcal: row.energyKcal,
    proteinG: row.proteinG,
    fatG: row.fatG,
    carbohydrateG: row.carbohydrateG,
  };
}

function recipeCardNutrition(recipe: {
  readonly baseServings: number | null;
  readonly yieldWeightG: Prisma.Decimal | null;
  readonly nutrients: readonly {
    readonly valueTotal: Prisma.Decimal;
    readonly nutrient: { readonly code: string };
  }[];
}) {
  const perServing = recipe.baseServings !== null && recipe.baseServings > 0;
  const per100g = !perServing && recipe.yieldWeightG !== null && recipe.yieldWeightG.greaterThan(0);
  const value = (code: string): number | null => {
    const total = recipe.nutrients.find((item) => item.nutrient.code === code)?.valueTotal;
    if (!total) return null;
    if (perServing) return total.div(recipe.baseServings!).toNumber();
    if (per100g) return total.mul(100).div(recipe.yieldWeightG!).toNumber();
    return null;
  };
  return {
    basis: perServing ? ("PER_SERVING" as const) : ("PER_100G" as const),
    energyKcal: value("energy_kcal"),
    proteinG: value("protein"),
    fatG: value("total_fat"),
    carbohydrateG: value("carbohydrate"),
  };
}

function ingredientNutrition(
  nutrients: readonly {
    readonly valuePer100g: Prisma.Decimal;
    readonly nutrient: { readonly code: string };
  }[],
  gramWeight: number | null,
) {
  const value = (code: string): number | null => {
    if (gramWeight === null) return null;
    const per100g = nutrients.find((item) => item.nutrient.code === code)?.valuePer100g;
    return per100g ? per100g.mul(gramWeight).div(100).toNumber() : null;
  };
  return {
    energyKcal: value("energy_kcal"),
    proteinG: value("protein"),
    fatG: value("total_fat"),
    carbohydrateG: value("carbohydrate"),
  };
}

function calculateRecipeNutrients(
  ingredients: readonly {
    readonly isOptional: boolean;
    readonly gramWeight: Prisma.Decimal | null;
    readonly product: {
      readonly nutrients: readonly {
        readonly valuePer100g: Prisma.Decimal;
        readonly nutrient: {
          readonly id: string;
          readonly code: string;
          readonly nameUa: string;
          readonly group: string;
          readonly unit: string;
          readonly sortOrder: number;
        };
      }[];
    };
  }[],
) {
  const included = ingredients.filter(
    (ingredient) => !ingredient.isOptional && ingredient.gramWeight !== null,
  );
  const nutrients = new Map<
    string,
    {
      nutrient: (typeof included)[number]["product"]["nutrients"][number]["nutrient"];
      valueTotal: number;
      coveredIngredientCount: number;
    }
  >();

  for (const ingredient of included) {
    for (const value of ingredient.product.nutrients) {
      const current = nutrients.get(value.nutrient.id) ?? {
        nutrient: value.nutrient,
        valueTotal: 0,
        coveredIngredientCount: 0,
      };
      current.valueTotal +=
        (ingredient.gramWeight!.toNumber() * value.valuePer100g.toNumber()) / 100;
      current.coveredIngredientCount += 1;
      nutrients.set(value.nutrient.id, current);
    }
  }

  return [...nutrients.values()]
    .sort((left, right) => left.nutrient.sortOrder - right.nutrient.sortOrder)
    .map((item) => ({
      nutrient: item.nutrient,
      valueTotal: item.valueTotal,
      completeness: item.coveredIngredientCount === included.length ? "COMPLETE" : "PARTIAL",
    }));
}

function nutritionDecimal(value: number): string {
  return value.toFixed(8).replace(/\.?0+$/, "");
}

function sumTime(value: {
  readonly prepTimeMin: number | null;
  readonly cookTimeMin: number | null;
  readonly restTimeMin: number | null;
}): number | null {
  if (value.prepTimeMin === null && value.cookTimeMin === null && value.restTimeMin === null) {
    return null;
  }

  return (value.prepTimeMin ?? 0) + (value.cookTimeMin ?? 0) + (value.restTimeMin ?? 0);
}

function uniqueById<Row extends { readonly id: string }>(rows: readonly Row[]): readonly Row[] {
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

async function isVisibleFood(
  database: Pick<DatabaseClient, "product" | "recipe">,
  familyId: string,
  kind: FoodKind,
  id: string,
): Promise<boolean> {
  if (kind === "product") {
    return (
      (await database.product.count({ where: { id, status: "ACTIVE", archivedAt: null } })) === 1
    );
  }

  return (
    (await database.recipe.count({
      where: {
        id,
        status: "PUBLISHED",
        archivedAt: null,
        OR: [{ visibility: "PUBLIC" }, { visibility: "FAMILY", familyId }],
      },
    })) === 1
  );
}
