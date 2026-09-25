import type {
  AnalyticsRankingItem,
  OverviewAnalytics,
  ProductsAnalytics,
  ProductsAnalyticsPoint,
  RecipesAnalytics,
  ReferencesAnalytics,
  ResolvedAnalyticsPeriod,
  UsersAnalyticsPoint,
} from "./admin-analytics-types.js";

export type OverviewAnalyticsSnapshot = Omit<OverviewAnalytics, "meta">;

export interface ProductsAnalyticsSnapshot {
  readonly total: number;
  readonly createdLast24Hours: number;
  readonly awaitingVerification: number;
  readonly drafts: number;
  readonly currentCreated: number;
  readonly previousCreated: number;
  readonly types: ProductsAnalytics["breakdowns"]["types"];
  readonly foodStates: ProductsAnalytics["breakdowns"]["foodStates"];
  readonly statuses: ProductsAnalytics["breakdowns"]["statuses"];
  readonly verification: ProductsAnalytics["breakdowns"]["verification"];
  readonly sources: ProductsAnalytics["breakdowns"]["sources"];
  readonly categories: readonly AnalyticsRankingItem[];
  readonly brands: readonly AnalyticsRankingItem[];
  readonly favorites: readonly AnalyticsRankingItem[];
  readonly series: readonly ProductsAnalyticsPoint[];
}

export interface RecipesAnalyticsSnapshot {
  readonly total: number;
  readonly drafts: number;
  readonly familyOnly: number;
  readonly currentCreated: number;
  readonly previousCreated: number;
  readonly statuses: RecipesAnalytics["breakdowns"]["statuses"];
  readonly visibility: RecipesAnalytics["breakdowns"]["visibility"];
  readonly difficulties: RecipesAnalytics["breakdowns"]["difficulties"];
  readonly authorTypes: RecipesAnalytics["breakdowns"]["authorTypes"];
  readonly creatorOrigins: RecipesAnalytics["breakdowns"]["creatorOrigins"];
  readonly recipeTypes: readonly AnalyticsRankingItem[];
  readonly cuisines: readonly AnalyticsRankingItem[];
  readonly dietaryTags: readonly AnalyticsRankingItem[];
  readonly authors: readonly AnalyticsRankingItem[];
  readonly favorites: readonly AnalyticsRankingItem[];
  readonly series: readonly ProductsAnalyticsPoint[];
}

export interface UsersAnalyticsSnapshot {
  readonly activeUsers: number;
  readonly deletedUsers: number;
  readonly activeFamilies: number;
  readonly archivedFamilies: number;
  readonly activeProfiles: number;
  readonly archivedProfiles: number;
  readonly completedOnboarding: number;
  readonly completedProfiles: number;
  readonly activeMemberships: number;
  readonly activeFamilyMembers: number;
  readonly currentCreatedUsers: number;
  readonly previousCreatedUsers: number;
  readonly currentCreatedFamilies: number;
  readonly previousCreatedFamilies: number;
  readonly currentCreatedProfiles: number;
  readonly previousCreatedProfiles: number;
  readonly series: readonly UsersAnalyticsPoint[];
}

export interface AdminAnalyticsRepository {
  getOverview(period: ResolvedAnalyticsPeriod): Promise<OverviewAnalyticsSnapshot>;
  getUsers(period: ResolvedAnalyticsPeriod): Promise<UsersAnalyticsSnapshot>;
  getProducts(
    period: ResolvedAnalyticsPeriod,
    generatedAt: Date,
  ): Promise<ProductsAnalyticsSnapshot>;
  getRecipes(period: ResolvedAnalyticsPeriod): Promise<RecipesAnalyticsSnapshot>;
  getReferences(): Promise<Omit<ReferencesAnalytics, "generatedAt">>;
}
