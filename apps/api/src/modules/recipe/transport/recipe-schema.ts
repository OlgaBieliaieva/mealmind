import { z } from "zod";

import {
  RECIPE_DIFFICULTIES,
  RECIPE_MEDIA_PLATFORMS,
  RECIPE_SOURCE_KINDS,
  RECIPE_STATUSES,
  RECIPE_VISIBILITIES,
} from "../domain/recipe-repository.js";

const uuid = z.string().uuid();
const nullableText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();
const decimal = (maximum: number, scale: number) =>
  z
    .union([z.string(), z.number()])
    .transform(String)
    .refine((value) => /^\d+(?:\.\d+)?$/.test(value), "Must be a positive decimal")
    .refine(
      (value) => Number(value) > 0 && Number(value) <= maximum,
      `Must be between 0 and ${maximum}`,
    )
    .refine(
      (value) => (value.split(".")[1]?.length ?? 0) <= scale,
      `Must have no more than ${scale} decimal places`,
    );
const url = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "Only HTTP(S) URLs are supported");

const ingredient = z
  .object({
    productId: uuid,
    quantity: decimal(1_000_000, 4),
    measurementUnitId: uuid.nullable().optional(),
    productPortionId: uuid.nullable().optional(),
    gramWeight: decimal(1_000_000, 4).nullable().optional(),
    isOptional: z.boolean().default(false),
    note: nullableText(300),
  })
  .superRefine((value, context) => {
    const conversions = [value.measurementUnitId, value.productPortionId, value.gramWeight].filter(
      (item) => item !== undefined && item !== null,
    ).length;
    if (conversions !== 1) {
      context.addIssue({
        code: "custom",
        path: ["gramWeight"],
        message: "Choose exactly one conversion to grams",
      });
    }
  });

const step = z.object({
  instruction: z.string().trim().min(1).max(4000),
  timerSeconds: z.number().int().min(1).max(86_400).nullable().optional(),
});
const source = z.object({
  kind: z.enum(RECIPE_SOURCE_KINDS),
  title: nullableText(300),
  url,
});
const video = z.object({
  platform: z.enum(RECIPE_MEDIA_PLATFORMS),
  title: nullableText(300),
  externalUrl: url,
  durationSec: z.number().int().min(1).max(86_400).nullable().optional(),
  authorId: uuid.nullable().optional(),
  sortOrder: z.number().int().min(-32_768).max(32_767).default(0),
});

const recipeFields = {
  title: z.string().trim().min(1).max(240),
  summary: nullableText(500),
  description: nullableText(20_000),
  visibility: z.enum(RECIPE_VISIBILITIES),
  difficulty: z.enum(RECIPE_DIFFICULTIES).nullable().optional(),
  recipeTypeId: uuid.nullable().optional(),
  authorId: uuid.nullable().optional(),
  baseServings: z.number().int().min(1).max(1_000).nullable().optional(),
  yieldWeightG: decimal(1_000_000, 3).nullable().optional(),
  prepTimeMin: z.number().int().min(0).max(32_767).nullable().optional(),
  cookTimeMin: z.number().int().min(0).max(32_767).nullable().optional(),
  restTimeMin: z.number().int().min(0).max(32_767).nullable().optional(),
  originalRecipeId: uuid.nullable().optional(),
  ingredients: z.array(ingredient).min(1).max(200),
  steps: z.array(step).min(1).max(200),
  sources: z.array(source).max(50),
  cuisineIds: z.array(uuid).max(50).refine(unique, "Cuisine IDs must be unique"),
  dietaryTagIds: z.array(uuid).max(50).refine(unique, "Dietary tag IDs must be unique"),
  videos: z.array(video).max(50),
} as const;

const createBody = z.object({
  ...recipeFields,
  visibility: recipeFields.visibility.default("PUBLIC"),
  ingredients: recipeFields.ingredients,
  steps: recipeFields.steps,
  sources: recipeFields.sources.default([]),
  cuisineIds: recipeFields.cuisineIds.default([]),
  dietaryTagIds: recipeFields.dietaryTagIds.default([]),
  videos: recipeFields.videos.default([]),
});

const updateBody = z
  .object(
    Object.fromEntries(
      Object.entries(recipeFields).map(([key, schema]) => [key, schema.optional()]),
    ) as { [Key in keyof typeof recipeFields]: z.ZodOptional<(typeof recipeFields)[Key]> },
  )
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const listRecipesSchema = z.object({
  params: z.object({}),
  query: z.object({
    search: z.string().trim().min(1).max(120).optional(),
    status: z.enum(RECIPE_STATUSES).optional(),
    visibility: z.enum(RECIPE_VISIBILITIES).optional(),
    recipeTypeId: uuid.optional(),
    authorId: uuid.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  body: z.unknown().optional(),
});
export const getRecipeSchema = envelope(z.unknown().optional());
export const createRecipeSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: createBody,
});
export const updateRecipeSchema = envelope(updateBody);
export const changeRecipeStatusSchema = envelope(z.object({ status: z.enum(RECIPE_STATUSES) }));
export const previewRecipeNutritionSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({ ingredients: z.array(ingredient).min(1).max(200) }),
});

function envelope<T extends z.ZodType>(body: T) {
  return z.object({ params: z.object({ id: uuid }), query: z.object({}), body });
}

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}
