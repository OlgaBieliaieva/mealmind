import type { ApiClient } from "./api-client";
export interface PublicRecipeDetails {
  readonly id: string;
  readonly title: string;
  readonly summary: string | null;
  readonly description: string | null;
  readonly difficulty: "EASY" | "MEDIUM" | "HARD" | null;
  readonly recipeTypeName: string | null;
  readonly authorName: string | null;
  readonly author: { readonly displayName: string; readonly bio: string | null } | null;
  readonly baseServings: number | null;
  readonly yieldWeightG: string | null;
  readonly prepTimeMin: number | null;
  readonly cookTimeMin: number | null;
  readonly restTimeMin: number | null;
  readonly ingredients: readonly {
    readonly id: string;
    readonly productId: string;
    readonly productName: string;
    readonly quantity: string;
    readonly gramWeight: string;
    readonly measurementUnitSymbol: string | null;
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
  readonly sources: readonly {
    readonly id: string;
    readonly kind: string;
    readonly title: string | null;
    readonly url: string;
  }[];
  readonly cuisines: readonly { readonly id: string; readonly name: string }[];
  readonly dietaryTags: readonly { readonly id: string; readonly name: string }[];
  readonly videos: readonly {
    readonly id: string;
    readonly platform: string;
    readonly title: string | null;
    readonly externalUrl: string;
    readonly durationSec: number | null;
    readonly authorName: string | null;
  }[];
  readonly nutrients: readonly {
    readonly nutrientId: string;
    readonly code: string;
    readonly name: string;
    readonly unit: string;
    readonly group: string;
    readonly valueTotal: string;
    readonly valuePerServing: string | null;
    readonly valuePer100g: string | null;
    readonly completeness: "COMPLETE" | "PARTIAL" | "UNVERIFIED";
  }[];
}
export function getPublicRecipe(api: ApiClient, id: string) {
  return api.get<{ readonly data: PublicRecipeDetails }>(
    `/api/v1/recipes/${encodeURIComponent(id)}`,
  );
}
