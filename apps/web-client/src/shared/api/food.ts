import type { ApiClient } from "./api-client";
import { listReferenceData, type ReferenceItem } from "./reference-data";

export type FoodKind = "product" | "recipe";
export type RecipeDifficulty = "EASY" | "MEDIUM" | "HARD";

export interface FoodCardNutrition {
  readonly basis: "PER_100G" | "PER_SERVING";
  readonly energyKcal: number | null;
  readonly proteinG: number | null;
  readonly fatG: number | null;
  readonly carbohydrateG: number | null;
}

export type FoodSearchItem =
  | {
      readonly kind: "product";
      readonly id: string;
      readonly name: string;
      readonly category: { readonly id: string; readonly code: string; readonly name: string };
      readonly brandName: string | null;
      readonly imageUrl: string | null;
      readonly nutrition: FoodCardNutrition;
      readonly isFavorite: boolean;
    }
  | {
      readonly kind: "recipe";
      readonly id: string;
      readonly name: string;
      readonly summary: string | null;
      readonly difficulty: "EASY" | "MEDIUM" | "HARD" | null;
      readonly totalTimeMin: number | null;
      readonly recipeType: {
        readonly id: string;
        readonly code: string;
        readonly name: string;
      } | null;
      readonly cuisines: readonly string[];
      readonly dietaryTags: readonly string[];
      readonly author: {
        readonly id: string;
        readonly name: string;
        readonly type: "MEALMIND" | "EXPERT" | "BLOGGER" | "USER";
      } | null;
      readonly imageUrl: string | null;
      readonly nutrition: FoodCardNutrition;
      readonly isFavorite: boolean;
    };

export interface FoodSearchResponse {
  readonly data: { readonly items: readonly FoodSearchItem[] };
  readonly meta: { readonly page: number; readonly pageSize: number; readonly total: number };
}

export interface RecipeFilterOption {
  readonly id: string;
  readonly label: string;
}

export interface RecipeFilterOptions {
  readonly recipeTypes: readonly RecipeFilterOption[];
  readonly authors: readonly RecipeFilterOption[];
  readonly cuisines: readonly RecipeFilterOption[];
  readonly dietaryTags: readonly RecipeFilterOption[];
}

export interface RecipeSearchFilters {
  readonly difficulty?: RecipeDifficulty;
  readonly recipeTypeId?: string;
  readonly authorId?: string;
  readonly ingredientId?: string;
  readonly cuisineId?: string;
  readonly dietaryTagId?: string;
}

export interface FoodNutrient {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly group: string;
  readonly unit: string;
  readonly completeness: string;
  readonly valuePer100g?: string | null;
  readonly valuePerServing?: string | null;
  readonly valueTotal?: string;
}

export interface ProductFoodDetails {
  readonly kind: "product";
  readonly id: string;
  readonly name: string;
  readonly nameEn: string;
  readonly category: { readonly id: string; readonly code: string; readonly name: string };
  readonly brand: {
    readonly name: string;
    readonly countryCode: string | null;
    readonly websiteUrl: string | null;
  } | null;
  readonly imageUrl: string | null;
  readonly foodState: string;
  readonly defaultUnit: { readonly id: string; readonly symbol: string };
  readonly isFavorite: boolean;
  readonly nutrients: readonly FoodNutrient[];
  readonly portions: readonly {
    readonly id: string;
    readonly amount: string;
    readonly gramWeight: string;
    readonly label: string;
    readonly unitSymbol: string | null;
  }[];
  readonly relatedRecipes: readonly {
    readonly id: string;
    readonly title: string;
    readonly summary: string | null;
    readonly difficulty: "EASY" | "MEDIUM" | "HARD" | null;
    readonly recipeType: { readonly code: string; readonly name: string } | null;
    readonly cuisines: readonly string[];
    readonly dietaryTags: readonly string[];
    readonly author: {
      readonly name: string;
      readonly type: "MEALMIND" | "EXPERT" | "BLOGGER" | "USER";
    } | null;
    readonly totalTimeMin: number | null;
    readonly imageUrl: string | null;
    readonly nutrition: FoodCardNutrition;
    readonly isFavorite: boolean;
  }[];
}

