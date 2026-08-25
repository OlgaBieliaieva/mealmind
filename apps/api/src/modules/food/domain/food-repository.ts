export type FoodKind = "product" | "recipe";

export interface FoodSearchQuery {
  readonly query: string;
  readonly type: "all" | FoodKind;
  readonly favoritesOnly: boolean;
  readonly difficulty: "EASY" | "MEDIUM" | "HARD" | null;
  readonly recipeTypeId: string | null;
  readonly authorId: string | null;
  readonly ingredientId: string | null;
  readonly cuisineId: string | null;
  readonly dietaryTagId: string | null;
  readonly page: number;
  readonly pageSize: number;
}

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
      readonly imageObjectPath?: string | null;
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
      readonly imageObjectPath?: string | null;
      readonly imageUrl: string | null;
      readonly nutrition: FoodCardNutrition;
      readonly isFavorite: boolean;
    };

export interface FoodSearchPage {
  readonly items: readonly FoodSearchItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
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
  readonly imageObjectPath?: string | null;
  readonly imageUrl: string | null;
  readonly foodState: string;
  readonly defaultUnit: { readonly id: string; readonly symbol: string };
  readonly isFavorite: boolean;
  readonly nutrients: readonly {
    readonly id: string;
    readonly code: string;
    readonly name: string;
    readonly group: string;
    readonly unit: string;
    readonly valuePer100g: string;
    readonly completeness: string;
  }[];
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
    readonly imageObjectPath?: string | null;
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
    readonly avatarObjectPath?: string | null;
    readonly links: readonly {
      readonly id: string;
      readonly type: "INSTAGRAM" | "YOUTUBE" | "TIKTOK" | "WEBSITE" | "OTHER";
      readonly url: string;
    }[];
  } | null;
  readonly imageObjectPath?: string | null;
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
    readonly imageObjectPath?: string | null;
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
    readonly imageObjectPath?: string | null;
    readonly imageUrl: string | null;
  }[];
  readonly nutrients: readonly {
    readonly id: string;
    readonly code: string;
    readonly name: string;
    readonly group: string;
    readonly unit: string;
    readonly valueTotal: string;
    readonly valuePerServing: string | null;
    readonly valuePer100g: string | null;
    readonly completeness: string;
  }[];
}

export interface FoodRepository {
  search(familyId: string, query: FoodSearchQuery): Promise<FoodSearchPage>;
  findProduct(familyId: string, id: string): Promise<ProductFoodDetails | null>;
  findRecipe(familyId: string, id: string): Promise<RecipeFoodDetails | null>;
  addFavorite(familyId: string, userId: string, kind: FoodKind, id: string): Promise<boolean>;
  removeFavorite(familyId: string, kind: FoodKind, id: string): Promise<boolean>;
}
