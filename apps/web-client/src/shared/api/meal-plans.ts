import type { ApiClient } from "./api-client";

export interface NutrientAmount {
  readonly code: string;
  readonly name: string;
  readonly unit: string;
  readonly value: number;
}

export interface MealPlanWeek {
  readonly planId: string | null;
  readonly familyName: string;
  readonly weekStart: string;
  readonly weekEnd: string;
  readonly weekStartsOn: string;
  readonly timeZone: string;
  readonly days: readonly {
    readonly date: string;
    readonly meals: readonly {
      readonly mealType: {
        readonly id: string;
        readonly code: string;
        readonly name: string;
        readonly sortOrder: number;
      };
      readonly entries: readonly {
        readonly id: string;
        readonly kind: "product" | "recipe";
        readonly foodId: string;
        readonly name: string;
        readonly imageUrl: string | null;
        readonly categoryCode: string | null;
        readonly position: number;
        readonly participants: readonly {
          readonly memberId: string;
          readonly name: string;
          readonly quantity: number;
          readonly quantityInGrams: number;
          readonly unit: string;
        }[];
      }[];
    }[];
  }[];
  readonly members: readonly {
    readonly memberId: string;
    readonly name: string;
    readonly avatarUrl: string | null;
    readonly consumed: readonly NutrientAmount[];
    readonly targets: readonly NutrientAmount[];
    readonly completeness: "complete" | "partial" | "unavailable";
  }[];
}

export function getMealPlanWeek(
  client: ApiClient,
  date: string,
  signal?: AbortSignal,
): Promise<{ readonly data: MealPlanWeek }> {
  return client.get(
    `/api/v1/meal-plans/week?date=${encodeURIComponent(date)}`,
    signal ? { signal } : undefined,
  );
}
