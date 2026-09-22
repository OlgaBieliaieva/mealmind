export type FamilyPlanningRole = "OWNER" | "MEMBER";
export type FoodKind = "product" | "recipe";

export interface MealPlanWeekQuery {
  readonly weekStart: Date;
  readonly weekEnd: Date;
  readonly selectedDates: readonly string[];
  readonly userId: string;
  readonly role: FamilyPlanningRole;
}

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

export interface MealPlanParticipantView {
  readonly memberId: string;
  readonly name: string;
  readonly quantity: number;
  readonly quantityInGrams: number;
  readonly unit: string;
  readonly avatarUrl: string | null;
}

export interface MealPlanEntryView {
  readonly id: string;
  readonly revision: number;
  readonly kind: FoodKind;
  readonly foodId: string;
  readonly name: string;
  readonly imageUrl: string | null;
  readonly imageObjectPath?: string | null;
  readonly categoryCode: string | null;
  readonly categoryName: string | null;
  readonly recipeType: { readonly code: string; readonly name: string } | null;
  readonly totalTimeMin: number | null;
  readonly difficulty: string | null;
  readonly preparedAt: string | null;
  readonly cookingSession: {
    readonly id: string;
    readonly status: "IN_PROGRESS" | "COMPLETED";
    readonly resolvedSteps: number;
    readonly totalSteps: number;
  } | null;
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

export interface AggregatedMealPlanParticipantView {
  readonly memberId: string;
  readonly name: string;
  readonly portions: number;
  readonly quantityInGrams: number;
  readonly avatarUrl: string | null;
}

export interface AggregatedMealPlanEntrySourceView {
  readonly entryId: string;
  readonly revision: number;
  readonly date: string;
  readonly mealTypeId: string;
  readonly preparedAt: string | null;
  readonly cookingSession: MealPlanEntryView["cookingSession"];
}

export interface AggregatedMealPlanEntryView {
  readonly key: string;
  readonly kind: FoodKind;
  readonly foodId: string;

  readonly name: string;
  readonly imageUrl: string | null;
  readonly imageObjectPath?: string | null;

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

  readonly participants: readonly AggregatedMealPlanParticipantView[];
  readonly sources: readonly AggregatedMealPlanEntrySourceView[];
}

export interface AggregatedMealTypeGroupView {
  readonly mealType: MealTypeView;
  readonly nutrition: NutritionAggregateView;
  readonly entries: readonly AggregatedMealPlanEntryView[];
}

export interface AggregatedMealsView {
  readonly nutrition: NutritionAggregateView;
  readonly all: readonly AggregatedMealPlanEntryView[];
  readonly byMealType: readonly AggregatedMealTypeGroupView[];
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

export type NutritionCompleteness = "complete" | "partial" | "unavailable";

export interface NutritionAggregateView {
  readonly planned: readonly NutrientAmount[];
  readonly targets: readonly NutrientTargetAmount[];
  readonly completeness: NutritionCompleteness;
  readonly assessment: NutritionAssessment;
}

export interface MemberFoodMacrosView {
  readonly protein: number | null;
  readonly fat: number | null;
  readonly carbohydrate: number | null;
}

export interface MemberFoodView {
  readonly entryId: string;
  readonly revision: number;

  readonly date: string;

  readonly mealType: MealTypeView;

  readonly kind: FoodKind;
  readonly foodId: string;

  readonly name: string;

  readonly imageUrl: string | null;
  readonly imageObjectPath?: string | null;

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

  readonly macros: MemberFoodMacrosView;
}

export interface MemberMealNutritionView {
  readonly mealType: MealTypeView;

  readonly entryCount: number;
  readonly preparedCount: number;

  readonly nutrition: NutritionAggregateView;

  readonly entries: readonly MemberFoodView[];
}

export interface MemberDayNutritionView {
  readonly date: string;

  readonly entryCount: number;
  readonly mealCount: number;
  readonly preparedCount: number;

  readonly nutrition: NutritionAggregateView;

  readonly meals: readonly MemberMealNutritionView[];
}

export interface MemberDetailsView {
  readonly days: readonly MemberDayNutritionView[];
  readonly mealTypes: readonly MemberMealNutritionView[];
}

export interface MemberNutritionView {
  readonly memberId: string;
  readonly name: string;
  readonly avatarUrl: string | null;

