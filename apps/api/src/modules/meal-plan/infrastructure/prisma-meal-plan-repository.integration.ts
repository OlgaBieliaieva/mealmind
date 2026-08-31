import assert from "node:assert/strict";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

import { createDatabaseClient } from "@mealmind/db";

import {
  MealPlanAccessDeniedError,
  MealPlanConflictError,
} from "../application/meal-plan-errors.js";
import { createPrismaMealPlanRepository } from "./prisma-meal-plan-repository.js";

try {
  loadEnvFile(resolve(process.cwd(), "../../.env"));
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
}

const database = createDatabaseClient({
  connectionString: requireSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL),
  log: ["error"],
});
const repository = createPrismaMealPlanRepository(database);
const marker = crypto.randomUUID();
const owner = await database.user.create({
  data: { externalSubject: crypto.randomUUID(), email: `meal-plan-${marker}@example.test` },
});
const ownerProfile = await database.personProfile.create({
  data: { userId: owner.id, firstName: "Олена" },
});
const dependentProfile = await database.personProfile.create({ data: { firstName: "Дитина" } });
const category = await database.productCategory.findFirstOrThrow({ where: { isActive: true } });
const gramUnit = await database.measurementUnit.findFirstOrThrow({
  where: { dimension: "MASS", isBaseUnit: true, isActive: true },
});
const mealType = await database.mealType.findFirstOrThrow({ where: { isActive: true } });
const family = await database.family.create({
  data: { name: `Meal plan ${marker}`, createdByUserId: owner.id },
});
await database.familyMembership.create({
  data: { familyId: family.id, userId: owner.id, role: "OWNER", status: "ACTIVE" },
});
const [ownerMember, dependentMember] = await Promise.all([
  database.familyMember.create({ data: { familyId: family.id, personProfileId: ownerProfile.id } }),
  database.familyMember.create({
    data: { familyId: family.id, personProfileId: dependentProfile.id },
  }),
]);
await database.personMealTypePreference.createMany({
  data: [
    { personProfileId: ownerProfile.id, mealTypeId: mealType.id },
    { personProfileId: dependentProfile.id, mealTypeId: mealType.id },
  ],
});
const product = await database.product.create({
  data: {
    type: "GENERIC",
    nameEn: `Integration product ${marker}`,
    nameUa: `Інтеграційний продукт ${marker}`,
    categoryId: category.id,
    defaultMeasurementUnitId: gramUnit.id,
    status: "ACTIVE",
    verificationStatus: "UNVERIFIED",
  },
});

try {
  const command = {
    familyId: family.id,
    userId: owner.id,
    role: "OWNER" as const,
    weekStart: new Date("2026-08-24T00:00:00.000Z"),
    weekEnd: new Date("2026-08-30T00:00:00.000Z"),
    requestId: crypto.randomUUID(),
    fingerprint: "a".repeat(64),
    conflictPolicy: "REJECT" as const,
    entries: [
      {
        date: "2026-08-25",
        mealTypeId: mealType.id,
        kind: "product" as const,
        foodId: product.id,
        participants: [
          { memberId: ownerMember.id, quantityGrams: 120 },
          { memberId: dependentMember.id, quantityGrams: 80 },
        ],
      },
    ],
  };
  const created = await repository.createEntries(command);
  assert.equal(created.entries.length, 1);
  assert.equal(created.replayed, false);
  const replayed = await repository.createEntries(command);
  assert.equal(replayed.replayed, true);
  assert.equal(await database.mealEntry.count({ where: { mealPlan: { familyId: family.id } } }), 1);

  await assert.rejects(
    () =>
      repository.createEntries({
        ...command,
        requestId: crypto.randomUUID(),
        fingerprint: "b".repeat(64),
        role: "MEMBER",
        entries: [
          {
            ...command.entries[0]!,
            participants: [{ memberId: dependentMember.id, quantityGrams: 80 }],
          },
        ],
      }),
    MealPlanAccessDeniedError,
  );

  const entryId = created.entries[0]!.id;
  const updated = await repository.updateParticipant({
    familyId: family.id,
    userId: owner.id,
    role: "OWNER",
    entryId,
    memberId: ownerMember.id,
    expectedRevision: 0,
    quantityGrams: 140,
  });
  assert.equal(updated.revision, 1);
  await assert.rejects(
    () =>
      repository.updateParticipant({
        familyId: family.id,
        userId: owner.id,
        role: "OWNER",
        entryId,
        memberId: ownerMember.id,
        expectedRevision: 0,
        quantityGrams: 150,
      }),
    MealPlanConflictError,
  );

  const prepared = await repository.setEntryPrepared({
    familyId: family.id,
    userId: owner.id,
    role: "OWNER",
    entryId,
    expectedRevision: updated.revision,
    prepared: true,
  });

  assert.equal(prepared.revision, 2);
  assert.ok(prepared.preparedAt);

  const preparedRow = await database.mealEntry.findUniqueOrThrow({
    where: { id: entryId },
  });

  assert.ok(preparedRow.preparedAt instanceof Date);
  assert.equal(prepared.preparedAt, preparedRow.preparedAt.toISOString());
  assert.equal(preparedRow.preparedByUserId, owner.id);

  await repository.deleteParticipant({
    familyId: family.id,
    userId: owner.id,
    role: "OWNER",
    entryId,
    memberId: dependentMember.id,
    expectedRevision: prepared.revision,
  });
  await repository.deleteEntry({
    familyId: family.id,
    userId: owner.id,
    role: "OWNER",
    entryId,
    expectedRevision: prepared.revision + 1,
  });
  assert.equal(await database.mealEntry.count({ where: { id: entryId } }), 0);
  console.info("Meal plan PostgreSQL integration test passed.");
} finally {
  await database.family.delete({ where: { id: family.id } });
  await database.product.delete({ where: { id: product.id } });
  await database.personProfile.deleteMany({
    where: { id: { in: [ownerProfile.id, dependentProfile.id] } },
  });
  await database.user.delete({ where: { id: owner.id } });
  await database.$disconnect();
}

function requireSafeTestDatabaseUrl(rawValue: string | undefined): string {
  if (!rawValue) throw new Error("TEST_DATABASE_URL is required");
  const url = new URL(rawValue);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  if (
    !new Set(["127.0.0.1", "localhost", "::1"]).has(url.hostname) ||
    url.port !== "54322" ||
    databaseName !== "mealmind_test" ||
    url.searchParams.has("schema")
  )
    throw new Error("Meal plan repository test may use only local mealmind_test on port 54322");
  return url.toString();
}
