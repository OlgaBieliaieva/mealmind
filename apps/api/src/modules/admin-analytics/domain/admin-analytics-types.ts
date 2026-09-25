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

export interface ProductsAnalyticsPoint {
  readonly period: string;
  readonly value: number;
}

export interface AnalyticsRankingItem {
  readonly id: string;
  readonly label: string;
  readonly value: number;
}

export interface ProductsAnalytics {
  readonly meta: {
    readonly from: string;
    readonly to: string;
    readonly granularity: AnalyticsGranularity;
    readonly timezone: string;
    readonly generatedAt: string;
  };
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
  readonly series: readonly ProductsAnalyticsPoint[];
}

export interface RecipesAnalytics {
  readonly meta: ProductsAnalytics["meta"];
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
  readonly series: readonly ProductsAnalyticsPoint[];
}
