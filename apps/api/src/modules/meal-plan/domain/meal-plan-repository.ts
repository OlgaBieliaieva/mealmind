export interface MealPlanWeekQuery {
  readonly weekStart: Date;
  readonly weekEnd: Date;
}

export interface NutrientAmount {
  readonly code: string;
  readonly name: string;
  readonly unit: string;
  readonly value: number;
}

export interface MealPlanParticipantView {
  readonly memberId: string;
  readonly name: string;
  readonly quantity: number;
  readonly quantityInGrams: number;
  readonly unit: string;
}

export interface MealPlanEntryView {
  readonly id: string;
  readonly kind: "product" | "recipe";
  readonly foodId: string;
  readonly name: string;
  readonly imageUrl: string | null;
  readonly categoryCode: string | null;
  readonly position: number;
  readonly participants: readonly MealPlanParticipantView[];
}

export interface MealTypeView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly sortOrder: number;
}

export interface MealPlanDayView {
  readonly date: string;
  readonly meals: readonly {
    readonly mealType: MealTypeView;
    readonly entries: readonly MealPlanEntryView[];
  }[];
}

export interface MemberNutritionView {
  readonly memberId: string;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly consumed: readonly NutrientAmount[];
  readonly targets: readonly NutrientAmount[];
  readonly completeness: "complete" | "partial" | "unavailable";
}

export interface MealPlanWeekView {
  readonly planId: string | null;
  readonly familyName: string;
  readonly weekStart: string;
  readonly weekEnd: string;
  readonly weekStartsOn: string;
  readonly timeZone: string;
  readonly days: readonly MealPlanDayView[];
  readonly members: readonly MemberNutritionView[];
}

export interface MealPlanRepository {
  readWeek(familyId: string, query: MealPlanWeekQuery): Promise<MealPlanWeekView>;
}
