import type { ApiClient } from "./api-client";

export interface NutrientAmount {
  readonly code: string;
  readonly name: string;
  readonly unit: string;
  readonly value: number;
}
export interface NutrientTargetAmount extends NutrientAmount {
  readonly minimumValue: number | null;
  readonly targetValue: number | null;
  readonly maximumValue: number | null;
}
export interface NutritionAssessment {
  readonly energyCoveragePercent: number | null;
  readonly macroEnergyPercent: {
    readonly protein: number | null;
    readonly fat: number | null;
    readonly carbohydrate: number | null;
  };
  readonly signals: readonly string[];
}
export interface MealType {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly sortOrder: number;
}
export interface MealPlanEntry {
  readonly id: string;
  readonly revision: number;
  readonly kind: "product" | "recipe";
  readonly foodId: string;
  readonly name: string;
  readonly imageUrl: string | null;
  readonly categoryCode: string | null;
  readonly categoryName: string | null;
  readonly recipeType: { readonly code: string; readonly name: string } | null;
  readonly totalTimeMin: number | null;
  readonly difficulty: string | null;
  readonly preparedAt: string | null;
  readonly position: number;
  readonly participants: readonly {
    readonly memberId: string;
    readonly name: string;
    readonly quantity: number;
    readonly quantityInGrams: number;
    readonly unit: string;
    readonly avatarUrl: string | null;
  }[];
}
export interface AggregatedMealPlanEntry {
  readonly key: string;

  readonly kind: "product" | "recipe";
  readonly foodId: string;

  readonly name: string;
  readonly imageUrl: string | null;

  readonly categoryCode: string | null;
  readonly categoryName: string | null;

  readonly recipeType: {
    readonly code: string;
    readonly name: string;
  } | null;

  readonly totalTimeMin: number | null;
  readonly difficulty: string | null;

  readonly dates: readonly string[];

  readonly totalPortions: number;
  readonly totalWeightGrams: number;

  readonly participants: readonly {
    readonly memberId: string;
    readonly name: string;
    readonly portions: number;
    readonly quantityInGrams: number;
    readonly avatarUrl: string | null;
  }[];

  readonly sources: readonly {
    readonly entryId: string;
    readonly revision: number;
    readonly date: string;
    readonly mealTypeId: string;
    readonly preparedAt: string | null;
  }[];
}
export interface MealPlanWeek {
  readonly planId: string | null;
  readonly familyId: string;
  readonly familyName: string;
  readonly role: "OWNER" | "MEMBER";
  readonly selfMemberId: string | null;
  readonly selectedDates: readonly string[];
  readonly weekStart: string;
  readonly weekEnd: string;
  readonly weekStartsOn: string;
  readonly timeZone: string;
  readonly days: readonly {
    readonly date: string;
    readonly meals: readonly {
      readonly mealType: MealType;
      readonly entries: readonly MealPlanEntry[];
    }[];
  }[];
  readonly aggregatedMeals: {
    readonly nutrition: NutritionAggregate;
    readonly all: readonly AggregatedMealPlanEntry[];

    readonly byMealType: readonly {
      readonly mealType: MealType;
      readonly nutrition: NutritionAggregate;
      readonly entries: readonly AggregatedMealPlanEntry[];
    }[];
  };
  readonly members: readonly {
    readonly memberId: string;
    readonly name: string;
    readonly avatarUrl: string | null;
    readonly planned: readonly NutrientAmount[];
    readonly targets: readonly NutrientTargetAmount[];
    readonly completeness: "complete" | "partial" | "unavailable";
    readonly assessment: NutritionAssessment;
    readonly details: {
      readonly days: readonly MemberDayNutrition[];

      readonly mealTypes: readonly MemberMealNutrition[];
    };
  }[];
}
export interface PlanningContext {
  readonly familyId: string;
  readonly familyName: string;
  readonly role: "OWNER" | "MEMBER";
  readonly weekStart: string;
  readonly weekEnd: string;
  readonly availableDays: readonly string[];
  readonly members: readonly {
    readonly id: string;
    readonly name: string;
    readonly avatarUrl: string | null;
    readonly isSelf: boolean;
    readonly canPlan: boolean;
    readonly mealTypes: readonly MealType[];
  }[];
}
export interface BatchMealEntry {
  readonly date: string;
  readonly mealTypeId: string;
  readonly kind: "product" | "recipe";
  readonly foodId: string;
  readonly participants: readonly { readonly memberId: string; readonly quantityGrams: number }[];
}

