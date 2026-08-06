export const RECIPE_STATUSES = ["DRAFT", "READY", "PUBLISHED", "ARCHIVED"] as const;
export type RecipeStatus = (typeof RECIPE_STATUSES)[number];
export const RECIPE_VISIBILITIES = ["FAMILY", "PUBLIC"] as const;
export type RecipeVisibility = (typeof RECIPE_VISIBILITIES)[number];
export const RECIPE_DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type RecipeDifficulty = (typeof RECIPE_DIFFICULTIES)[number];
export const RECIPE_SOURCE_KINDS = ["WEB_PAGE", "SOCIAL_POST", "VIDEO", "OTHER"] as const;
export const RECIPE_MEDIA_PLATFORMS = ["YOUTUBE", "INSTAGRAM", "TIKTOK", "OTHER"] as const;

export interface RecipeIngredientInput {
  readonly productId: string;
  readonly quantity: string;
  readonly measurementUnitId?: string | null | undefined;
  readonly productPortionId?: string | null | undefined;
  readonly gramWeight?: string | null | undefined;
  readonly isOptional: boolean;
  readonly note?: string | null | undefined;
}

export interface ResolvedRecipeIngredient extends RecipeIngredientInput {
  readonly position: number;
  readonly gramWeight: string;
  readonly conversionMethod: "DIRECT_MASS" | "PRODUCT_PORTION" | "MANUAL";
  readonly productName: string;
  readonly measurementUnitSymbol: string | null;
  readonly nutrients: readonly { readonly nutrientId: string; readonly valuePer100g: string }[];
}

export interface RecipeStepInput {
  readonly instruction: string;
  readonly timerSeconds?: number | null | undefined;
}

export interface RecipeSourceInput {
  readonly kind: (typeof RECIPE_SOURCE_KINDS)[number];
  readonly title?: string | null | undefined;
  readonly url: string;
}

export interface RecipeVideoInput {
  readonly platform: (typeof RECIPE_MEDIA_PLATFORMS)[number];
  readonly title?: string | null | undefined;
  readonly externalUrl: string;
  readonly durationSec?: number | null | undefined;
  readonly authorId?: string | null | undefined;
  readonly sortOrder: number;
}

export interface RecipeWrite {
  readonly title: string;
  readonly summary?: string | null | undefined;
  readonly description?: string | null | undefined;
  readonly visibility: RecipeVisibility;
  readonly difficulty?: RecipeDifficulty | null | undefined;
  readonly recipeTypeId?: string | null | undefined;
  readonly authorId?: string | null | undefined;
  readonly baseServings?: number | null | undefined;
  readonly yieldWeightG?: string | null | undefined;
  readonly prepTimeMin?: number | null | undefined;
  readonly cookTimeMin?: number | null | undefined;
  readonly restTimeMin?: number | null | undefined;
  readonly originalRecipeId?: string | null | undefined;
  readonly ingredients: readonly RecipeIngredientInput[];
  readonly steps: readonly RecipeStepInput[];
  readonly sources: readonly RecipeSourceInput[];
  readonly cuisineIds: readonly string[];
  readonly dietaryTagIds: readonly string[];
  readonly videos: readonly RecipeVideoInput[];
}

export type RecipeUpdate = {
  readonly [Key in keyof RecipeWrite]?: RecipeWrite[Key] | undefined;
};

export interface CalculatedRecipeNutrient {
  readonly nutrientId: string;
  readonly valueTotal: string;
  readonly completeness: "COMPLETE" | "PARTIAL";
  readonly ingredientCount: number;
  readonly coveredIngredientCount: number;
  readonly inputFingerprint: string;
}

export interface RecipeMutationData extends Omit<RecipeWrite, "ingredients"> {
  readonly ingredients: readonly ResolvedRecipeIngredient[];
  readonly nutrients: readonly CalculatedRecipeNutrient[];
  readonly ingredientFingerprint: string;
}

