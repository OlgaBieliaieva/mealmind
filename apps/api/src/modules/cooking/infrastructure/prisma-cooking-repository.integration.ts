import assert from "node:assert/strict";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

import { createDatabaseClient } from "@mealmind/db";

import { CookingConflictError } from "../application/cooking-errors.js";
import { createPrismaMealPlanRepository } from "../../meal-plan/infrastructure/prisma-meal-plan-repository.js";
import { createPrismaConsumptionRepository } from "../../consumption/infrastructure/prisma-consumption-repository.js";
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
const consumptionRepository = createPrismaConsumptionRepository(database);
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
  const firstWithActualYield = await cooking.updateYield(actor, first.id, {
    expectedRevision: first.revision,
    method: "DIRECT",
    actualWeightG: 330,
  });
  await assert.rejects(
    () =>
      cooking.complete(actor, first.id, {
        expectedRevision: firstWithActualYield.revision,
        resolvePending: false,
        applyPortionAdjustment: true,
      }),
    CookingConflictError,
  );
  const firstCompleted = await cooking.complete(actor, first.id, {
    expectedRevision: firstWithActualYield.revision,
    resolvePending: true,
    applyPortionAdjustment: true,
  });
  assert.equal(firstCompleted.status, "COMPLETED");
  assert.equal(firstCompleted.yield.portionAdjustmentApplied, true);
  assert.equal(firstCompleted.yield.portionScaleFactor, 1.1);
  const firstPortions = await database.cookingSessionMealEntryParticipant.findMany({
    where: { cookingSessionId: first.id },
    orderBy: { mealEntryId: "asc" },
  });
  assert.equal(firstPortions.length, 3);
  assert.ok(
    firstPortions.every(
      (portion) => Math.abs((portion.preparedQuantityInGrams?.toNumber() ?? 0) - 110) < 0.0005,
    ),
  );

  const afterFirst = await database.mealEntry.findMany({
    where: { mealPlanId: plan.id },
    orderBy: { date: "asc" },
    select: { id: true, revision: true, preparedAt: true },
  });
  assert.ok(afterFirst.slice(0, 3).every((entry) => entry.preparedAt instanceof Date));
  assert.ok(afterFirst.slice(3).every((entry) => entry.preparedAt === null));

  const preparedWeek = await mealPlanRepository.readWeek(family.id, {
    weekStart: new Date("2026-09-21T00:00:00.000Z"),
    weekEnd: new Date("2026-09-27T00:00:00.000Z"),
    selectedDates: ["2026-09-21"],
    userId: user.id,
    role: "OWNER",
  });
  const preparedFood = preparedWeek.members[0]?.details.days[0]?.meals[0]?.entries[0];
  assert.equal(preparedFood?.portionGrams, 110);
  assert.equal(preparedFood?.energyPer100g, 45.5);
  assert.equal(preparedFood?.portionEnergyKcal, 50);

  const firstParticipant = await database.mealEntryParticipant.findUniqueOrThrow({
    where: {
      mealEntryId_familyMemberId: {
        mealEntryId: afterFirst[0]!.id,
        familyMemberId: member.id,
      },
    },
    select: { id: true },
  });
  const diaryBeforeConfirmation = await consumptionRepository.readDay({
    familyId: family.id,
    familyName: family.name,
    timeZone: family.timeZone,
    role: "OWNER",
    userId: user.id,
    date: "2026-09-21",
  });
  const diaryItem = diaryBeforeConfirmation.members[0]?.items[0];
  assert.equal(diaryItem?.plannedQuantityGrams, 110);
  assert.equal(diaryItem?.plannedEnergyKcal, 50);
  assert.equal(diaryItem?.energyPer100g, 45.45454545454545);
  assert.equal(diaryItem?.cookingSessionId, first.id);

  await consumptionRepository.confirmPlanned({
    familyId: family.id,
    role: "OWNER",
    userId: user.id,
    participantId: firstParticipant.id,
  });
  const consumptionFact = await database.consumptionEntry.findUniqueOrThrow({
    where: { sourceMealEntryParticipantId: firstParticipant.id },
    include: { nutrients: true },
  });
  assert.equal(consumptionFact.plannedQuantityInGrams?.toNumber(), 110);
  assert.equal(consumptionFact.quantityInGrams.toNumber(), 110);
  assert.equal(consumptionFact.nutrients[0]?.calculationMethod, "COOKING_SESSION_TOTAL");
  assert.equal(consumptionFact.nutrients[0]?.value.toNumber(), 50);
  await assert.rejects(
    () =>
      mealPlanRepository.setEntryPrepared({
        familyId: family.id,
        userId: user.id,
        role: "OWNER",
        entryId: afterFirst[0]!.id,
        expectedRevision: afterFirst[0]!.revision,
        prepared: false,
      }),
    /Confirmed consumption must be voided/,
  );

  await mealPlanRepository.updateParticipant({
    familyId: family.id,
    userId: user.id,
    role: "OWNER",
    entryId: afterFirst[2]!.id,
    memberId: member.id,
    expectedRevision: afterFirst[2]!.revision,
    quantityGrams: 120,
  });
  const editedPreparedPortion = await database.mealEntryParticipant.findUniqueOrThrow({
    where: {
      mealEntryId_familyMemberId: {
        mealEntryId: afterFirst[2]!.id,
        familyMemberId: member.id,
      },
    },
    select: {
      quantityInGrams: true,
      cookingSnapshots: {
        where: { cookingSessionId: first.id },
        select: { preparedQuantityInGrams: true },
      },
    },
  });
  assert.equal(editedPreparedPortion.quantityInGrams.toNumber(), 100);
  assert.equal(editedPreparedPortion.cookingSnapshots[0]?.preparedQuantityInGrams?.toNumber(), 120);

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
    applyPortionAdjustment: false,
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

  const entryToUnprepare = await database.mealEntry.findUniqueOrThrow({
    where: { id: afterFirst[1]!.id },
    select: { revision: true },
  });
  const unprepared = await mealPlanRepository.setEntryPrepared({
    familyId: family.id,
    userId: user.id,
    role: "OWNER",
    entryId: afterFirst[1]!.id,
    expectedRevision: entryToUnprepare.revision,
    prepared: false,
  });
  assert.equal(unprepared.preparedAt, null);
  assert.ok(
    (
      await database.cookingSessionMealEntry.findUniqueOrThrow({
        where: {
          cookingSessionId_mealEntryId: {
            cookingSessionId: first.id,
            mealEntryId: afterFirst[1]!.id,
          },
        },
      })
    ).releasedAt instanceof Date,
  );

  console.info("Cooking repository PostgreSQL integration test passed.");
} finally {
  // Production policy intentionally makes terminal cooking history immutable.
  // Trigger suspension is limited to cleanup in the isolated mealmind_test database.
  await database.$transaction(async (transaction) => {
    for (const table of [
      "meal_consumption_resolutions",
      "consumption_entry_nutrients",
      "consumption_entries",
    ]) {
      await transaction.$executeRawUnsafe(`ALTER TABLE "${table}" DISABLE TRIGGER USER`);
    }
    await transaction.mealConsumptionResolution.deleteMany({ where: { familyId: actor.familyId } });
    await transaction.consumptionEntryNutrient.deleteMany({
      where: { consumptionEntry: { familyId: actor.familyId } },
    });
    await transaction.consumptionEntry.deleteMany({ where: { familyId: actor.familyId } });
    for (const table of [
      "meal_consumption_resolutions",
      "consumption_entry_nutrients",
      "consumption_entries",
    ]) {
      await transaction.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE TRIGGER USER`);
    }
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