export interface NutritionAggregate {
  readonly planned: readonly NutrientAmount[];
  readonly targets: readonly NutrientTargetAmount[];

  readonly completeness: "complete" | "partial" | "unavailable";

  readonly assessment: NutritionAssessment;
}

export interface MemberFood {
  readonly entryId: string;
  readonly revision: number;

  readonly date: string;

  readonly mealType: MealType;

  readonly kind: "product" | "recipe";

  readonly foodId: string;
  readonly name: string;

  readonly imageUrl: string | null;

  readonly categoryCode: string | null;
  readonly categoryName: string | null;

  readonly recipeType: {
    readonly code: string;
    readonly name: string;
  } | null;

  readonly preparedAt: string | null;

  readonly portionGrams: number;

  readonly energyPer100g: number | null;
  readonly portionEnergyKcal: number | null;

  readonly macros: {
    readonly protein: number | null;
    readonly fat: number | null;
    readonly carbohydrate: number | null;
  };
}

export interface MemberMealNutrition {
  readonly mealType: MealType;

  readonly entryCount: number;
  readonly preparedCount: number;

  readonly nutrition: NutritionAggregate;

  readonly entries: readonly MemberFood[];
}

export interface MemberDayNutrition {
  readonly date: string;

  readonly entryCount: number;
  readonly mealCount: number;
  readonly preparedCount: number;

  readonly nutrition: NutritionAggregate;

  readonly meals: readonly MemberMealNutrition[];
}

export function getMealPlanWeek(
  client: ApiClient,
  date: string,
  days?: readonly string[],
  signal?: AbortSignal,
): Promise<{ readonly data: MealPlanWeek }> {
  const query = new URLSearchParams({ date });
  if (days?.length) query.set("days", days.join(","));
  return client.get(`/api/v1/meal-plans/week?${query.toString()}`, signal ? { signal } : undefined);
}
export function getPlanningContext(
  client: ApiClient,
  date: string,
  signal?: AbortSignal,
): Promise<{ readonly data: PlanningContext }> {
  return client.get(
    `/api/v1/meal-plans/planning-context?date=${encodeURIComponent(date)}`,
    signal ? { signal } : undefined,
  );
}
export function createMealEntries(
  client: ApiClient,
  date: string,
  entries: readonly BatchMealEntry[],
  conflictPolicy: "REJECT" | "UPSERT_PARTICIPANTS" = "REJECT",
  requestId = globalThis.crypto.randomUUID(),
) {
  return client.post<{
    readonly data: {
      readonly entries: readonly { readonly id: string; readonly revision: number }[];
      readonly replayed: boolean;
    };
  }>(`/api/v1/meal-plans/entries/batch?date=${encodeURIComponent(date)}`, {
    requestId,
    conflictPolicy,
    entries,
  });
}
export function updateMealEntryParticipant(
  client: ApiClient,
  entryId: string,
  memberId: string,
  expectedRevision: number,
  quantityGrams: number,
) {
  return client.patch<{ readonly data: { readonly id: string; readonly revision: number } }>(
    `/api/v1/meal-plans/entries/${encodeURIComponent(entryId)}/participants/${encodeURIComponent(memberId)}`,
    { expectedRevision, quantityGrams },
  );
}
export function deleteMealEntryParticipant(
  client: ApiClient,
  entryId: string,
  memberId: string,
  expectedRevision: number,
) {
  return client.delete<void>(
    `/api/v1/meal-plans/entries/${encodeURIComponent(entryId)}/participants/${encodeURIComponent(memberId)}?expectedRevision=${expectedRevision}`,
  );
}
export function deleteMealEntry(client: ApiClient, entryId: string, expectedRevision: number) {
  return client.delete<void>(
    `/api/v1/meal-plans/entries/${encodeURIComponent(entryId)}?expectedRevision=${expectedRevision}`,
  );
}

export function setMealEntryPrepared(
  client: ApiClient,
  entryId: string,
  expectedRevision: number,
  prepared: boolean,
) {
  return client.patch<{
    readonly data: {
      readonly id: string;
      readonly revision: number;
      readonly preparedAt: string | null;
    };
  }>(`/api/v1/meal-plans/entries/${encodeURIComponent(entryId)}/prepared`, {
    expectedRevision,
    prepared,
  });
}