  readonly planned: readonly NutrientAmount[];
  readonly targets: readonly NutrientTargetAmount[];

  readonly completeness: NutritionCompleteness;
  readonly assessment: NutritionAssessment;

  readonly details: MemberDetailsView;
}

export interface MealPlanWeekView {
  readonly planId: string | null;
  readonly familyId: string;
  readonly familyName: string;
  readonly role: FamilyPlanningRole;
  readonly selfMemberId: string | null;
  readonly selectedDates: readonly string[];
  readonly weekStart: string;
  readonly weekEnd: string;
  readonly weekStartsOn: string;
  readonly timeZone: string;

  readonly days: readonly MealPlanDayView[];

  readonly aggregatedMeals: AggregatedMealsView;

  readonly members: readonly MemberNutritionView[];
}

export interface PlanningMemberView {
  readonly id: string;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly isSelf: boolean;
  readonly canPlan: boolean;
  readonly mealTypes: readonly MealTypeView[];
}

export interface PlanningContextView {
  readonly familyId: string;
  readonly familyName: string;
  readonly role: FamilyPlanningRole;
  readonly weekStart: string;
  readonly weekEnd: string;
  readonly availableDays: readonly string[];
  readonly members: readonly PlanningMemberView[];
}

export interface BatchParticipantInput {
  readonly memberId: string;
  readonly quantityGrams: number;
}

export interface BatchEntryInput {
  readonly date: string;
  readonly mealTypeId: string;
  readonly kind: FoodKind;
  readonly foodId: string;
  readonly participants: readonly BatchParticipantInput[];
}

export interface CreateMealEntriesCommand {
  readonly familyId: string;
  readonly userId: string;
  readonly role: FamilyPlanningRole;
  readonly weekStart: Date;
  readonly weekEnd: Date;
  readonly requestId: string;
  readonly fingerprint: string;
  readonly conflictPolicy: "REJECT" | "UPSERT_PARTICIPANTS";
  readonly entries: readonly BatchEntryInput[];
}

export interface MealEntryMutationResult {
  readonly entries: readonly { readonly id: string; readonly revision: number }[];
  readonly replayed: boolean;
}

export interface UpdateEntryPlacementCommand {
  readonly familyId: string;
  readonly userId: string;
  readonly role: FamilyPlanningRole;
  readonly entryId: string;
  readonly expectedRevision: number;
  readonly date: string;
  readonly mealTypeId: string;
}

export interface UpdateParticipantCommand {
  readonly familyId: string;
  readonly userId: string;
  readonly role: FamilyPlanningRole;
  readonly entryId: string;
  readonly memberId: string;
  readonly expectedRevision: number;
  readonly quantityGrams: number;
}

export interface DeleteEntryCommand {
  readonly familyId: string;
  readonly userId: string;
  readonly role: FamilyPlanningRole;
  readonly entryId: string;
  readonly expectedRevision: number;
}

export interface DeleteParticipantCommand extends DeleteEntryCommand {
  readonly memberId: string;
}

export interface SetEntryPreparedCommand extends DeleteEntryCommand {
  readonly prepared: boolean;
}

export interface MealPlanRepository {
  readWeek(familyId: string, query: MealPlanWeekQuery): Promise<MealPlanWeekView>;
  readPlanningContext(
    familyId: string,
    userId: string,
    role: FamilyPlanningRole,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<PlanningContextView>;
  createEntries(command: CreateMealEntriesCommand): Promise<MealEntryMutationResult>;
  updateEntryPlacement(
    command: UpdateEntryPlacementCommand,
  ): Promise<{ id: string; revision: number }>;
  updateParticipant(command: UpdateParticipantCommand): Promise<{ id: string; revision: number }>;
  setEntryPrepared(
    command: SetEntryPreparedCommand,
  ): Promise<{ id: string; revision: number; preparedAt: string | null }>;
  deleteEntry(command: DeleteEntryCommand): Promise<void>;
  deleteParticipant(command: DeleteParticipantCommand): Promise<void>;
}
