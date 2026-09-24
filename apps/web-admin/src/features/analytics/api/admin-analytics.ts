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
