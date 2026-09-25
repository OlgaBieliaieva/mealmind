import type {
  AnalyticsRankingItem,
  ProductsAnalytics,
  ProductsAnalyticsPoint,
  ReferencesAnalytics,
  ResolvedAnalyticsPeriod,
  UsersAnalyticsPoint,
} from "./admin-analytics-types.js";

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
  getUsers(period: ResolvedAnalyticsPeriod): Promise<UsersAnalyticsSnapshot>;
  getProducts(
    period: ResolvedAnalyticsPeriod,
    generatedAt: Date,
  ): Promise<ProductsAnalyticsSnapshot>;
  getReferences(): Promise<Omit<ReferencesAnalytics, "generatedAt">>;
}
