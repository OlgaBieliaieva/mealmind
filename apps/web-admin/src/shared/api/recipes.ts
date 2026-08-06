import type { ApiClient } from "./api-client";

export type RecipeStatus = "DRAFT" | "READY" | "PUBLISHED" | "ARCHIVED";
export type RecipeVisibility = "FAMILY" | "PUBLIC";
export type RecipeDifficulty = "EASY" | "MEDIUM" | "HARD";

export interface RecipeIngredientWrite {
  readonly productId: string;
  readonly quantity: string;
  readonly gramWeight: string;
  readonly isOptional: boolean;
  readonly note?: string | null;
}

export interface RecipeWrite {
  readonly title: string;
  readonly summary?: string | null;
  readonly description?: string | null;
  readonly visibility: RecipeVisibility;
  readonly difficulty?: RecipeDifficulty | null;
  readonly recipeTypeId?: string | null;
  readonly authorId?: string | null;
  readonly baseServings: number;
  readonly yieldWeightG?: string | null;
  readonly prepTimeMin?: number | null;
  readonly cookTimeMin?: number | null;
  readonly restTimeMin?: number | null;
  readonly ingredients: readonly RecipeIngredientWrite[];
  readonly steps: readonly {
    readonly instruction: string;
    readonly timerSeconds?: number | null;
  }[];
  readonly sources: readonly {
    readonly kind: "WEB_PAGE" | "SOCIAL_POST" | "VIDEO" | "OTHER";
    readonly title?: string | null;
    readonly url: string;
  }[];
  readonly cuisineIds: readonly string[];
  readonly dietaryTagIds: readonly string[];
  readonly videos: readonly {
    readonly platform: "YOUTUBE" | "INSTAGRAM" | "TIKTOK" | "OTHER";
    readonly title?: string | null;
    readonly externalUrl: string;
    readonly durationSec?: number | null;
    readonly sortOrder: number;
  }[];
}

export interface RecipeSummary {
  readonly id: string;
  readonly title: string;
  readonly status: RecipeStatus;
  readonly visibility: RecipeVisibility;
  readonly difficulty: RecipeDifficulty | null;
  readonly recipeTypeName: string | null;
  readonly authorName: string | null;
  readonly baseServings: number | null;
  readonly updatedAt: string;
}

export interface RecipeDetails extends RecipeSummary {
  readonly summary: string | null;
  readonly description: string | null;
  readonly recipeTypeId: string | null;
  readonly authorId: string | null;
  readonly yieldWeightG: string | null;
  readonly prepTimeMin: number | null;
  readonly cookTimeMin: number | null;
  readonly restTimeMin: number | null;
  readonly ingredients: readonly (RecipeIngredientWrite & {
    readonly id: string;
    readonly productName: string;
    readonly position: number;
  })[];
  readonly steps: readonly {
    readonly id: string;
    readonly instruction: string;
    readonly timerSeconds: number | null;
    readonly position: number;
  }[];
  readonly sources: readonly {
    readonly id: string;
    readonly kind: RecipeWrite["sources"][number]["kind"];
    readonly title: string | null;
    readonly url: string;
  }[];
  readonly cuisines: readonly { readonly id: string; readonly name: string }[];
  readonly dietaryTags: readonly { readonly id: string; readonly name: string }[];
  readonly videos: readonly {
    readonly id: string;
    readonly platform: RecipeWrite["videos"][number]["platform"];
    readonly title: string | null;
    readonly externalUrl: string;
    readonly durationSec: number | null;
    readonly sortOrder: number;
  }[];
  readonly nutrients: readonly RecipeNutrient[];
}

export interface RecipeNutrient {
  readonly nutrientId: string;
  readonly code: string;
  readonly name: string;
  readonly unit: string;
  readonly group: string;
  readonly valueTotal: string;
  readonly valuePerServing: string | null;
  readonly valuePer100g: string | null;
  readonly completeness: "COMPLETE" | "PARTIAL" | "UNVERIFIED";
}

export interface RecipeNutritionPreview {
  readonly nutrients: readonly {
    readonly nutrientId: string;
    readonly valueTotal: string;
    readonly completeness: "COMPLETE" | "PARTIAL";
  }[];
  readonly inputFingerprint: string;
  readonly totalIngredientWeightG: string;
}

export function listRecipes(
  api: ApiClient,
  parameters: {
    readonly search?: string;
    readonly status?: RecipeStatus;
    readonly visibility?: RecipeVisibility;
    readonly page?: number;
    readonly pageSize?: number;
  },
) {
  const query = new URLSearchParams();
  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return api.get<{
    readonly data: { readonly items: readonly RecipeSummary[] };
    readonly meta: { readonly page: number; readonly pageSize: number; readonly total: number };
  }>(`/api/v1/admin/recipes${query.size ? `?${query}` : ""}`);
}

export function getRecipe(api: ApiClient, id: string) {
  return api.get<{ readonly data: RecipeDetails }>(
    `/api/v1/admin/recipes/${encodeURIComponent(id)}`,
  );
}
export function createRecipe(api: ApiClient, data: RecipeWrite) {
  return api.post<{ readonly data: RecipeDetails }>("/api/v1/admin/recipes", data);
}
export function updateRecipe(api: ApiClient, id: string, data: RecipeWrite) {
  return api.patch<{ readonly data: RecipeDetails }>(
    `/api/v1/admin/recipes/${encodeURIComponent(id)}`,
    data,
  );
}
export function changeRecipeStatus(api: ApiClient, id: string, status: RecipeStatus) {
  return api.patch<{ readonly data: RecipeDetails }>(
    `/api/v1/admin/recipes/${encodeURIComponent(id)}/status`,
    { status },
  );
}
export function previewRecipeNutrition(api: ApiClient, ingredients: RecipeWrite["ingredients"]) {
  return api.post<{ readonly data: RecipeNutritionPreview }>(
    "/api/v1/admin/recipes/nutrition-preview",
    { ingredients },
  );
}
