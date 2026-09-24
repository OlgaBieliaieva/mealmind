import { Prisma, type DatabaseClient } from "@mealmind/db";

import type {
  AdminAnalyticsRepository,
  UsersAnalyticsSnapshot,
} from "../domain/admin-analytics-repository.js";
import type {
  AnalyticsGranularity,
  ResolvedAnalyticsPeriod,
  UsersAnalyticsPoint,
} from "../domain/admin-analytics-types.js";

interface SeriesRow {
  readonly period: Date;
  readonly users: bigint;
  readonly families: bigint;
  readonly profiles: bigint;
}

export function createPrismaAdminAnalyticsRepository(
  database: DatabaseClient,
): AdminAnalyticsRepository {
  return Object.freeze({
    async getUsers(period: ResolvedAnalyticsPeriod): Promise<UsersAnalyticsSnapshot> {
      const currentRange = createdAtRange(period.from, addOneDay(period.to), period.timezone);
      const previousRange = createdAtRange(period.previousFrom, period.from, period.timezone);

      const [
        activeUsers,
        deletedUsers,
        activeFamilies,
        archivedFamilies,
        activeProfiles,
        archivedProfiles,
        completedOnboarding,
        completedProfiles,
        activeMemberships,
        activeFamilyMembers,
        currentCreatedUsers,
        previousCreatedUsers,
        currentCreatedFamilies,
        previousCreatedFamilies,
        currentCreatedProfiles,
        previousCreatedProfiles,
        series,
      ] = await Promise.all([
        database.user.count({ where: { deletedAt: null } }),
        database.user.count({ where: { deletedAt: { not: null } } }),
        database.family.count({ where: { archivedAt: null } }),
        database.family.count({ where: { archivedAt: { not: null } } }),
        database.personProfile.count({ where: { archivedAt: null } }),
        database.personProfile.count({ where: { archivedAt: { not: null } } }),
        database.user.count({
          where: { deletedAt: null, onboardingCompletedAt: { not: null } },
        }),
        database.personProfile.count({
          where: { archivedAt: null, profileCompletedAt: { not: null } },
        }),
        database.familyMembership.count({
          where: { status: "ACTIVE", family: { archivedAt: null }, user: { deletedAt: null } },
        }),
        database.familyMember.count({
          where: {
            archivedAt: null,
            family: { archivedAt: null },
            personProfile: { archivedAt: null },
          },
        }),
        database.user.count({ where: { createdAt: currentRange } }),
        database.user.count({ where: { createdAt: previousRange } }),
        database.family.count({ where: { createdAt: currentRange } }),
        database.family.count({ where: { createdAt: previousRange } }),
        database.personProfile.count({ where: { createdAt: currentRange } }),
        database.personProfile.count({ where: { createdAt: previousRange } }),
        usersSeries(database, period),
      ]);

      return Object.freeze({
        activeUsers,
        deletedUsers,
        activeFamilies,
        archivedFamilies,
        activeProfiles,
        archivedProfiles,
        completedOnboarding,
        completedProfiles,
        activeMemberships,
        activeFamilyMembers,
        currentCreatedUsers,
        previousCreatedUsers,
        currentCreatedFamilies,
        previousCreatedFamilies,
        currentCreatedProfiles,
        previousCreatedProfiles,
        series,
      });
    },
  });
}

async function usersSeries(
  database: DatabaseClient,
  period: ResolvedAnalyticsPeriod,
): Promise<readonly UsersAnalyticsPoint[]> {
  const unit = period.granularity;
  const step = seriesStep(period.granularity);
  const rows = await database.$queryRaw<SeriesRow[]>(Prisma.sql`
    WITH parameters AS (
      SELECT
        ${period.from}::date AS from_date,
        ${period.to}::date AS to_date,
        ${period.timezone}::text AS timezone
    ), buckets AS (
      SELECT generate_series(
        date_trunc(${unit}, from_date::timestamp),
        date_trunc(${unit}, to_date::timestamp),
        ${step}
      ) AS bucket
      FROM parameters
    ), events AS (
      SELECT created_at, 'users'::text AS kind FROM users
      UNION ALL
      SELECT created_at, 'families'::text AS kind FROM families
      UNION ALL
      SELECT created_at, 'profiles'::text AS kind FROM person_profiles
    )
    SELECT
      buckets.bucket::date AS period,
      COUNT(events.created_at) FILTER (WHERE events.kind = 'users')::bigint AS users,
      COUNT(events.created_at) FILTER (WHERE events.kind = 'families')::bigint AS families,
      COUNT(events.created_at) FILTER (WHERE events.kind = 'profiles')::bigint AS profiles
    FROM buckets
    CROSS JOIN parameters
    LEFT JOIN events
      ON events.created_at >= buckets.bucket AT TIME ZONE parameters.timezone
      AND events.created_at < (buckets.bucket + ${step}) AT TIME ZONE parameters.timezone
      AND events.created_at >= parameters.from_date::timestamp AT TIME ZONE parameters.timezone
      AND events.created_at < (parameters.to_date + 1)::timestamp AT TIME ZONE parameters.timezone
    GROUP BY buckets.bucket
    ORDER BY buckets.bucket ASC
  `);

  return Object.freeze(
    rows.map((row) =>
      Object.freeze({
        period: row.period.toISOString().slice(0, 10),
        users: Number(row.users),
        families: Number(row.families),
        profiles: Number(row.profiles),
      }),
    ),
  );
}

function seriesStep(granularity: AnalyticsGranularity): Prisma.Sql {
  switch (granularity) {
    case "day":
      return Prisma.sql`INTERVAL '1 day'`;
    case "week":
      return Prisma.sql`INTERVAL '1 week'`;
    case "month":
      return Prisma.sql`INTERVAL '1 month'`;
  }
}

function createdAtRange(from: string, toExclusive: string, timezone: string) {
  return {
    gte: localMidnight(from, timezone),
    lt: localMidnight(toExclusive, timezone),
  };
}

function localMidnight(value: string, timezone: string): Date {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
  });
  const offset = formatter
    .formatToParts(new Date(`${value}T12:00:00.000Z`))
    .find((part) => part.type === "timeZoneName")?.value;
  const isoOffset = offset === "GMT" ? "+00:00" : offset?.replace("GMT", "");
  return new Date(`${value}T00:00:00${isoOffset ?? "+00:00"}`);
}

function addOneDay(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
