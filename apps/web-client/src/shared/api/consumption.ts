import type { ApiClient } from "./api-client";

export type DiaryItemStatus = "PENDING" | "CONFIRMED" | "CHANGED" | "SKIPPED";
export interface DiaryItem {
  readonly key: string;
  readonly source: "MEAL_PLAN" | "MANUAL";
  readonly participantId: string | null;
  readonly entryId: string | null;
  readonly revision: number | null;
  readonly kind: "product" | "recipe";
  readonly foodId: string;
  readonly name: string;
  readonly imageUrl: string | null;
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
export interface DiaryNutrient {
  readonly code: string;
  readonly name: string;
  readonly unit: string;
  readonly value: number;
  readonly completeness: "COMPLETE" | "PARTIAL" | "UNVERIFIED";
}
export interface DiaryTarget {
  readonly code: string;
  readonly name: string;
  readonly unit: string;
  readonly minimumValue: number | null;
  readonly targetValue: number | null;
  readonly maximumValue: number | null;
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

export function readDiary(client: ApiClient, date: string, signal?: AbortSignal) {
  return client.get<{ readonly data: DiaryDay }>(
    `/api/v1/consumption/diary?date=${encodeURIComponent(date)}`,
    signal ? { signal } : undefined,
  );
}
export function readDashboard(client: ApiClient, dates: readonly string[], signal?: AbortSignal) {
  return client.get<{ readonly data: ConsumptionDashboard }>(
    `/api/v1/consumption/dashboard?dates=${encodeURIComponent(dates.join(","))}`,
    signal ? { signal } : undefined,
  );
}
export function confirmPlannedConsumption(
  client: ApiClient,
  participantId: string,
  quantityGrams?: number,
) {
  return client.post<{ readonly data: DiaryDay }>(
    `/api/v1/consumption/plan/${encodeURIComponent(participantId)}/confirm`,
    quantityGrams === undefined ? {} : { quantityGrams },
  );
}
export function skipPlannedConsumption(client: ApiClient, participantId: string, date: string) {
  return client.post<{ readonly data: DiaryDay }>(
    `/api/v1/consumption/plan/${encodeURIComponent(participantId)}/skip`,
    { date },
  );
}
export function restorePlannedConsumption(client: ApiClient, participantId: string, date: string) {
  return client.post<{ readonly data: DiaryDay }>(
    `/api/v1/consumption/plan/${encodeURIComponent(participantId)}/restore`,
    { date },
  );
}
export function updateConsumptionEntry(
  client: ApiClient,
  entryId: string,
  input: {
    readonly expectedRevision: number;
    readonly quantityGrams: number;
    readonly mealTypeId: string;
    readonly date: string;
  },
) {
  return client.patch<{ readonly data: DiaryDay }>(
    `/api/v1/consumption/entries/${encodeURIComponent(entryId)}`,
    input,
  );
}
export function voidConsumption(
  client: ApiClient,
  entryId: string,
  expectedRevision: number,
  date: string,
) {
  return client.post<{ readonly data: DiaryDay }>(
    `/api/v1/consumption/entries/${encodeURIComponent(entryId)}/void`,
    { expectedRevision, date },
  );
}
export function addManualConsumption(
  client: ApiClient,
  input: {
    readonly memberId: string;
    readonly date: string;
    readonly kind: "product" | "recipe";
    readonly foodId: string;
    readonly mealTypeId: string;
    readonly quantityGrams: number;
  },
) {
  return client.post<{ readonly data: DiaryDay }>("/api/v1/consumption/entries/manual", input);
}
