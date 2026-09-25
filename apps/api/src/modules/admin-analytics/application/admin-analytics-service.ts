import type { AdminAnalyticsRepository } from "../domain/admin-analytics-repository.js";
import type {
  AnalyticsGranularity,
  AnalyticsPeriodQuery,
  ComparisonMetric,
  ProductsAnalytics,
  ResolvedAnalyticsPeriod,
  ReferencesAnalytics,
  UsersAnalytics,
} from "../domain/admin-analytics-types.js";

const DEFAULT_TIMEZONE = "Europe/Kyiv";
const MAX_PERIOD_DAYS = 732;

export interface AdminAnalyticsService {
  getUsers(query: AnalyticsPeriodQuery): Promise<UsersAnalytics>;
  getProducts(query: AnalyticsPeriodQuery): Promise<ProductsAnalytics>;
  getReferences(): Promise<ReferencesAnalytics>;
}

export function createAdminAnalyticsService(
  repository: AdminAnalyticsRepository,
  now: () => Date = () => new Date(),
): AdminAnalyticsService {
  return Object.freeze({
    async getUsers(query: AnalyticsPeriodQuery) {
      const period = resolveAnalyticsPeriod(query, now());
      const snapshot = await repository.getUsers(period);

      return Object.freeze({
        meta: Object.freeze({
          from: period.from,
          to: period.to,
          granularity: period.granularity,
          timezone: period.timezone,
          generatedAt: now().toISOString(),
        }),
        totals: Object.freeze({
          activeUsers: snapshot.activeUsers,
          deletedUsers: snapshot.deletedUsers,
          activeFamilies: snapshot.activeFamilies,
          archivedFamilies: snapshot.archivedFamilies,
          activeProfiles: snapshot.activeProfiles,
          archivedProfiles: snapshot.archivedProfiles,
        }),
        completion: Object.freeze({
          onboarding: completion(snapshot.completedOnboarding, snapshot.activeUsers),
          profiles: completion(snapshot.completedProfiles, snapshot.activeProfiles),
        }),
        averages: Object.freeze({
          activeUsersPerFamily: average(snapshot.activeMemberships, snapshot.activeFamilies),
          activeProfilesPerFamily: average(snapshot.activeFamilyMembers, snapshot.activeFamilies),
        }),
        created: Object.freeze({
          users: comparison(snapshot.currentCreatedUsers, snapshot.previousCreatedUsers),
          families: comparison(snapshot.currentCreatedFamilies, snapshot.previousCreatedFamilies),
          profiles: comparison(snapshot.currentCreatedProfiles, snapshot.previousCreatedProfiles),
        }),
        series: Object.freeze(snapshot.series),
      });
    },
    async getProducts(query: AnalyticsPeriodQuery) {
      const generatedAt = now();
      const period = resolveAnalyticsPeriod(query, generatedAt);
      const snapshot = await repository.getProducts(period, generatedAt);
      return Object.freeze({
        meta: Object.freeze({
          from: period.from,
          to: period.to,
          granularity: period.granularity,
          timezone: period.timezone,
          generatedAt: generatedAt.toISOString(),
        }),
        totals: Object.freeze({
          all: snapshot.total,
          createdLast24Hours: snapshot.createdLast24Hours,
          awaitingVerification: snapshot.awaitingVerification,
          drafts: snapshot.drafts,
        }),
        created: comparison(snapshot.currentCreated, snapshot.previousCreated),
        breakdowns: Object.freeze({
          types: snapshot.types,
          foodStates: snapshot.foodStates,
          statuses: snapshot.statuses,
          verification: snapshot.verification,
          sources: snapshot.sources,
        }),
        rankings: Object.freeze({
          categories: snapshot.categories,
          brands: snapshot.brands,
          favorites: snapshot.favorites,
        }),
        series: Object.freeze(snapshot.series),
      });
    },
    async getReferences() {
      const snapshot = await repository.getReferences();
      return Object.freeze({ ...snapshot, generatedAt: now().toISOString() });
    },
  });
}

export function resolveAnalyticsPeriod(
  query: AnalyticsPeriodQuery,
  currentTime: Date,
): ResolvedAnalyticsPeriod {
  const timezone = query.timezone ?? DEFAULT_TIMEZONE;
  assertTimezone(timezone);

  const defaultTo = localDate(currentTime, timezone);
  const to = query.to ?? defaultTo;
  const from = query.from ?? addMonths(defaultTo, -12);
  const fromDate = parseDate(from);
  const toDate = parseDate(to);

  if (fromDate.getTime() > toDate.getTime()) throw new Error("Analytics from must not exceed to");
  const durationDays = differenceInDays(fromDate, toDate) + 1;
  if (durationDays > MAX_PERIOD_DAYS) throw new Error("Analytics period must not exceed 24 months");

  return Object.freeze({
    from,
    to,
    previousFrom: formatDate(addDays(fromDate, -durationDays)),
    granularity: query.granularity ?? automaticGranularity(durationDays),
    timezone,
  });
}

function completion(completed: number, total: number) {
  return Object.freeze({
    completed,
    total,
    percent: total === 0 ? null : round((completed / total) * 100, 1),
  });
}

function comparison(value: number, previousValue: number): ComparisonMetric {
  return Object.freeze({
    value,
    previousValue,
    delta: value - previousValue,
    deltaPercent:
      previousValue === 0 ? null : round(((value - previousValue) / previousValue) * 100, 1),
  });
}

function average(value: number, divisor: number): number | null {
  return divisor === 0 ? null : round(value / divisor, 1);
}

function automaticGranularity(days: number): AnalyticsGranularity {
  if (days <= 31) return "day";
  if (days <= 180) return "week";
  return "month";
}

function localDate(value: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function assertTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
  } catch {
    throw new Error("Analytics timezone must be a valid IANA timezone");
  }
}

function parseDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || formatDate(date) !== value) {
    throw new Error("Analytics dates must use YYYY-MM-DD format");
  }
  return date;
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function differenceInDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function addMonths(value: string, months: number): string {
  const source = parseDate(value);
  const day = source.getUTCDate();
  source.setUTCDate(1);
  source.setUTCMonth(source.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + 1, 0),
  ).getUTCDate();
  source.setUTCDate(Math.min(day, lastDay));
  return formatDate(source);
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function round(value: number, decimals: number): number {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}
