import assert from "node:assert/strict";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

import { createDatabaseClient } from "@mealmind/db";

import { CookingConflictError } from "../application/cooking-errors.js";
import { createPrismaMealPlanRepository } from "../../meal-plan/infrastructure/prisma-meal-plan-repository.js";
import { createPrismaCookingRepository } from "./prisma-cooking-repository.js";

try {
  loadEnvFile(resolve(process.cwd(), "../../.env"));
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
}

const database = createDatabaseClient({
  connectionString: requireSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL),
  log: ["error"],
});
const cooking = createPrismaCookingRepository(database);
const mealPlanRepository = createPrismaMealPlanRepository(database);
const marker = crypto.randomUUID();
const actor = {
  userId: crypto.randomUUID(),
  familyId: crypto.randomUUID(),
  role: "OWNER" as const,
};
let productId: string | undefined;
let recipeId: string | undefined;

try {
  const [category, gram, mealType, nutrient] = await Promise.all([
    database.productCategory.findFirstOrThrow({ where: { isAssignable: true, isActive: true } }),
    database.measurementUnit.findFirstOrThrow({ where: { code: "g", isActive: true } }),
    database.mealType.findFirstOrThrow({ where: { isActive: true } }),
    database.nutrient.findFirstOrThrow({ where: { code: "energy_kcal", isActive: true } }),
  ]);
  const user = await database.user.create({
    data: {
      id: actor.userId,
      externalSubject: crypto.randomUUID(),
      email: `cooking-${marker}@example.test`,
    },
  });
  const profile = await database.personProfile.create({
    data: { userId: user.id, firstName: "Кухар" },
  });
  const family = await database.family.create({
    data: { id: actor.familyId, name: `Cooking ${marker}`, createdByUserId: user.id },
  });
  await database.familyMembership.create({
    data: { familyId: family.id, userId: user.id, role: "OWNER", status: "ACTIVE" },
  });
  const member = await database.familyMember.create({
    data: { familyId: family.id, personProfileId: profile.id },
  });
  await database.personMealTypePreference.create({
    data: { personProfileId: profile.id, mealTypeId: mealType.id },
  });
  const product = await database.product.create({
    data: {
      type: "GENERIC",
      nameEn: `Cooking ingredient ${marker}`,
      nameUa: `Інгредієнт ${marker}`,
      categoryId: category.id,
      defaultMeasurementUnitId: gram.id,
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
      nutrients: {
        create: { nutrientId: nutrient.id, valuePer100g: 50, valueType: "ANALYTICAL" },
      },
    },
  });
  productId = product.id;
  const recipe = await database.recipe.create({
    data: {
      title: `Рецепт ${marker}`,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      createdByUserId: user.id,
      baseServings: 2,
      yieldWeightG: null,
      ingredients: {
        create: {
          productId: product.id,
          quantity: 200,
          measurementUnitId: gram.id,
          gramWeight: 200,
          conversionMethod: "DIRECT_MASS",
          position: 1,
        },
      },
      steps: { create: { position: 1, instruction: "Приготувати страву" } },
    },
  });
  recipeId = recipe.id;
  const plan = await database.mealPlan.create({
    data: {
      familyId: family.id,
      weekStart: new Date("2026-09-21T00:00:00.000Z"),
      weekStartsOn: "MONDAY",
      entries: {
        create: [0, 1, 2, 4, 5, 6].map((offset) => ({
          date: new Date(`2026-09-${String(21 + offset).padStart(2, "0")}T00:00:00.000Z`),
          mealTypeId: mealType.id,
          recipeId: recipe.id,
          position: 1,
          participants: {
            create: {
              familyMemberId: member.id,
              quantity: 100,
              measurementUnitId: gram.id,
              quantityInGrams: 100,
            },
          },
        })),
      },
    },
    include: { entries: { orderBy: { date: "asc" } } },
  });

  const firstStart = {
    requestId: crypto.randomUUID(),
    mealEntries: plan.entries.slice(0, 3).map((entry) => ({ id: entry.id, expectedRevision: 0 })),
  };
  const first = await cooking.start(actor, firstStart);
  assert.equal(first.planEntries.length, 3);
  assert.equal(first.yield.plannedWeightG, 300);
  assert.equal(first.ingredients[0]?.planned?.gramWeight, 300);
  assert.equal((await cooking.start(actor, firstStart)).id, first.id);
  await assert.rejects(
    () =>
      cooking.complete(actor, first.id, {
        expectedRevision: first.revision,
        resolvePending: false,
      }),
    CookingConflictError,
  );
  const firstCompleted = await cooking.complete(actor, first.id, {
    expectedRevision: first.revision,
    resolvePending: true,
  });
  assert.equal(firstCompleted.status, "COMPLETED");

  const afterFirst = await database.mealEntry.findMany({
    where: { mealPlanId: plan.id },
    orderBy: { date: "asc" },
    select: { id: true, revision: true, preparedAt: true },
  });
  assert.ok(afterFirst.slice(0, 3).every((entry) => entry.preparedAt instanceof Date));
  assert.ok(afterFirst.slice(3).every((entry) => entry.preparedAt === null));

  let second = await cooking.start(actor, {
    requestId: crypto.randomUUID(),
    mealEntries: afterFirst
      .slice(3)
      .map((entry) => ({ id: entry.id, expectedRevision: entry.revision })),
  });
  assert.notEqual(second.id, first.id);
  assert.equal(second.yield.plannedWeightG, 300);

  const entryToResize = afterFirst[3]!;
  await mealPlanRepository.updateParticipant({
    familyId: family.id,
    userId: user.id,
    role: "OWNER",
    entryId: entryToResize.id,
    memberId: member.id,
    expectedRevision: entryToResize.revision,
    quantityGrams: 150,
  });
  second = await cooking.find(actor, second.id);
  assert.equal(second.revision, 1);
  assert.equal(second.yield.plannedWeightG, 350);
  assert.equal(second.ingredients[0]?.planned?.gramWeight, 350);

  const secondCompleted = await cooking.complete(actor, second.id, {
    expectedRevision: second.revision,
    resolvePending: true,
  });
  assert.equal(secondCompleted.status, "COMPLETED");
  assert.equal(
    await database.cookingSession.count({ where: { familyId: family.id, status: "COMPLETED" } }),
    2,
  );
  assert.equal(
    await database.mealEntry.count({
      where: { mealPlanId: plan.id, preparedAt: { not: null } },
    }),
    6,
  );

  console.info("Cooking repository PostgreSQL integration test passed.");
} finally {
  // Production policy intentionally makes terminal cooking history immutable.
  // Trigger suspension is limited to cleanup in the isolated mealmind_test database.
  await database.$transaction(async (transaction) => {
    for (const table of [
      "cooking_session_ingredients",
      "cooking_session_steps",
      "cooking_session_nutrients",
      "cooking_session_meal_entries",
      "cooking_sessions",
    ]) {
      await transaction.$executeRawUnsafe(`ALTER TABLE "${table}" DISABLE TRIGGER USER`);
    }
    await transaction.cookingSession.deleteMany({ where: { familyId: actor.familyId } });
    for (const table of [
      "cooking_session_ingredients",
      "cooking_session_steps",
      "cooking_session_nutrients",
      "cooking_session_meal_entries",
      "cooking_sessions",
    ]) {
      await transaction.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE TRIGGER USER`);
    }
  });
  await database.mealPlan.deleteMany({ where: { familyId: actor.familyId } });
  await database.family.deleteMany({ where: { id: actor.familyId } });
  if (recipeId) await database.recipe.deleteMany({ where: { id: recipeId } });
  if (productId) await database.product.deleteMany({ where: { id: productId } });
  await database.personProfile.deleteMany({ where: { userId: actor.userId } });
  await database.user.deleteMany({ where: { id: actor.userId } });
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
  ) {
    throw new Error("Cooking repository test may use only local mealmind_test on port 54322");
  }
  return url.toString();
}
