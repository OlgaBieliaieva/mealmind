import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";

import { createDatabaseClient } from "@mealmind/db";

import { createPrismaAdminAnalyticsRepository } from "./prisma-admin-analytics-repository.js";

try {
  loadEnvFile(resolve(process.cwd(), "../../.env"));
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
}

const connectionString = requireSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL);
const database = createDatabaseClient({ connectionString, log: ["error"] });
const repository = createPrismaAdminAnalyticsRepository(database);
const userIds: string[] = [];
const profileIds: string[] = [];
let familyId: string | undefined;

try {
  const currentUser = await database.user.create({
    data: {
      externalSubject: randomUUID(),
      email: `analytics-${randomUUID()}@example.test`,
      onboardingCompletedAt: new Date("2099-09-02T10:00:00Z"),
      createdAt: new Date("2099-09-02T10:00:00Z"),
    },
  });
  userIds.push(currentUser.id);
  const previousUser = await database.user.create({
    data: {
      externalSubject: randomUUID(),
      email: `analytics-${randomUUID()}@example.test`,
      deletedAt: new Date("2099-09-03T10:00:00Z"),
      createdAt: new Date("2099-08-27T10:00:00Z"),
    },
  });
  userIds.push(previousUser.id);

  const currentProfile = await database.personProfile.create({
    data: {
      userId: currentUser.id,
      firstName: "Analytics",
      profileCompletedAt: new Date("2099-09-02T10:00:00Z"),
      createdAt: new Date("2099-09-02T10:00:00Z"),
    },
  });
  profileIds.push(currentProfile.id);

  const family = await database.family.create({
    data: {
      name: "Analytics integration family",
      createdByUserId: currentUser.id,
      createdAt: new Date("2099-09-03T10:00:00Z"),
      memberships: { create: { userId: currentUser.id, status: "ACTIVE", role: "OWNER" } },
      members: { create: { personProfileId: currentProfile.id } },
    },
  });
  familyId = family.id;

  const result = await repository.getUsers({
    from: "2099-09-01",
    to: "2099-09-07",
    previousFrom: "2099-08-25",
    granularity: "day",
    timezone: "Europe/Kyiv",
  });

  assert.equal(result.currentCreatedUsers, 1);
  assert.equal(result.previousCreatedUsers, 1);
  assert.equal(result.currentCreatedFamilies, 1);
  assert.equal(result.currentCreatedProfiles, 1);
  assert.equal(result.series.length, 7);
  assert.equal(result.series.find((point) => point.period === "2099-09-02")?.users, 1);
  assert.equal(result.activeMemberships >= 1, true);
  assert.equal(result.activeFamilyMembers >= 1, true);

  const references = await repository.getReferences();
  assert.equal(references.resources.length, 10);
  assert.equal(references.resources.find((item) => item.resource === "allergens")?.total, 14);
  assert.equal(references.resources.find((item) => item.resource === "nutrients")?.total, 36);

  console.info("Admin analytics repository PostgreSQL integration test passed.");
} finally {
  if (familyId !== undefined) await database.family.deleteMany({ where: { id: familyId } });
  if (profileIds.length > 0) {
    await database.personProfile.deleteMany({ where: { id: { in: profileIds } } });
  }
  if (userIds.length > 0) await database.user.deleteMany({ where: { id: { in: userIds } } });
  await database.$disconnect();
}

function requireSafeTestDatabaseUrl(rawValue: string | undefined): string {
  if (rawValue === undefined) throw new Error("TEST_DATABASE_URL is required");
  const url = new URL(rawValue);
  const allowedHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  if (
    !allowedHosts.has(url.hostname) ||
    url.port !== "54322" ||
    databaseName !== "mealmind_test" ||
    url.searchParams.has("schema")
  ) {
    throw new Error("Admin analytics test may use only local mealmind_test on port 54322");
  }
  return url.toString();
}
