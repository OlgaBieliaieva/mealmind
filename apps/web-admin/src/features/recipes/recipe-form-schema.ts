import { z } from "zod";

import type { RecipeDetails, RecipeWrite } from "@/shared/api/recipes";

const decimal = z
  .string()
  .trim()
  .refine((value) => /^\d+(?:\.\d+)?$/.test(value) && Number(value) > 0, "Введіть додатне число");
const optionalInteger = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d+$/.test(value), "Введіть ціле невід’ємне число");
const optionalUrl = z
  .string()
  .trim()
  .refine((value) => value === "" || /^https?:\/\//.test(value), "Вкажіть коректний HTTP(S) URL");

export const recipeFormSchema = z.object({
  title: z.string().trim().min(1, "Вкажіть назву").max(240),
  summary: z.string().trim().max(500),
  description: z.string().trim().max(20_000),
  visibility: z.enum(["PUBLIC", "FAMILY"]),
  difficulty: z.enum(["", "EASY", "MEDIUM", "HARD"]),
  recipeTypeId: z.string(),
  authorId: z.string(),
  baseServings: decimal,
  yieldWeightG: z
    .string()
    .trim()
    .refine((value) => value === "" || Number(value) > 0, "Вага має бути додатною"),
  prepTimeMin: optionalInteger,
  cookTimeMin: optionalInteger,
  restTimeMin: optionalInteger,
  cuisineIds: z.array(z.string()),
  dietaryTagIds: z.array(z.string()),
  ingredients: z
    .array(
      z.object({
        productId: z.string().uuid("Оберіть продукт"),
        gramWeight: decimal,
        isOptional: z.boolean(),
        note: z.string().trim().max(300),
      }),
    )
    .min(1, "Додайте інгредієнт"),
  steps: z
    .array(
      z.object({
        instruction: z.string().trim().min(1, "Опишіть крок").max(4000),
        timerMinutes: optionalInteger,
      }),
    )
    .min(1, "Додайте крок"),
  sources: z.array(
    z.object({
      kind: z.enum(["WEB_PAGE", "SOCIAL_POST", "VIDEO", "OTHER"]),
      title: z.string().trim().max(300),
      url: optionalUrl.refine((value) => value !== "", "Вкажіть URL"),
    }),
  ),
  videos: z.array(
    z.object({
      platform: z.enum(["YOUTUBE", "INSTAGRAM", "TIKTOK", "OTHER"]),
      title: z.string().trim().max(300),
      externalUrl: optionalUrl.refine((value) => value !== "", "Вкажіть URL"),
      durationMinutes: optionalInteger,
    }),
  ),
});

export type RecipeFormValues = z.input<typeof recipeFormSchema>;
export const EMPTY_RECIPE_FORM: RecipeFormValues = {
  title: "",
  summary: "",
  description: "",
  visibility: "PUBLIC",
  difficulty: "",
  recipeTypeId: "",
  authorId: "",
  baseServings: "1",
  yieldWeightG: "",
  prepTimeMin: "",
  cookTimeMin: "",
  restTimeMin: "",
  cuisineIds: [],
  dietaryTagIds: [],
  ingredients: [{ productId: "", gramWeight: "", isOptional: false, note: "" }],
  steps: [{ instruction: "", timerMinutes: "" }],
  sources: [],
  videos: [],
};

export function mapRecipeFormToWrite(value: RecipeFormValues): RecipeWrite {
  return {
    title: value.title,
    summary: empty(value.summary),
    description: empty(value.description),
    visibility: value.visibility,
    difficulty: value.difficulty === "" ? null : value.difficulty,
    recipeTypeId: empty(value.recipeTypeId),
    authorId: empty(value.authorId),
    baseServings: Number(value.baseServings),
    yieldWeightG: empty(value.yieldWeightG),
    prepTimeMin: integer(value.prepTimeMin),
    cookTimeMin: integer(value.cookTimeMin),
    restTimeMin: integer(value.restTimeMin),
    cuisineIds: value.cuisineIds,
    dietaryTagIds: value.dietaryTagIds,
    ingredients: value.ingredients.map((item) => ({
      productId: item.productId,
      quantity: item.gramWeight,
      gramWeight: item.gramWeight,
      isOptional: item.isOptional,
      note: empty(item.note),
    })),
    steps: value.steps.map((item) => ({
      instruction: item.instruction,
      timerSeconds: item.timerMinutes === "" ? null : Number(item.timerMinutes) * 60,
    })),
    sources: value.sources.map((item) => ({ ...item, title: empty(item.title) })),
    videos: value.videos.map((item, sortOrder) => ({
      platform: item.platform,
      title: empty(item.title),
      externalUrl: item.externalUrl,
      durationSec: item.durationMinutes === "" ? null : Number(item.durationMinutes) * 60,
      sortOrder,
    })),
  };
}

export function mapRecipeToForm(recipe: RecipeDetails): RecipeFormValues {
  return {
    title: recipe.title,
    summary: recipe.summary ?? "",
    description: recipe.description ?? "",
    visibility: recipe.visibility,
    difficulty: recipe.difficulty ?? "",
    recipeTypeId: recipe.recipeTypeId ?? "",
    authorId: recipe.authorId ?? "",
    baseServings: String(recipe.baseServings ?? 1),
    yieldWeightG: recipe.yieldWeightG ?? "",
    prepTimeMin: text(recipe.prepTimeMin),
    cookTimeMin: text(recipe.cookTimeMin),
    restTimeMin: text(recipe.restTimeMin),
    cuisineIds: recipe.cuisines.map((item) => item.id),
    dietaryTagIds: recipe.dietaryTags.map((item) => item.id),
    ingredients: recipe.ingredients.map((item) => ({
      productId: item.productId,
      gramWeight: item.gramWeight,
      isOptional: item.isOptional,
      note: item.note ?? "",
    })),
    steps: recipe.steps.map((item) => ({
      instruction: item.instruction,
      timerMinutes: item.timerSeconds === null ? "" : String(item.timerSeconds / 60),
    })),
    sources: recipe.sources.map((item) => ({
      kind: item.kind,
      title: item.title ?? "",
      url: item.url,
    })),
    videos: recipe.videos.map((item) => ({
      platform: item.platform,
      title: item.title ?? "",
      externalUrl: item.externalUrl,
      durationMinutes: item.durationSec === null ? "" : String(item.durationSec / 60),
    })),
  };
}

const empty = (value: string) => (value === "" ? null : value);
const integer = (value: string) => (value === "" ? null : Number(value));
const text = (value: number | null) => (value === null ? "" : String(value));
