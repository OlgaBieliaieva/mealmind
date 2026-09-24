export const ANALYTICS_GRANULARITIES = ["day", "week", "month"] as const;
export type AnalyticsGranularity = (typeof ANALYTICS_GRANULARITIES)[number];

export interface AnalyticsPeriodQuery {
  readonly from?: string | undefined;
  readonly to?: string | undefined;
  readonly granularity?: AnalyticsGranularity | undefined;
  readonly timezone?: string | undefined;
}

export interface ResolvedAnalyticsPeriod {
  readonly from: string;
  readonly to: string;
  readonly previousFrom: string;
  readonly granularity: AnalyticsGranularity;
  readonly timezone: string;
}

export interface AnalyticsMeta {
  readonly from: string;
  readonly to: string;
  readonly granularity: AnalyticsGranularity;
  readonly timezone: string;
  readonly generatedAt: string;
}

export interface ComparisonMetric {
  readonly value: number;
  readonly previousValue: number;
  readonly delta: number;
  readonly deltaPercent: number | null;
}

export interface CompletionMetric {
  readonly completed: number;
  readonly total: number;
  readonly percent: number | null;
}

export interface UsersAnalyticsPoint {
  readonly period: string;
  readonly users: number;
  readonly families: number;
  readonly profiles: number;
}

export interface UsersAnalytics {
  readonly meta: AnalyticsMeta;
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
  readonly series: readonly UsersAnalyticsPoint[];
}

export const ANALYTICS_REFERENCE_RESOURCES = [
  "allergens",
  "authors",
  "brands",
  "cuisines",
  "dietary-tags",
  "meal-types",
  "measurement-units",
  "nutrients",
  "product-categories",
  "recipe-types",
] as const;

export type AnalyticsReferenceResource = (typeof ANALYTICS_REFERENCE_RESOURCES)[number];

export interface ReferenceResourceMetric {
  readonly resource: AnalyticsReferenceResource;
  readonly total: number;
  readonly active: number;
  readonly inactive: number;
}

export interface ReferencesAnalytics {
  readonly generatedAt: string;
  readonly resources: readonly ReferenceResourceMetric[];
  readonly brands: {
    readonly statuses: Readonly<Record<"DRAFT" | "ACTIVE" | "ARCHIVED", number>>;
    readonly verification: Readonly<Record<"UNVERIFIED" | "VERIFIED" | "REJECTED", number>>;
  };
  readonly authors: {
    readonly types: Readonly<Record<"MEALMIND" | "EXPERT" | "BLOGGER", number>>;
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
