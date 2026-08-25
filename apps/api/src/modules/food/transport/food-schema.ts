import { z } from "zod";

const uuid = z.string().uuid();

export const searchFoodSchema = z.object({
  params: z.object({}),
  query: z
    .object({
      query: z.string().trim().max(120).default(""),
      type: z.enum(["all", "product", "recipe"]).default("all"),
      favorites: z
        .enum(["true", "false"])
        .default("false")
        .transform((value) => value === "true"),
      difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
      recipeTypeId: uuid.optional(),
      authorId: uuid.optional(),
      ingredientId: uuid.optional(),
      cuisineId: uuid.optional(),
      dietaryTagId: uuid.optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(50).default(20),
    })
    .superRefine((value, context) => {
      if (!value.favorites && value.type !== "recipe" && value.query.length < 2) {
        context.addIssue({
          code: "too_small",
          minimum: 2,
          origin: "string",
          inclusive: true,
          path: ["query"],
          message: "Пошуковий запит має містити щонайменше два символи",
        });
      }
      const hasRecipeFilters = [
        value.difficulty,
        value.recipeTypeId,
        value.authorId,
        value.ingredientId,
        value.cuisineId,
        value.dietaryTagId,
      ].some(Boolean);
      if (hasRecipeFilters && value.type !== "recipe") {
        context.addIssue({
          code: "custom",
          path: ["type"],
          message: "Фільтри рецептів доступні лише для type=recipe",
        });
      }
    }),
  body: z.unknown().optional(),
});

export const foodDetailsSchema = z.object({
  params: z.object({ id: uuid }),
  query: z.object({}),
  body: z.unknown().optional(),
});

export const favoriteFoodSchema = z.object({
  params: z.object({ kind: z.enum(["product", "recipe"]), id: uuid }),
  query: z.object({}),
  body: z.unknown().optional(),
});
