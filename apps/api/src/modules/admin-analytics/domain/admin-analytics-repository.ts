import type { ResolvedAnalyticsPeriod, UsersAnalyticsPoint } from "./admin-analytics-types.js";

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
}