export interface RecipeUpdateData extends Omit<RecipeUpdate, "ingredients"> {
  readonly ingredients?: readonly ResolvedRecipeIngredient[] | undefined;
  readonly nutrients?: readonly CalculatedRecipeNutrient[] | undefined;
  readonly ingredientFingerprint?: string | undefined;
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

export interface RecipeNutrientView {
  readonly nutrientId: string;
  readonly code: string;
  readonly name: string;
  readonly unit: string;
  readonly group: string;
  readonly sortOrder: number;
  readonly valueTotal: string;
  readonly valuePerServing: string | null;
  readonly valuePer100g: string | null;
  readonly completeness: "COMPLETE" | "PARTIAL" | "UNVERIFIED";
  readonly ingredientCount: number | null;
  readonly coveredIngredientCount: number | null;
}

export interface RecipeDetails extends RecipeSummary {
  readonly summary: string | null;
  readonly description: string | null;
  readonly recipeTypeId: string | null;
  readonly authorId: string | null;
  readonly author: null | { readonly displayName: string; readonly bio: string | null };
  readonly yieldWeightG: string | null;
  readonly prepTimeMin: number | null;
  readonly cookTimeMin: number | null;
  readonly restTimeMin: number | null;
  readonly publishedAt: string | null;
  readonly archivedAt: string | null;
  readonly ingredients: readonly (Omit<ResolvedRecipeIngredient, "nutrients"> & {
    readonly id: string;
  })[];
  readonly steps: readonly (RecipeStepInput & { readonly id: string; readonly position: number })[];
  readonly sources: readonly (RecipeSourceInput & { readonly id: string })[];
  readonly cuisines: readonly { readonly id: string; readonly name: string }[];
  readonly dietaryTags: readonly { readonly id: string; readonly name: string }[];
  readonly videos: readonly (RecipeVideoInput & {
    readonly id: string;
    readonly authorName: string | null;
  })[];
  readonly nutrients: readonly RecipeNutrientView[];
}

export interface PublicRecipeDetails {
  readonly id: string;
  readonly title: string;
  readonly summary: string | null;
  readonly description: string | null;
  readonly difficulty: RecipeDifficulty | null;
  readonly recipeTypeName: string | null;
  readonly authorName: string | null;
  readonly author: RecipeDetails["author"];
  readonly baseServings: number | null;
  readonly yieldWeightG: string | null;
  readonly prepTimeMin: number | null;
  readonly cookTimeMin: number | null;
  readonly restTimeMin: number | null;
  readonly publishedAt: string;
  readonly ingredients: RecipeDetails["ingredients"];
  readonly steps: RecipeDetails["steps"];
  readonly sources: RecipeDetails["sources"];
  readonly cuisines: RecipeDetails["cuisines"];
  readonly dietaryTags: RecipeDetails["dietaryTags"];
  readonly videos: RecipeDetails["videos"];
  readonly nutrients: RecipeDetails["nutrients"];
}

export interface RecipeListQuery {
  readonly search?: string | undefined;
  readonly status?: RecipeStatus | undefined;
  readonly visibility?: RecipeVisibility | undefined;
  readonly recipeTypeId?: string | undefined;
  readonly authorId?: string | undefined;
  readonly page: number;
  readonly pageSize: number;
}

export interface RecipePage {
  readonly items: readonly RecipeSummary[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface RecipeRepository {
  list(query: RecipeListQuery): Promise<RecipePage>;
  findAdminById(id: string): Promise<RecipeDetails | null>;
  findPublicById(id: string): Promise<RecipeDetails | null>;
  resolveIngredients(
    inputs: readonly RecipeIngredientInput[],
  ): Promise<readonly ResolvedRecipeIngredient[]>;
  create(data: RecipeMutationData, actorUserId: string): Promise<RecipeDetails>;
  update(id: string, data: RecipeUpdateData, actorUserId: string): Promise<RecipeDetails | null>;
  updateStatus(id: string, status: RecipeStatus): Promise<RecipeDetails | null>;
}
