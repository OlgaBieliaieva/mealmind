export type DiaryItemStatus = "PENDING" | "CONFIRMED" | "CHANGED" | "SKIPPED";
export type DiaryFoodKind = "product" | "recipe";

export interface DiaryNutrient {
  readonly code: string;
  readonly name: string;
  readonly unit: string;
  readonly value: number;
  readonly completeness: "COMPLETE" | "PARTIAL" | "UNVERIFIED";
}

export interface DiaryTarget extends Omit<DiaryNutrient, "value" | "completeness"> {
  readonly minimumValue: number | null;
  readonly targetValue: number | null;
  readonly maximumValue: number | null;
}

export interface DiaryItem {
  readonly key: string;
  readonly source: "MEAL_PLAN" | "MANUAL";
  readonly participantId: string | null;
  readonly entryId: string | null;
  readonly revision: number | null;
  readonly kind: DiaryFoodKind;
  readonly foodId: string;
  readonly name: string;
  readonly imageUrl: string | null;
  readonly imageObjectPath?: string | null;
  readonly categoryCode: string | null;
  readonly categoryName: string | null;
  readonly recipeType: { readonly code: string; readonly name: string } | null;
  readonly mealType: {
    readonly id: string;
    readonly name: string;
    readonly sortOrder: number;
  } | null;
  readonly plannedMealType: {
    readonly id: string;
    readonly name: string;
    readonly sortOrder: number;
  } | null;
  readonly energyPer100g: number | null;
  readonly plannedQuantityGrams: number | null;
  readonly plannedEnergyKcal: number | null;
  readonly actualQuantityGrams: number | null;
  readonly actualEnergyKcal: number | null;
  readonly macros: {
    readonly protein: number | null;
    readonly fat: number | null;
    readonly carbohydrate: number | null;
  };
  readonly status: DiaryItemStatus;
  readonly preparedAt: string | null;
}

export interface DiaryMember {
  readonly memberId: string;
  readonly name: string;
  readonly isSelf: boolean;
  readonly canEdit: boolean;
  readonly mealTypes: readonly {
    readonly id: string;
    readonly name: string;
    readonly sortOrder: number;
  }[];
  readonly summary: {
    readonly plannedCount: number;
    readonly confirmedCount: number;
    readonly changedCount: number;
    readonly skippedCount: number;
    readonly pendingCount: number;
    readonly addedCount: number;
    readonly deviationCount: number;
    readonly adherencePercent: number | null;
  };
  readonly nutrients: readonly DiaryNutrient[];
  readonly targets: readonly DiaryTarget[];
  readonly items: readonly DiaryItem[];
}

export interface DiaryDay {
  readonly familyName: string;
  readonly role: "OWNER" | "MEMBER";
  readonly selfMemberId: string | null;
  readonly date: string;
  readonly timeZone: string;
  readonly members: readonly DiaryMember[];
}

export interface DashboardMember extends Omit<DiaryMember, "mealTypes" | "items"> {
  readonly weight: {
    readonly startKg: number | null;
    readonly endKg: number | null;
    readonly changeKg: number | null;
    readonly startMeasuredAt: string | null;
    readonly endMeasuredAt: string | null;
  };
}

export interface ConsumptionDashboard {
  readonly familyName: string;
  readonly role: "OWNER" | "MEMBER";
  readonly selfMemberId: string | null;
  readonly dates: readonly string[];
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly timeZone: string;
  readonly members: readonly DashboardMember[];
}

export interface ConsumptionRepository {
  participantDate(familyId: string, participantId: string): Promise<string>;
  readDay(input: {
    readonly familyId: string;
    readonly familyName: string;
    readonly timeZone: string;
    readonly role: "OWNER" | "MEMBER";
    readonly userId: string;
    readonly date: string;
  }): Promise<DiaryDay>;
  readDashboard(input: {
    readonly familyId: string;
    readonly familyName: string;
    readonly timeZone: string;
    readonly role: "OWNER" | "MEMBER";
    readonly userId: string;
    readonly dates: readonly string[];
  }): Promise<ConsumptionDashboard>;
  confirmPlanned(input: {
    readonly familyId: string;
    readonly role: "OWNER" | "MEMBER";
    readonly userId: string;
    readonly participantId: string;
    readonly quantityGrams?: number;
  }): Promise<void>;
  skipPlanned(input: {
    readonly familyId: string;
    readonly role: "OWNER" | "MEMBER";
    readonly userId: string;
    readonly participantId: string;
  }): Promise<void>;
  restorePlanned(input: {
    readonly familyId: string;
    readonly role: "OWNER" | "MEMBER";
    readonly userId: string;
    readonly participantId: string;
  }): Promise<void>;
  updateEntry(input: {
    readonly familyId: string;
    readonly role: "OWNER" | "MEMBER";
    readonly userId: string;
    readonly entryId: string;
    readonly expectedRevision: number;
    readonly quantityGrams: number;
    readonly mealTypeId: string;
  }): Promise<void>;
  voidEntry(input: {
    readonly familyId: string;
    readonly role: "OWNER" | "MEMBER";
    readonly userId: string;
    readonly entryId: string;
    readonly expectedRevision: number;
  }): Promise<void>;
  addManual(input: {
    readonly familyId: string;
    readonly role: "OWNER" | "MEMBER";
    readonly userId: string;
    readonly memberId: string;
    readonly date: string;
    readonly kind: DiaryFoodKind;
    readonly foodId: string;
    readonly mealTypeId: string;
    readonly quantityGrams: number;
  }): Promise<void>;
}