export interface RecipeFoodDetails {
  readonly kind: "recipe";
  readonly id: string;
  readonly title: string;
  readonly summary: string | null;
  readonly description: string | null;
  readonly difficulty: "EASY" | "MEDIUM" | "HARD" | null;
  readonly recipeType: { readonly code: string; readonly name: string } | null;
  readonly author: {
    readonly name: string;
    readonly bio: string | null;
    readonly type: "MEALMIND" | "EXPERT" | "BLOGGER" | "USER";
    readonly avatarUrl: string | null;
    readonly links: readonly {
      readonly id: string;
      readonly type: "INSTAGRAM" | "YOUTUBE" | "TIKTOK" | "WEBSITE" | "OTHER";
      readonly url: string;
    }[];
  } | null;
  readonly imageUrl: string | null;
  readonly baseServings: number | null;
  readonly yieldWeightG: string | null;
  readonly prepTimeMin: number | null;
  readonly cookTimeMin: number | null;
  readonly restTimeMin: number | null;
  readonly totalTimeMin: number | null;
  readonly isFavorite: boolean;
  readonly ingredients: readonly {
    readonly id: string;
    readonly productId: string;
    readonly productName: string;
    readonly category: { readonly code: string; readonly name: string };
    readonly imageUrl: string | null;
    readonly nutrition: {
      readonly energyKcal: number | null;
      readonly proteinG: number | null;
      readonly fatG: number | null;
      readonly carbohydrateG: number | null;
    };
    readonly quantity: string;
    readonly gramWeight: string | null;
    readonly unitSymbol: string | null;
    readonly isOptional: boolean;
    readonly note: string | null;
    readonly position: number;
  }[];
  readonly steps: readonly {
    readonly id: string;
    readonly position: number;
    readonly instruction: string;
    readonly timerSeconds: number | null;
  }[];
  readonly cuisines: readonly { readonly id: string; readonly name: string }[];
  readonly dietaryTags: readonly { readonly id: string; readonly name: string }[];
  readonly sources: readonly {
    readonly id: string;
    readonly title: string | null;
    readonly url: string;
  }[];
  readonly videos: readonly {
    readonly id: string;
    readonly platform: string | null;
    readonly title: string | null;
    readonly externalUrl: string;
    readonly durationSec: number | null;
  }[];
  readonly images: readonly {
    readonly id: string;
    readonly title: string | null;
    readonly altText: string | null;
    readonly imageUrl: string | null;
  }[];
  readonly nutrients: readonly FoodNutrient[];
}

export type FoodDetails = ProductFoodDetails | RecipeFoodDetails;

export function searchFood(
  client: ApiClient,
  parameters: {
    readonly query: string;
    readonly type: "all" | FoodKind;
    readonly favorites: boolean;
    readonly page?: number;
    readonly pageSize?: number;
    readonly filters?: RecipeSearchFilters;
  },
  signal?: AbortSignal,
): Promise<FoodSearchResponse> {
  const query = new URLSearchParams({
    query: parameters.query,
    type: parameters.type,
    favorites: String(parameters.favorites),
    page: String(parameters.page ?? 1),
    pageSize: String(parameters.pageSize ?? 20),
  });
  for (const [key, value] of Object.entries(parameters.filters ?? {})) {
    if (value) query.set(key, value);
  }
  return client.get(`/api/v1/food/search?${query.toString()}`, signal ? { signal } : undefined);
}

export async function readRecipeFilterOptions(
  client: ApiClient,
  signal?: AbortSignal,
): Promise<RecipeFilterOptions> {
  const [recipeTypes, authors, cuisines, dietaryTags] = await Promise.all([
    listReferenceData(client, { resource: "recipe-types", pageSize: 100 }, signal),
    listReferenceData(client, { resource: "authors", pageSize: 100 }, signal),
    listReferenceData(client, { resource: "cuisines", pageSize: 100 }, signal),
    listReferenceData(client, { resource: "dietary-tags", pageSize: 100 }, signal),
  ]);

  return {
    recipeTypes: recipeTypes.data.items.map((item) => option(item, ["nameUa", "name"])),
    authors: authors.data.items.map((item) => option(item, ["displayName", "nameUa", "name"])),
    cuisines: cuisines.data.items.map((item) => option(item, ["nameUa", "name"])),
    dietaryTags: dietaryTags.data.items.map((item) => option(item, ["nameUa", "name"])),
  };
}

function option(item: ReferenceItem, fields: readonly string[]): RecipeFilterOption {
  const label = fields
    .map((field) => item[field])
    .find((value): value is string => typeof value === "string" && value.length > 0);
  return { id: item.id, label: label ?? item.id };
}

export function getFoodDetails(
  client: ApiClient,
  kind: FoodKind,
  id: string,
): Promise<{ readonly data: FoodDetails }> {
  return client.get(
    `/api/v1/food/${kind === "product" ? "products" : "recipes"}/${encodeURIComponent(id)}`,
  );
}

export function setFoodFavorite(
  client: ApiClient,
  kind: FoodKind,
  id: string,
  favorite: boolean,
): Promise<unknown> {
  const path = `/api/v1/food/favorites/${kind}/${encodeURIComponent(id)}`;
  return favorite ? client.put(path, {}) : client.delete(path);
}
