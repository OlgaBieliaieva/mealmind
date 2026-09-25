import type { ApiClient } from "@/shared/api/api-client";

export type AnalyticsGranularity = "day" | "week" | "month";

export interface AnalyticsPeriodParameters {
  readonly from?: string;
  readonly to?: string;
  readonly granularity?: AnalyticsGranularity;
  readonly timezone?: string;
}

export interface ComparisonMetric {
  readonly value: number;
  readonly previousValue: number;
  readonly delta: number;
  readonly deltaPercent: number | null;
}

export interface UsersAnalytics {
  readonly meta: {
    readonly from: string;
    readonly to: string;
    readonly granularity: AnalyticsGranularity;
    readonly timezone: string;
    readonly generatedAt: string;
  };
  readonly totals: {
    readonly activeUsers: number;
    readonly deletedUsers: number;
    readonly activeFamilies: number;
    readonly archivedFamilies: number;
    readonly activeProfiles: number;
    readonly archivedProfiles: number;
  };
  readonly completion: {
    readonly onboarding: CompletionMetric;
    readonly profiles: CompletionMetric;
  };
  readonly averages: {
    readonly activeUsersPerFamily: number | null;
    readonly activeProfilesPerFamily: number | null;
  };
  readonly created: {
    readonly users: ComparisonMetric;
    readonly families: ComparisonMetric;
    readonly profiles: ComparisonMetric;
  };
  readonly series: readonly {
    readonly period: string;
    readonly users: number;
    readonly families: number;
    readonly profiles: number;
  }[];
}

export type AnalyticsReferenceResource =
  | "allergens"
  | "authors"
  | "brands"
  | "cuisines"
  | "dietary-tags"
  | "meal-types"
  | "measurement-units"
  | "nutrients"
  | "product-categories"
  | "recipe-types";

export interface ReferencesAnalytics {
  readonly generatedAt: string;
  readonly resources: readonly {
    readonly resource: AnalyticsReferenceResource;
    readonly total: number;
    readonly active: number;
    readonly inactive: number;
  }[];
  readonly brands: {
    readonly statuses: Readonly<Record<"DRAFT" | "ACTIVE" | "ARCHIVED", number>>;
    readonly verification: Readonly<Record<"UNVERIFIED" | "VERIFIED" | "REJECTED", number>>;
  };
  readonly authors: {
    readonly types: Readonly<Record<"MEALMIND" | "EXPERT" | "BLOGGER" | "USER", number>>;
  };
  readonly quality: {
    readonly brandsAwaitingVerification: number;
    readonly draftBrands: number;
    readonly categoriesWithoutProducts: number;
    readonly recipeTypesWithoutRecipes: number;
    readonly cuisinesWithoutRecipes: number;
    readonly dietaryTagsWithoutUsage: number;
  };
}

export interface AnalyticsRankingItem {
  readonly id: string;
  readonly label: string;
  readonly value: number;
}

export interface ProductsAnalytics {
  readonly meta: UsersAnalytics["meta"];
  readonly totals: {
    readonly all: number;
    readonly createdLast24Hours: number;
    readonly awaitingVerification: number;
    readonly drafts: number;
  };
  readonly created: ComparisonMetric;
  readonly breakdowns: {
    readonly types: Readonly<Record<"GENERIC" | "BRANDED", number>>;
    readonly foodStates: Readonly<
      Record<"UNSPECIFIED" | "RAW" | "COOKED" | "PROCESSED" | "READY_TO_EAT", number>
    >;
    readonly statuses: Readonly<Record<"DRAFT" | "ACTIVE" | "ARCHIVED", number>>;
    readonly verification: Readonly<Record<"UNVERIFIED" | "VERIFIED" | "REJECTED", number>>;
    readonly sources: Readonly<
      Record<"USDA" | "MEALMIND_ADMIN" | "MEALMIND_USER" | "UNASSIGNED", number>
    >;
  };
  readonly rankings: {
    readonly categories: readonly AnalyticsRankingItem[];
    readonly brands: readonly AnalyticsRankingItem[];
    readonly favorites: readonly AnalyticsRankingItem[];
  };
  readonly series: readonly { readonly period: string; readonly value: number }[];
}

export interface RecipesAnalytics {
  readonly meta: UsersAnalytics["meta"];
  readonly totals: {
    readonly all: number;
    readonly drafts: number;
    readonly familyOnly: number;
  };
  readonly created: ComparisonMetric;
  readonly breakdowns: {
    readonly statuses: Readonly<Record<"DRAFT" | "READY" | "PUBLISHED" | "ARCHIVED", number>>;
    readonly visibility: Readonly<Record<"FAMILY" | "PUBLIC", number>>;
    readonly difficulties: Readonly<Record<"EASY" | "MEDIUM" | "HARD" | "UNASSIGNED", number>>;
    readonly authorTypes: Readonly<
      Record<"MEALMIND" | "EXPERT" | "BLOGGER" | "USER" | "UNASSIGNED", number>
    >;
    readonly creatorOrigins: Readonly<Record<"USER" | "SYSTEM", number>>;
  };
  readonly rankings: {
    readonly recipeTypes: readonly AnalyticsRankingItem[];
    readonly cuisines: readonly AnalyticsRankingItem[];
    readonly dietaryTags: readonly AnalyticsRankingItem[];
    readonly authors: readonly AnalyticsRankingItem[];
    readonly favorites: readonly AnalyticsRankingItem[];
  };
  readonly series: readonly { readonly period: string; readonly value: number }[];
}

interface CompletionMetric {
  readonly completed: number;
  readonly total: number;
  readonly percent: number | null;
}

export function getUsersAnalytics(apiClient: ApiClient, parameters: AnalyticsPeriodParameters) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined) query.set(key, value);
  }
  return apiClient.get<{ readonly data: UsersAnalytics }>(
    `/api/v1/admin/analytics/users${query.size === 0 ? "" : `?${query.toString()}`}`,
  );
}

export function getReferencesAnalytics(apiClient: ApiClient) {
  return apiClient.get<{ readonly data: ReferencesAnalytics }>(
    "/api/v1/admin/analytics/references",
  );
}

export function getProductsAnalytics(apiClient: ApiClient, parameters: AnalyticsPeriodParameters) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined) query.set(key, value);
  }
  return apiClient.get<{ readonly data: ProductsAnalytics }>(
    `/api/v1/admin/analytics/products${query.size === 0 ? "" : `?${query.toString()}`}`,
  );
}

export function getRecipesAnalytics(apiClient: ApiClient, parameters: AnalyticsPeriodParameters) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined) query.set(key, value);
  }
  return apiClient.get<{ readonly data: RecipesAnalytics }>(
    `/api/v1/admin/analytics/recipes${query.size === 0 ? "" : `?${query.toString()}`}`,
  );
}
