import assert from "node:assert/strict";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { createDatabaseClient } from "@mealmind/db";
import { FamilyMemberNotFoundError } from "../application/family-errors.js";
import { createPrismaFamilyRepository } from "./prisma-family-repository.js";

try {
  loadEnvFile(resolve(process.cwd(), "../../.env"));
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
}
const connectionString = requireSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL);
const database = createDatabaseClient({ connectionString, log: ["error"] });
const repository = createPrismaFamilyRepository(database);
const marker = crypto.randomUUID();
const users = await Promise.all(
  ["owner", "other"].map((name) =>
    database.user.create({
      data: { externalSubject: crypto.randomUUID(), email: `${name}-${marker}@example.test` },
    }),
  ),
);

try {
  const first = await repository.completeOnboarding(users[0]!.id, {
    firstName: "Олена",
    activityLevel: "MODERATE",
  });
  assert.equal(first.onboardingCompleted, true);
  assert.equal(first.family?.name, "Моя сім'я");
  assert.equal(first.family?.timeZone, "Europe/Kyiv");
  assert.equal(first.family?.weekStartsOn, "MONDAY");
  assert.equal(first.family?.role, "OWNER");
  const repeated = await repository.completeOnboarding(users[0]!.id, { firstName: "Інше ім’я" });
  assert.equal(repeated.family?.id, first.family?.id);
  assert.equal(
    await database.familyMembership.count({ where: { userId: users[0]!.id, status: "ACTIVE" } }),
    1,
  );
  assert.equal(await database.personProfile.count({ where: { userId: users[0]!.id } }), 1);

  const dependent = await repository.createDependent(users[0]!.id, { firstName: "Дитина" });
  assert.equal(dependent.isAccountOwner, false);
  const updated = await repository.updateDependent(users[0]!.id, dependent.id, {
    firstName: "Марія",
  });
  assert.equal(updated.firstName, "Марія");
  await repository.completeOnboarding(users[1]!.id, { firstName: "Інший" });
  await assert.rejects(
    repository.updateDependent(users[1]!.id, dependent.id, { firstName: "Порушення" }),
    FamilyMemberNotFoundError,
  );
  await repository.archiveDependent(users[0]!.id, dependent.id);
  assert.equal(
    (await repository.listMembers(users[0]!.id)).some((member) => member.id === dependent.id),
    false,
  );
  console.info("Family repository PostgreSQL integration test passed.");
} finally {
  const profiles = await database.personProfile.findMany({
    where: {
      OR: [
        { userId: { in: users.map((user) => user.id) } },
        {
          familyMembers: {
            some: { family: { createdByUserId: { in: users.map((user) => user.id) } } },
          },
        },
      ],
    },
    select: { id: true },
  });
  await database.family.deleteMany({
    where: { createdByUserId: { in: users.map((user) => user.id) } },
  });
  await database.personProfile.deleteMany({
    where: { id: { in: profiles.map((profile) => profile.id) } },
  });
  await database.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
  await database.$disconnect();
}

function requireSafeTestDatabaseUrl(rawValue: string | undefined): string {
  if (rawValue === undefined) throw new Error("TEST_DATABASE_URL is required");
  const url = new URL(rawValue);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  if (
    !new Set(["127.0.0.1", "localhost", "::1"]).has(url.hostname) ||
    url.port !== "54322" ||
    databaseName !== "mealmind_test" ||
    url.searchParams.has("schema")
  )
    throw new Error("Family repository test may use only local mealmind_test on port 54322");
  return url.toString();
}
