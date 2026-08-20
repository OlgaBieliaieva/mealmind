import assert from "node:assert/strict";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

import { createDatabaseClient } from "@mealmind/db";

import {
  ActiveWeightGoalNotFoundError,
  ActivityPeriodConflictError,
  FamilyMemberNotFoundError,
  FamilyOwnerRequiredError,
  InvalidAllergiesError,
  InvalidCuisinePreferencesError,
  InvalidDietaryRestrictionsError,
  InvalidMealTypesError,
  InvalidNutrientTargetsError,
  WeightGoalConflictError,
} from "../application/family-errors.js";
import { createPrismaAccountInvitationRepository } from "./prisma-account-invitation-repository.js";
import { createPrismaFamilyRepository } from "./prisma-family-repository.js";

try {
  loadEnvFile(resolve(process.cwd(), "../../.env"));
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
    throw error;
  }
}

const connectionString = requireSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL);

const database = createDatabaseClient({
  connectionString,
  log: ["error"],
});

const repository = createPrismaFamilyRepository(database);

const invitationRepository = createPrismaAccountInvitationRepository(database);

const marker = crypto.randomUUID();

const users = await Promise.all(
  ["owner", "other"].map((name) =>
    database.user.create({
      data: {
        externalSubject: crypto.randomUUID(),
        email: `${name}-${marker}@example.test`,
      },
    }),
  ),
);

let testProductId: string | null = null;
let testProductCategoryId: string | null = null;
let testMeasurementUnitId: string | null = null;
let testCuisineId: string | null = null;
let testDietaryTagId: string | null = null;
let testAllergenId: string | null = null;
const createdTestNutrientIds: string[] = [];
const createdTestMealTypeIds: string[] = [];
const createdDefaultMealTypeIds: string[] = [];

const defaultMealTypeFixtures = [
  {
    code: "breakfast",
    nameUa: "Сніданок",
    nameEn: "Breakfast",
    kind: "MAIN_MEAL",
    sortOrder: 10,
  },
  {
    code: "lunch",
    nameUa: "Обід",
    nameEn: "Lunch",
    kind: "MAIN_MEAL",
    sortOrder: 30,
  },
  {
    code: "dinner",
    nameUa: "Вечеря",
    nameEn: "Dinner",
    kind: "MAIN_MEAL",
    sortOrder: 50,
  },
] as const;

const defaultMealTypeByCode = new Map<string, { id: string; code: string }>();

try {
  /*
   * completeOnboarding() bootstraps breakfast + lunch + dinner.
   * Ensure those canonical reference rows exist before the first onboarding
   * call. Reuse seeded rows when available and clean up only rows created
   * specifically by this test.
   */
  for (const fixture of defaultMealTypeFixtures) {
    const existing = await database.mealType.findUnique({
      where: {
        code: fixture.code,
      },
      select: {
        id: true,
        code: true,
        isActive: true,
      },
    });

    if (existing !== null) {
      assert.equal(existing.isActive, true);
      defaultMealTypeByCode.set(existing.code, existing);
      continue;
    }

    const created = await database.mealType.create({
      data: {
        ...fixture,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
      },
    });

    createdDefaultMealTypeIds.push(created.id);
    defaultMealTypeByCode.set(created.code, created);
  }

  const defaultMealTypeIds = defaultMealTypeFixtures.map((fixture) => {
    const mealType = defaultMealTypeByCode.get(fixture.code);

    assert.notEqual(mealType, undefined);

    return mealType!.id;
  });

  const first = await repository.completeOnboarding(users[0]!.id, {
    firstName: "Олена",
    activityLevel: "MODERATE",
  });

  assert.equal(first.onboardingCompleted, true);

  assert.equal(first.family?.name, "Моя сім'я");

  assert.equal(first.family?.timeZone, "Europe/Kyiv");

  assert.equal(first.family?.weekStartsOn, "MONDAY");

  assert.equal(first.family?.role, "OWNER");

  const repeated = await repository.completeOnboarding(users[0]!.id, {
    firstName: "Інше ім’я",
  });

  assert.equal(repeated.family?.id, first.family?.id);

  assert.equal(
    await database.familyMembership.count({
      where: {
        userId: users[0]!.id,
        status: "ACTIVE",
      },
    }),
    1,
  );

  assert.equal(
    await database.personProfile.count({
      where: {
        userId: users[0]!.id,
      },
    }),
    1,
  );

  const ownerProfile = await database.personProfile.findUniqueOrThrow({
    where: {
      userId: users[0]!.id,
    },

    select: {
      id: true,
    },
  });

  const ownerProfileAfterOnboarding = await repository.readOwnProfile(users[0]!.id);

  assert.deepEqual(
    ownerProfileAfterOnboarding.mealTypes.map((mealType) => mealType.id),
    defaultMealTypeIds,
  );

  assert.deepEqual(
    ownerProfileAfterOnboarding.mealTypes.map((mealType) => mealType.code),
    ["breakfast", "lunch", "dinner"],
  );

  assert.equal(
    await database.personMealTypePreference.count({
      where: {
        personProfileId: ownerProfile.id,
      },
    }),
    3,
  );

  const nutrientFixtures = [
    { code: "energy_kcal", nameUa: "Енергія", nameEn: "Energy", group: "ENERGY", unit: "KCAL" },
    { code: "protein", nameUa: "Білок", nameEn: "Protein", group: "MACRONUTRIENT", unit: "G" },
    {
      code: "carbohydrate",
      nameUa: "Вуглеводи",
      nameEn: "Carbohydrate",
      group: "MACRONUTRIENT",
      unit: "G",
    },
    { code: "total_fat", nameUa: "Жири", nameEn: "Total fat", group: "MACRONUTRIENT", unit: "G" },
    {
      code: "saturated_fat",
      nameUa: "Насичені жири",
      nameEn: "Saturated fat",
      group: "FATTY_ACID",
      unit: "G",
    },
    { code: "trans_fat", nameUa: "Трансжири", nameEn: "Trans fat", group: "FATTY_ACID", unit: "G" },
    {
      code: "dietary_fiber",
      nameUa: "Клітковина",
      nameEn: "Dietary fiber",
      group: "OTHER",
      unit: "G",
    },
    { code: "sodium", nameUa: "Натрій", nameEn: "Sodium", group: "MINERAL", unit: "MG" },
    { code: "potassium", nameUa: "Калій", nameEn: "Potassium", group: "MINERAL", unit: "MG" },
    { code: "calcium", nameUa: "Кальцій", nameEn: "Calcium", group: "MINERAL", unit: "MG" },
    { code: "iron", nameUa: "Залізо", nameEn: "Iron", group: "MINERAL", unit: "MG" },
    { code: "magnesium", nameUa: "Магній", nameEn: "Magnesium", group: "MINERAL", unit: "MG" },
    {
      code: "omega_3_ala",
      nameUa: "Омега-3 ALA",
      nameEn: "Omega-3 ALA",
      group: "FATTY_ACID",
      unit: "G",
    },
  ] as const;

  const nutrientByCode = new Map<string, { id: string; code: string }>();

  for (const [index, fixture] of nutrientFixtures.entries()) {
    const existing = await database.nutrient.findUnique({
      where: { code: fixture.code },
      select: { id: true, code: true, isActive: true, isTargetable: true },
    });

    if (existing !== null) {
      assert.equal(existing.isActive, true);
      assert.equal(existing.isTargetable, true);
      nutrientByCode.set(existing.code, existing);
      continue;
    }

    const created = await database.nutrient.create({
      data: {
        code: fixture.code,
        nameUa: fixture.nameUa,
        nameEn: fixture.nameEn,
        group: fixture.group,
        unit: fixture.unit,
        displayLevel: "EXTENDED",
        isTargetable: true,
        sortOrder: 31_000 + index,
        isActive: true,
      },
      select: { id: true, code: true },
    });

    createdTestNutrientIds.push(created.id);
    nutrientByCode.set(created.code, created);
  }

  const eligibleUser = await database.user.create({
    data: {
      externalSubject: crypto.randomUUID(),
      email: `eligible-${marker}@example.test`,
    },
  });
  users.push(eligibleUser);

  await repository.completeOnboarding(eligibleUser.id, {
    firstName: "Нутрієнти",
    birthDate: "1990-06-15",
    biologicalSex: "FEMALE",
    heightCm: 168,
    weightKg: 61,
    activityLevel: "MODERATE",
  });

  const eligibleProfile = await repository.readOwnProfile(eligibleUser.id);
  assert.notEqual(eligibleProfile.nutritionTargets.current, null);
  assert.equal(eligibleProfile.nutritionTargets.current?.source, "CALCULATED");
  assert.equal(
    eligibleProfile.nutritionTargets.current?.calculationPolicyVersion,
    "mealmind-onboarding-nutrition-v1",
  );
  assert.notEqual(eligibleProfile.nutritionTargets.current?.restingEnergyKcal, null);
  assert.notEqual(eligibleProfile.nutritionTargets.current?.maintenanceEnergyKcal, null);
  assert.equal(eligibleProfile.nutritionTargets.current?.targets.length, 13);

  const automaticByCode = new Map(
    eligibleProfile.nutritionTargets.current!.targets.map((target) => [
      target.nutrient.code,
      target,
    ]),
  );
  assert.equal(automaticByCode.get("energy_kcal")?.source, "CALCULATED");
  assert.equal(automaticByCode.get("sodium")?.maximumValue, "2300");
  assert.equal(automaticByCode.get("potassium")?.targetValue, "2600");
  assert.equal(automaticByCode.get("calcium")?.targetValue, "1000");
  assert.equal(automaticByCode.get("iron")?.targetValue, "18");
  assert.equal(automaticByCode.get("magnesium")?.targetValue, "320");
  assert.equal(automaticByCode.get("omega_3_ala")?.targetValue, "1.1");

  const age18User = await database.user.create({
    data: {
      externalSubject: crypto.randomUUID(),
      email: `age18-${marker}@example.test`,
    },
  });
  users.push(age18User);

  const today = new Date();
  const birthYear = today.getUTCFullYear() - 18;
  const age18BirthDate = `${birthYear}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;

  await repository.completeOnboarding(age18User.id, {
    firstName: "Вісімнадцять",
    birthDate: age18BirthDate,
    biologicalSex: "MALE",
    heightCm: 180,
    weightKg: 75,
    activityLevel: "LIGHT",
  });

  const age18Profile = await repository.readOwnProfile(age18User.id);
  const age18Targets = new Map(
    age18Profile.nutritionTargets.current!.targets.map((target) => [target.nutrient.code, target]),
  );
  assert.equal(age18Targets.get("potassium")?.targetValue, "3000");
  assert.equal(age18Targets.get("calcium")?.targetValue, "1300");
  assert.equal(age18Targets.get("iron")?.targetValue, "11");
  assert.equal(age18Targets.get("magnesium")?.targetValue, "410");
  assert.equal(age18Targets.get("omega_3_ala")?.targetValue, "1.6");

  /*
   * OwnProfile read-model fixtures
   */

  const cuisine = await database.cuisine.create({
    data: {
      code: `test-cuisine-${marker}`,
      nameUa: "Тестова кухня",
      nameEn: "Test cuisine",
      scope: "NATIONAL",
      isPreferenceSelectable: true,
      isActive: true,
      sortOrder: 30_000,
    },
  });

  testCuisineId = cuisine.id;

  const dietaryTag = await database.dietaryTag.create({
    data: {
      code: `test-diet-${marker}`,
      nameUa: "Тестове обмеження",
      nameEn: "Test restriction",
      kind: "DIET_PATTERN",
      isRestrictionSelectable: true,
      isActive: true,
      sortOrder: 30_000,
    },
  });

  testDietaryTagId = dietaryTag.id;

  const allergen = await database.allergen.create({
    data: {
      code: `test-allergen-${marker}`,
      nameUa: "Тестовий алерген",
      nameEn: "Test allergen",
      isActive: true,
    },
  });

  testAllergenId = allergen.id;

  const measurementUnit = await database.measurementUnit.create({
    data: {
      code: `tu-${marker.slice(0, 20)}`,
      symbol: `t${marker.slice(0, 6)}`,
      nameUa: "Тестова одиниця",
      nameEn: "Test unit",
      dimension: "MASS",
      factorToBaseUnit: 1,
      isBaseUnit: false,
      isActive: true,
      sortOrder: 30_000,
    },
  });

  testMeasurementUnitId = measurementUnit.id;

  const productCategory = await database.productCategory.create({
    data: {
      code: `test-category-${marker}`,
      nameUa: "Тестова категорія",
      nameEn: "Test category",
      kind: "INGREDIENT",
      isAssignable: true,
      isActive: true,
      sortOrder: 30_000,
    },
  });

  testProductCategoryId = productCategory.id;

  const product = await database.product.create({
    data: {
      type: "GENERIC",
      nameEn: `Test product ${marker}`,
      nameUa: "Тестовий продукт",
      categoryId: productCategory.id,
      defaultMeasurementUnitId: measurementUnit.id,
      status: "ACTIVE",
    },
  });

  testProductId = product.id;

  const mealTypeFixtures = [
    {
      code: `test-breakfast-${marker}`,
      nameUa: "Тестовий сніданок",
      nameEn: "Test breakfast",
      kind: "MAIN_MEAL",
      sortOrder: 30_010,
    },
    {
      code: `test-lunch-${marker}`,
      nameUa: "Тестовий обід",
      nameEn: "Test lunch",
      kind: "MAIN_MEAL",
      sortOrder: 30_020,
    },
    {
      code: `test-dinner-${marker}`,
      nameUa: "Тестова вечеря",
      nameEn: "Test dinner",
      kind: "MAIN_MEAL",
      sortOrder: 30_030,
    },
    {
      code: `test-snack-${marker}`,
      nameUa: "Тестовий перекус",
      nameEn: "Test snack",
      kind: "SNACK",
      sortOrder: 30_040,
    },
  ] as const;

  const mealTypes = await Promise.all(
    mealTypeFixtures.map((fixture) =>
      database.mealType.create({
        data: {
          ...fixture,
          isActive: true,
        },
      }),
    ),
  );

  createdTestMealTypeIds.push(...mealTypes.map((mealType) => mealType.id));

  const [breakfastMealType, lunchMealType, dinnerMealType, snackMealType] = mealTypes;

  assert.notEqual(breakfastMealType, undefined);
  assert.notEqual(lunchMealType, undefined);
  assert.notEqual(dinnerMealType, undefined);
  assert.notEqual(snackMealType, undefined);

  await database.personMealTypePreference.deleteMany({
    where: {
      personProfileId: ownerProfile.id,
    },
  });

  await Promise.all([
    database.personMealTypePreference.createMany({
      data: [breakfastMealType!, lunchMealType!, dinnerMealType!, snackMealType!].map(
        (mealType) => ({
          personProfileId: ownerProfile.id,
          mealTypeId: mealType.id,
        }),
      ),
    }),

    database.personCuisinePreference.create({
      data: {
        personProfileId: ownerProfile.id,
        cuisineId: cuisine.id,
      },
    }),

    database.personDietaryRestriction.create({
      data: {
        personProfileId: ownerProfile.id,
        dietaryTagId: dietaryTag.id,
      },
    }),

    database.personAllergy.create({
      data: {
        personProfileId: ownerProfile.id,
        allergenId: allergen.id,
        severity: "MODERATE",
        source: "MANUAL",
      },
    }),

    database.personDislikedProduct.create({
      data: {
        personProfileId: ownerProfile.id,
        productId: product.id,
      },
    }),

    database.personWeightGoal.create({
      data: {
        personProfileId: ownerProfile.id,
        type: "MAINTAIN",
        status: "ACTIVE",
        targetWeightKg: 64,
        targetRateKgPerWeek: null,
        source: "MANUAL",
      },
    }),
  ]);

  const olderMeasurement = await database.bodyMeasurement.create({
    data: {
      personProfileId: ownerProfile.id,
      heightCm: 170,
      weightKg: 70,
      measuredAt: new Date("2026-01-01T10:00:00.000Z"),
      source: "MANUAL",
    },
  });

  const latestMeasurement = await database.bodyMeasurement.create({
    data: {
      personProfileId: ownerProfile.id,
      heightCm: 170,
      weightKg: 64.5,
      measuredAt: new Date("2026-02-01T10:00:00.000Z"),
      source: "MANUAL",
    },
  });

  assert.notEqual(olderMeasurement.id, latestMeasurement.id);

  const ownProfile = await repository.readOwnProfile(users[0]!.id);

  assert.equal(ownProfile.id, ownerProfile.id);

  assert.equal(ownProfile.firstName, "Олена");

  assert.equal(ownProfile.lastName, null);

  assert.deepEqual(
    ownProfile.mealTypes.map((mealType) => mealType.id),
    [breakfastMealType!.id, lunchMealType!.id, dinnerMealType!.id, snackMealType!.id],
  );

  assert.equal(ownProfile.cuisinePreferences.length, 1);

  assert.deepEqual(ownProfile.cuisinePreferences[0], {
    id: cuisine.id,
    code: cuisine.code,
    name: cuisine.nameUa,
  });

  assert.equal(ownProfile.dietaryRestrictions.length, 1);

  assert.deepEqual(ownProfile.dietaryRestrictions[0], {
    id: dietaryTag.id,
    code: dietaryTag.code,
    name: dietaryTag.nameUa,
  });

  assert.equal(ownProfile.allergies.length, 1);

  assert.deepEqual(ownProfile.allergies[0], {
    id: ownProfile.allergies[0]!.id,

    severity: "MODERATE",

    allergen: {
      id: allergen.id,
      code: allergen.code,
      name: allergen.nameUa,
    },
  });

  assert.equal(ownProfile.dislikedProducts.length, 1);

  assert.deepEqual(ownProfile.dislikedProducts[0], {
    id: product.id,
    name: product.nameUa,
  });

  assert.equal(ownProfile.currentBodyMeasurement?.id, latestMeasurement.id);

  assert.equal(ownProfile.currentBodyMeasurement?.heightCm, "170");

  assert.equal(ownProfile.currentBodyMeasurement?.weightKg, "64.5");

  assert.equal(ownProfile.currentBodyMeasurement?.measuredAt, "2026-02-01T10:00:00.000Z");

  assert.equal(ownProfile.currentActivity?.activityLevel, "MODERATE");

  assert.equal(ownProfile.currentWeightGoal?.type, "MAINTAIN");

  assert.equal(ownProfile.currentWeightGoal?.status, "ACTIVE");

  assert.equal(ownProfile.currentWeightGoal?.targetWeightKg, "64");
  assert.equal(ownProfile.nutritionTargets.current, null);

  /*
   * Own body measurement append/history semantics.
   *
   * New measurements never overwrite previous rows. If only one
   * metric is supplied, the other metric is carried forward from
   * the latest snapshot at or before measuredAt.
   */

  const bodyMeasurementCountBeforeAppend = await database.bodyMeasurement.count({
    where: {
      personProfileId: ownerProfile.id,
    },
  });

  const profileAfterWeightMeasurement = await repository.appendOwnBodyMeasurement(users[0]!.id, {
    weightKg: 63.25,
    measuredAt: "2026-04-01T10:00:00.000Z",
  });

  assert.equal(profileAfterWeightMeasurement.currentBodyMeasurement?.heightCm, "170");
  assert.equal(profileAfterWeightMeasurement.currentBodyMeasurement?.weightKg, "63.25");
  assert.equal(
    profileAfterWeightMeasurement.currentBodyMeasurement?.measuredAt,
    "2026-04-01T10:00:00.000Z",
  );

  assert.equal(
    await database.bodyMeasurement.count({
      where: {
        personProfileId: ownerProfile.id,
      },
    }),
    bodyMeasurementCountBeforeAppend + 1,
  );

  const appendedWeightMeasurement = await database.bodyMeasurement.findFirstOrThrow({
    where: {
      personProfileId: ownerProfile.id,
      measuredAt: new Date("2026-04-01T10:00:00.000Z"),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  assert.equal(appendedWeightMeasurement.heightCm?.toString(), "170");
  assert.equal(appendedWeightMeasurement.weightKg?.toString(), "63.25");
  assert.equal(appendedWeightMeasurement.source, "MANUAL");

  const unchangedLatestFixture = await database.bodyMeasurement.findUniqueOrThrow({
    where: {
      id: latestMeasurement.id,
    },
  });

  assert.equal(unchangedLatestFixture.heightCm?.toString(), "170");
  assert.equal(unchangedLatestFixture.weightKg?.toString(), "64.5");

  /*
   * Backdated measurements use the latest snapshot that existed
   * at or before their own measuredAt timestamp.
   */

  await repository.appendOwnBodyMeasurement(users[0]!.id, {
    heightCm: 171,
    measuredAt: "2026-01-15T10:00:00.000Z",
  });

  const backdatedMeasurement = await database.bodyMeasurement.findFirstOrThrow({
    where: {
      personProfileId: ownerProfile.id,
      measuredAt: new Date("2026-01-15T10:00:00.000Z"),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  assert.equal(backdatedMeasurement.heightCm?.toString(), "171");
  assert.equal(backdatedMeasurement.weightKg?.toString(), "70");

  /*
   * A backdated append must not replace the current measurement.
   */

  const profileAfterBackdatedMeasurement = await repository.readOwnProfile(users[0]!.id);

  assert.equal(
    profileAfterBackdatedMeasurement.currentBodyMeasurement?.id,
    appendedWeightMeasurement.id,
  );

  assert.equal(profileAfterBackdatedMeasurement.currentBodyMeasurement?.weightKg, "63.25");

  /*
   * A later height-only snapshot carries forward the current weight.
   */

  const profileAfterHeightMeasurement = await repository.appendOwnBodyMeasurement(users[0]!.id, {
    heightCm: 172,
    measuredAt: "2026-05-01T10:00:00.000Z",
  });

  assert.equal(profileAfterHeightMeasurement.currentBodyMeasurement?.heightCm, "172");
  assert.equal(profileAfterHeightMeasurement.currentBodyMeasurement?.weightKg, "63.25");
  assert.equal(
    profileAfterHeightMeasurement.currentBodyMeasurement?.measuredAt,
    "2026-05-01T10:00:00.000Z",
  );

  assert.equal(
    await database.bodyMeasurement.count({
      where: {
        personProfileId: ownerProfile.id,
      },
    }),
    bodyMeasurementCountBeforeAppend + 3,
  );

  /*
   * Own activity level interval semantics.
   *
   * A new latest period closes the previously active period.
   * Historical inserts are bounded by the next known period and
   * must not replace the current activity level.
   */

  const initialActivityPeriod = await database.personActivityPeriod.findFirstOrThrow({
    where: {
      personProfileId: ownerProfile.id,
      effectiveTo: null,
    },

    orderBy: [
      {
        effectiveFrom: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  assert.equal(initialActivityPeriod.activityLevel, "MODERATE");

  const activityPeriodCountBeforeAppend = await database.personActivityPeriod.count({
    where: {
      personProfileId: ownerProfile.id,
    },
  });

  const profileAfterCurrentActivityChange = await repository.appendOwnActivityPeriod(users[0]!.id, {
    activityLevel: "ACTIVE",
  });

  assert.equal(profileAfterCurrentActivityChange.currentActivity?.activityLevel, "ACTIVE");

  const currentActivityPeriod = await database.personActivityPeriod.findFirstOrThrow({
    where: {
      personProfileId: ownerProfile.id,
      effectiveTo: null,
    },

    orderBy: [
      {
        effectiveFrom: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  assert.equal(currentActivityPeriod.activityLevel, "ACTIVE");
  assert.equal(currentActivityPeriod.source, "MANUAL");

  const closedInitialActivityPeriod = await database.personActivityPeriod.findUniqueOrThrow({
    where: {
      id: initialActivityPeriod.id,
    },
  });

  assert.equal(
    closedInitialActivityPeriod.effectiveTo?.toISOString(),
    currentActivityPeriod.effectiveFrom.toISOString(),
  );

  assert.equal(
    await database.personActivityPeriod.count({
      where: {
        personProfileId: ownerProfile.id,
      },
    }),
    activityPeriodCountBeforeAppend + 1,
  );

  /*
   * Backdated activity starts before the onboarding period and ends
   * exactly when the next known period begins.
   */

  const backdatedActivityFrom = new Date("2026-01-15T10:00:00.000Z");

  const profileAfterBackdatedActivity = await repository.appendOwnActivityPeriod(users[0]!.id, {
    activityLevel: "LIGHT",
    effectiveFrom: backdatedActivityFrom.toISOString(),
  });

  const backdatedActivityPeriod = await database.personActivityPeriod.findFirstOrThrow({
    where: {
      personProfileId: ownerProfile.id,
      effectiveFrom: backdatedActivityFrom,
    },
  });

  assert.equal(backdatedActivityPeriod.activityLevel, "LIGHT");
  assert.equal(backdatedActivityPeriod.source, "MANUAL");
  assert.equal(
    backdatedActivityPeriod.effectiveTo?.toISOString(),
    initialActivityPeriod.effectiveFrom.toISOString(),
  );

  /*
   * A historical insert must not replace the open-ended current period.
   */

  assert.equal(profileAfterBackdatedActivity.currentActivity?.id, currentActivityPeriod.id);
  assert.equal(profileAfterBackdatedActivity.currentActivity?.activityLevel, "ACTIVE");

  assert.equal(
    await database.personActivityPeriod.count({
      where: {
        personProfileId: ownerProfile.id,
      },
    }),
    activityPeriodCountBeforeAppend + 2,
  );

  /*
   * The resulting periods must form non-overlapping boundaries around
   * the inserted historical period.
   */

  const orderedActivityPeriods = await database.personActivityPeriod.findMany({
    where: {
      personProfileId: ownerProfile.id,
    },

    orderBy: [
      {
        effectiveFrom: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  });

  for (let index = 0; index < orderedActivityPeriods.length - 1; index += 1) {
    const period = orderedActivityPeriods[index]!;
    const nextPeriod = orderedActivityPeriods[index + 1]!;

    if (period.effectiveTo !== null) {
      assert.ok(period.effectiveTo <= nextPeriod.effectiveFrom);
    }
  }

  /*
   * Reusing the same effectiveFrom would make the interval ambiguous,
   * so it is rejected without mutating history.
   */

  const activityPeriodCountBeforeConflict = await database.personActivityPeriod.count({
    where: {
      personProfileId: ownerProfile.id,
    },
  });

  await assert.rejects(
    repository.appendOwnActivityPeriod(users[0]!.id, {
      activityLevel: "VERY_ACTIVE",
      effectiveFrom: currentActivityPeriod.effectiveFrom.toISOString(),
    }),
    ActivityPeriodConflictError,
  );

  assert.equal(
    await database.personActivityPeriod.count({
      where: {
        personProfileId: ownerProfile.id,
      },
    }),
    activityPeriodCountBeforeConflict,
  );

  assert.equal(
    (await repository.readOwnProfile(users[0]!.id)).currentActivity?.id,
    currentActivityPeriod.id,
  );

  /*
   * Own weight-goal lifecycle semantics.
   *
   * Creating a new goal supersedes the current ACTIVE goal instead
   * of overwriting it, preserving history in PersonWeightGoal.
   */

  const initialWeightGoal = await database.personWeightGoal.findFirstOrThrow({
    where: {
      personProfileId: ownerProfile.id,
      status: "ACTIVE",
      endedAt: null,
    },
    orderBy: [
      {
        startsAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  assert.equal(initialWeightGoal.type, "MAINTAIN");

  const weightGoalCountBeforeReplacement = await database.personWeightGoal.count({
    where: {
      personProfileId: ownerProfile.id,
    },
  });

  const replacementStartsAt = new Date(
    Math.max(initialWeightGoal.startsAt.getTime() + 1, Date.now()),
  );

  const profileAfterWeightGoalReplacement = await repository.replaceOwnWeightGoal(users[0]!.id, {
    type: "LOSE",
    targetWeightKg: 58,
    targetRateKgPerWeek: 0.5,
    targetDate: "2026-12-01",
    startsAt: replacementStartsAt.toISOString(),
  });

  assert.equal(profileAfterWeightGoalReplacement.currentWeightGoal?.type, "LOSE");
  assert.equal(profileAfterWeightGoalReplacement.currentWeightGoal?.status, "ACTIVE");
  assert.equal(profileAfterWeightGoalReplacement.currentWeightGoal?.targetWeightKg, "58");
  assert.equal(profileAfterWeightGoalReplacement.currentWeightGoal?.targetRateKgPerWeek, "0.5");
  assert.equal(profileAfterWeightGoalReplacement.currentWeightGoal?.targetDate, "2026-12-01");

  const supersededInitialWeightGoal = await database.personWeightGoal.findUniqueOrThrow({
    where: {
      id: initialWeightGoal.id,
    },
  });

  assert.equal(supersededInitialWeightGoal.status, "SUPERSEDED");
  assert.equal(
    supersededInitialWeightGoal.endedAt?.toISOString(),
    replacementStartsAt.toISOString(),
  );

  const replacementWeightGoal = await database.personWeightGoal.findFirstOrThrow({
    where: {
      personProfileId: ownerProfile.id,
      status: "ACTIVE",
      endedAt: null,
    },
    orderBy: [
      {
        startsAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  assert.notEqual(replacementWeightGoal.id, initialWeightGoal.id);
  assert.equal(replacementWeightGoal.type, "LOSE");
  assert.equal(replacementWeightGoal.source, "MANUAL");
  assert.equal(replacementWeightGoal.targetWeightKg?.toString(), "58");
  assert.equal(replacementWeightGoal.targetRateKgPerWeek?.toString(), "0.5");
  assert.equal(replacementWeightGoal.targetDate?.toISOString().slice(0, 10), "2026-12-01");

  assert.equal(
    await database.personWeightGoal.count({
      where: {
        personProfileId: ownerProfile.id,
      },
    }),
    weightGoalCountBeforeReplacement + 1,
  );

  assert.equal(
    await database.personWeightGoal.count({
      where: {
        personProfileId: ownerProfile.id,
        status: "ACTIVE",
        endedAt: null,
      },
    }),
    1,
  );

  /*
   * A replacement may only move the lifecycle forward.
   */

  const weightGoalCountBeforeConflict = await database.personWeightGoal.count({
    where: {
      personProfileId: ownerProfile.id,
    },
  });

  await assert.rejects(
    repository.replaceOwnWeightGoal(users[0]!.id, {
      type: "GAIN",
      startsAt: replacementWeightGoal.startsAt.toISOString(),
    }),
    WeightGoalConflictError,
  );

  assert.equal(
    await database.personWeightGoal.count({
      where: {
        personProfileId: ownerProfile.id,
      },
    }),
    weightGoalCountBeforeConflict,
  );

  assert.equal(
    (await repository.readOwnProfile(users[0]!.id)).currentWeightGoal?.id,
    replacementWeightGoal.id,
  );

  /*
   * Completion closes the ACTIVE goal and removes it from OwnProfile.currentWeightGoal.
   */

  const profileAfterWeightGoalCompletion = await repository.completeOwnWeightGoal(users[0]!.id);

  assert.equal(profileAfterWeightGoalCompletion.currentWeightGoal, null);

  const completedWeightGoal = await database.personWeightGoal.findUniqueOrThrow({
    where: {
      id: replacementWeightGoal.id,
    },
  });

  assert.equal(completedWeightGoal.status, "COMPLETED");
  assert.notEqual(completedWeightGoal.endedAt, null);

  await assert.rejects(
    repository.completeOwnWeightGoal(users[0]!.id),
    ActiveWeightGoalNotFoundError,
  );

  /*
   * A new goal can be created after completion and can be explicitly cancelled.
   */

  const profileAfterNewGainGoal = await repository.replaceOwnWeightGoal(users[0]!.id, {
    type: "GAIN",
    targetWeightKg: 62,
  });

  assert.equal(profileAfterNewGainGoal.currentWeightGoal?.type, "GAIN");
  assert.equal(profileAfterNewGainGoal.currentWeightGoal?.status, "ACTIVE");

  const gainGoalId = profileAfterNewGainGoal.currentWeightGoal!.id;

  const profileAfterWeightGoalCancellation = await repository.cancelOwnWeightGoal(users[0]!.id);

  assert.equal(profileAfterWeightGoalCancellation.currentWeightGoal, null);

  const cancelledWeightGoal = await database.personWeightGoal.findUniqueOrThrow({
    where: {
      id: gainGoalId,
    },
  });

  assert.equal(cancelledWeightGoal.status, "CANCELLED");
  assert.notEqual(cancelledWeightGoal.endedAt, null);

  await assert.rejects(repository.cancelOwnWeightGoal(users[0]!.id), ActiveWeightGoalNotFoundError);

  /*
   * Restore an ACTIVE goal for later account/profile assertions.
   */

  const restoredWeightGoalProfile = await repository.replaceOwnWeightGoal(users[0]!.id, {
    type: "MAINTAIN",
    targetWeightKg: 63,
  });

  assert.equal(restoredWeightGoalProfile.currentWeightGoal?.type, "MAINTAIN");
  assert.equal(restoredWeightGoalProfile.currentWeightGoal?.status, "ACTIVE");

  /*
   * Own meal types replacement
   */

  const profileAfterMealTypes = await repository.replaceOwnMealTypes(users[0]!.id, {
    mealTypeIds: [breakfastMealType!.id, lunchMealType!.id, dinnerMealType!.id],
  });

  assert.deepEqual(
    profileAfterMealTypes.mealTypes.map((mealType) => mealType.id),
    [breakfastMealType!.id, lunchMealType!.id, dinnerMealType!.id],
  );

  const persistedMealTypePreferences = await database.personMealTypePreference.findMany({
    where: {
      personProfileId: ownerProfile.id,
    },
    orderBy: {
      mealType: {
        sortOrder: "asc",
      },
    },
  });

  assert.deepEqual(
    persistedMealTypePreferences.map((preference) => preference.mealTypeId),
    [breakfastMealType!.id, lunchMealType!.id, dinnerMealType!.id],
  );

  const profileAfterMealTypesClear = await repository.replaceOwnMealTypes(users[0]!.id, {
    mealTypeIds: [],
  });

  assert.deepEqual(profileAfterMealTypesClear.mealTypes, []);

  assert.equal(
    await database.personMealTypePreference.count({
      where: {
        personProfileId: ownerProfile.id,
      },
    }),
    0,
  );

  const restoredMealTypesProfile = await repository.replaceOwnMealTypes(users[0]!.id, {
    mealTypeIds: [breakfastMealType!.id, lunchMealType!.id, dinnerMealType!.id, snackMealType!.id],
  });

  assert.equal(restoredMealTypesProfile.mealTypes.length, 4);

  await assert.rejects(
    repository.replaceOwnMealTypes(users[0]!.id, {
      mealTypeIds: [crypto.randomUUID()],
    }),
    InvalidMealTypesError,
  );

  assert.equal(
    await database.personMealTypePreference.count({
      where: {
        personProfileId: ownerProfile.id,
      },
    }),
    4,
  );

  /*
   * Own cuisine preferences mutation
   */

  const profileAfterCuisinePreferences = await repository.replaceOwnCuisinePreferences(
    users[0]!.id,
    {
      cuisineIds: [cuisine.id],
    },
  );

  assert.equal(profileAfterCuisinePreferences.cuisinePreferences.length, 1);

  assert.deepEqual(profileAfterCuisinePreferences.cuisinePreferences[0], {
    id: cuisine.id,
    code: cuisine.code,
    name: cuisine.nameUa,
  });

  assert.equal(
    await database.personCuisinePreference.count({
      where: {
        personProfileId: ownerProfile.id,
      },
    }),
    1,
  );

  const persistedCuisinePreference = await database.personCuisinePreference.findUniqueOrThrow({
    where: {
      personProfileId_cuisineId: {
        personProfileId: ownerProfile.id,

        cuisineId: cuisine.id,
      },
    },
  });

  assert.equal(persistedCuisinePreference.personProfileId, ownerProfile.id);

  assert.equal(persistedCuisinePreference.cuisineId, cuisine.id);

  /*
   * Empty collection means clear all cuisine preferences.
   */

  const profileAfterCuisineClear = await repository.replaceOwnCuisinePreferences(users[0]!.id, {
    cuisineIds: [],
  });

  assert.deepEqual(profileAfterCuisineClear.cuisinePreferences, []);

  assert.equal(
    await database.personCuisinePreference.count({
      where: {
        personProfileId: ownerProfile.id,
      },
    }),
    0,
  );

  /*
   * Restore the fixture because later assertions
   * rely on the owner having a cuisine preference.
   */

  const restoredCuisineProfile = await repository.replaceOwnCuisinePreferences(users[0]!.id, {
    cuisineIds: [cuisine.id],
  });

  assert.equal(restoredCuisineProfile.cuisinePreferences[0]?.id, cuisine.id);

  assert.equal(
    await database.personCuisinePreference.count({
      where: {
        personProfileId: ownerProfile.id,
      },
    }),
    1,
  );

  /*
   * A syntactically valid UUID that does not reference
   * an active/selectable cuisine must be rejected.
   */

  await assert.rejects(
    repository.replaceOwnCuisinePreferences(users[0]!.id, {
      cuisineIds: [crypto.randomUUID()],
    }),
    InvalidCuisinePreferencesError,
  );

  /*
   * Failed validation must not mutate existing preferences.
   */

  assert.equal(
    await database.personCuisinePreference.count({
      where: {
        personProfileId: ownerProfile.id,
      },
    }),
    1,
  );

  assert.equal(
    (await repository.readOwnProfile(users[0]!.id)).cuisinePreferences[0]?.id,
    cuisine.id,
  );

  /*
   * NutrientTargetSet lifecycle semantics.
   *
   * There is at most one current set per PersonProfile. Manual targets
   * work independently from automatic eligibility. PUT replaces the
   * complete current snapshot and versions the previous one.
   */
  const sodiumId = nutrientByCode.get("sodium")!.id;
  const energyId = nutrientByCode.get("energy_kcal")!.id;

  const profileAfterManualTargets = await repository.replaceOwnNutrientTargets(users[0]!.id, {
    items: [
      { nutrientId: sodiumId, maximumValue: 1800 },
      { nutrientId: energyId, targetValue: 1950 },
    ],
  });

  assert.equal(profileAfterManualTargets.nutritionTargets.current?.source, "MANUAL");
  assert.equal(profileAfterManualTargets.nutritionTargets.current?.targets.length, 2);

  const firstManualSetId = profileAfterManualTargets.nutritionTargets.current!.id;

  /*
   * Replacing a MANUAL snapshot closes the previous snapshot and creates
   * a new current version.
   */
  const profileAfterManualReplacement = await repository.replaceOwnNutrientTargets(users[0]!.id, {
    items: [{ nutrientId: sodiumId, maximumValue: 2000 }],
  });

  assert.equal(profileAfterManualReplacement.nutritionTargets.current?.source, "MANUAL");
  assert.notEqual(profileAfterManualReplacement.nutritionTargets.current?.id, firstManualSetId);
  assert.equal(
    profileAfterManualReplacement.nutritionTargets.current?.targets[0]?.maximumValue,
    "2000",
  );
  assert.notEqual(
    (await database.nutrientTargetSet.findUniqueOrThrow({ where: { id: firstManualSetId } }))
      .effectiveTo,
    null,
  );

  await assert.rejects(
    repository.replaceOwnNutrientTargets(users[0]!.id, {
      items: [{ nutrientId: crypto.randomUUID(), targetValue: 100 }],
    }),
    InvalidNutrientTargetsError,
  );

  /*
   * Empty replacement closes the current snapshot and leaves no current set.
   */
  const profileAfterManualClear = await repository.replaceOwnNutrientTargets(users[0]!.id, {
    items: [],
  });

  assert.equal(profileAfterManualClear.nutritionTargets.current, null);

  /*
   * Editing even one value of an automatic snapshot turns the new snapshot
   * into MANUAL. PUT supplies the complete desired snapshot, therefore all
   * unchanged calculated targets are copied into the new version.
   */
  const eligibleCalculatedSet = eligibleProfile.nutritionTargets.current!;
  const eligibleCalculatedSetId = eligibleCalculatedSet.id;

  const replacementItems = eligibleCalculatedSet.targets.map((target) => ({
    nutrientId: target.nutrient.id,
    ...(target.minimumValue === null
      ? {}
      : {
          minimumValue: Number(target.minimumValue),
        }),
    ...(target.targetValue === null
      ? {}
      : {
          targetValue: target.nutrient.code === "energy_kcal" ? 1800 : Number(target.targetValue),
        }),
    ...(target.maximumValue === null
      ? {}
      : {
          maximumValue: Number(target.maximumValue),
        }),
  }));

  const eligibleWithManualEnergy = await repository.replaceOwnNutrientTargets(eligibleUser.id, {
    items: replacementItems,
  });

  const currentEligibleSet = eligibleWithManualEnergy.nutritionTargets.current!;

  assert.equal(currentEligibleSet.source, "MANUAL");
  assert.notEqual(currentEligibleSet.id, eligibleCalculatedSetId);
  assert.equal(
    currentEligibleSet.targets.find((target) => target.nutrient.code === "energy_kcal")
      ?.targetValue,
    "1800",
  );
  assert.equal(
    currentEligibleSet.targets.find((target) => target.nutrient.code === "energy_kcal")?.source,
    "MANUAL",
  );
  assert.equal(
    currentEligibleSet.targets.find((target) => target.nutrient.code === "sodium")?.source,
    "CALCULATED",
  );
  assert.equal(
    currentEligibleSet.calculationPolicyVersion,
    eligibleCalculatedSet.calculationPolicyVersion,
  );
  assert.equal(currentEligibleSet.restingEnergyKcal, eligibleCalculatedSet.restingEnergyKcal);
  assert.equal(
    currentEligibleSet.maintenanceEnergyKcal,
    eligibleCalculatedSet.maintenanceEnergyKcal,
  );

  const closedCalculatedSet = await database.nutrientTargetSet.findUniqueOrThrow({
    where: {
      id: eligibleCalculatedSetId,
    },
  });

  assert.notEqual(closedCalculatedSet.effectiveTo, null);

  assert.equal(
    await database.nutrientTargetSet.count({
      where: {
        personProfileId: closedCalculatedSet.personProfileId,
        effectiveTo: null,
      },
    }),
    1,
  );

  /*
   * PUT is idempotent: the exact same full snapshot does not create
   * another historical version.
   */
  const currentSetIdBeforeIdempotentPut = currentEligibleSet.id;

  const idempotentReplacementItems = currentEligibleSet.targets.map((target) => ({
    nutrientId: target.nutrient.id,
    ...(target.minimumValue === null
      ? {}
      : {
          minimumValue: Number(target.minimumValue),
        }),
    ...(target.targetValue === null
      ? {}
      : {
          targetValue: Number(target.targetValue),
        }),
    ...(target.maximumValue === null
      ? {}
      : {
          maximumValue: Number(target.maximumValue),
        }),
  }));

  const afterIdempotentPut = await repository.replaceOwnNutrientTargets(eligibleUser.id, {
    items: idempotentReplacementItems,
  });

  assert.equal(afterIdempotentPut.nutritionTargets.current?.id, currentSetIdBeforeIdempotentPut);

  /*
   * Dependent member management
   */

  const dependent = await repository.createDependent(users[0]!.id, {
    firstName: "Дитина",
  });

  assert.equal(dependent.isAccountOwner, false);

  const dependentDefaultPreferences = await database.personMealTypePreference.findMany({
    where: {
      personProfileId: dependent.profileId,
    },
    include: {
      mealType: {
        select: {
          code: true,
          sortOrder: true,
        },
      },
    },
    orderBy: {
      mealType: {
        sortOrder: "asc",
      },
    },
  });

  assert.deepEqual(
    dependentDefaultPreferences.map((preference) => preference.mealType.code),
    ["breakfast", "lunch", "dinner"],
  );

  const updated = await repository.updateDependent(users[0]!.id, dependent.id, {
    firstName: "Марія",
  });

  assert.equal(updated.firstName, "Марія");

  /*
   * OWNER-managed rich profile.
   *
   * The managed read-model intentionally matches OwnProfileView so the
   * web-client can reuse the same profile sections.
   */

  const managedDependentProfile = await repository.readManagedProfile(users[0]!.id, dependent.id);

  assert.equal(managedDependentProfile.id, dependent.profileId);
  assert.equal(managedDependentProfile.familyMemberId, dependent.id);
  assert.equal(managedDependentProfile.firstName, "Марія");

  const managedAfterBasicUpdate = await repository.updateManagedProfile(
    users[0]!.id,
    dependent.id,
    {
      lastName: "Коваленко",
      biologicalSex: "FEMALE",
    },
  );

  assert.equal(managedAfterBasicUpdate.lastName, "Коваленко");
  assert.equal(managedAfterBasicUpdate.biologicalSex, "FEMALE");

  const managedMeasurementAt = "2026-06-01T10:00:00.000Z";

  const managedAfterMeasurement = await repository.appendManagedBodyMeasurement(
    users[0]!.id,
    dependent.id,
    {
      heightCm: 150,
      weightKg: 42.5,
      measuredAt: managedMeasurementAt,
    },
  );

  assert.equal(managedAfterMeasurement.currentBodyMeasurement?.heightCm, "150");
  assert.equal(managedAfterMeasurement.currentBodyMeasurement?.weightKg, "42.5");
  assert.equal(managedAfterMeasurement.currentBodyMeasurement?.measuredAt, managedMeasurementAt);

  const managedAfterMealTypes = await repository.replaceManagedMealTypes(
    users[0]!.id,
    dependent.id,
    {
      mealTypeIds: [breakfastMealType!.id, lunchMealType!.id, dinnerMealType!.id],
    },
  );

  assert.deepEqual(
    managedAfterMealTypes.mealTypes.map((mealType) => mealType.id),
    [breakfastMealType!.id, lunchMealType!.id, dinnerMealType!.id],
  );

  /*
   * Tenant isolation
   */

  await repository.completeOnboarding(users[1]!.id, {
    firstName: "Інший",
  });

  await assert.rejects(
    repository.updateDependent(users[1]!.id, dependent.id, {
      firstName: "Порушення",
    }),
    FamilyMemberNotFoundError,
  );

  await assert.rejects(
    repository.readManagedProfile(users[1]!.id, dependent.id),
    FamilyMemberNotFoundError,
  );

  /*
   * Dependent account activation
   */

  const activationTarget = await repository.createDependent(users[0]!.id, {
    firstName: "Запрошена",
  });

  const activationTargetDefaultPreferences = await database.personMealTypePreference.findMany({
    where: {
      personProfileId: activationTarget.profileId,
    },
    include: {
      mealType: {
        select: {
          code: true,
          sortOrder: true,
        },
      },
    },
    orderBy: {
      mealType: {
        sortOrder: "asc",
      },
    },
  });

  assert.deepEqual(
    activationTargetDefaultPreferences.map((preference) => preference.mealType.code),
    ["breakfast", "lunch", "dinner"],
  );

  await database.personMealTypePreference.deleteMany({
    where: {
      personProfileId: activationTarget.profileId,
    },
  });

  const activationMeasurementAt = new Date("2026-03-01T10:00:00.000Z");

  const activationActivityAt = new Date("2026-03-02T10:00:00.000Z");

  await Promise.all([
    database.bodyMeasurement.create({
      data: {
        personProfileId: activationTarget.profileId,
        heightCm: 168,
        weightKg: 61,
        measuredAt: activationMeasurementAt,
        source: "MANUAL",
      },
    }),

    database.personActivityPeriod.create({
      data: {
        personProfileId: activationTarget.profileId,
        activityLevel: "MODERATE",
        effectiveFrom: activationActivityAt,
        source: "MANUAL",
      },
    }),

    database.personWeightGoal.create({
      data: {
        personProfileId: activationTarget.profileId,
        type: "MAINTAIN",
        status: "ACTIVE",
        source: "MANUAL",
      },
    }),

    database.personMealTypePreference.createMany({
      data: [breakfastMealType!, lunchMealType!, dinnerMealType!, snackMealType!].map(
        (mealType) => ({
          personProfileId: activationTarget.profileId,
          mealTypeId: mealType.id,
        }),
      ),
    }),

    database.personCuisinePreference.create({
      data: {
        personProfileId: activationTarget.profileId,
        cuisineId: cuisine.id,
      },
    }),

    database.personDietaryRestriction.create({
      data: {
        personProfileId: activationTarget.profileId,
        dietaryTagId: dietaryTag.id,
      },
    }),

    database.personAllergy.create({
      data: {
        personProfileId: activationTarget.profileId,
        allergenId: allergen.id,
        severity: "MILD",
        source: "MANUAL",
      },
    }),

    database.personDislikedProduct.create({
      data: {
        personProfileId: activationTarget.profileId,
        productId: product.id,
      },
    }),
  ]);

  await assert.rejects(
    invitationRepository.create({
      actorUserId: users[1]!.id,

      memberId: activationTarget.id,

      recipientEmail: `invited-${marker}@example.test`,

      tokenHash: "a".repeat(64),

      expiresAt: new Date(Date.now() + 60_000),
    }),
    FamilyMemberNotFoundError,
  );

  const invitation = await invitationRepository.create({
    actorUserId: users[0]!.id,

    memberId: activationTarget.id,

    recipientEmail: `invited-${marker}@example.test`,

    tokenHash: "b".repeat(64),

    expiresAt: new Date(Date.now() + 60_000),
  });

  const invitedUser = await database.user.create({
    data: {
      externalSubject: crypto.randomUUID(),

      email: `invited-${marker}@example.test`,
    },
  });

  users.push(invitedUser);

  /*
   * Concurrent and repeated claims must remain idempotent.
   */

  await Promise.all([
    invitationRepository.claim({
      tokenHash: "b".repeat(64),

      userId: invitedUser.id,

      verifiedEmail: invitedUser.email,
    }),

    invitationRepository.claim({
      tokenHash: "b".repeat(64),

      userId: invitedUser.id,

      verifiedEmail: invitedUser.email,
    }),
  ]);

  await invitationRepository.claim({
    tokenHash: "b".repeat(64),

    userId: invitedUser.id,

    verifiedEmail: invitedUser.email,
  });

  assert.equal(
    await database.familyMembership.count({
      where: { userId: invitedUser.id, status: "ACTIVE", endedAt: null },
    }),
    1,
  );

  assert.equal(
    await database.personProfile.count({
      where: { userId: invitedUser.id },
    }),
    1,
  );

  await assert.rejects(
    repository.readManagedProfile(invitedUser.id, activationTarget.id),
    FamilyOwnerRequiredError,
  );

  /*
   * Own dietary restrictions mutation
   */

  const profileAfterDietaryRestrictions = await repository.replaceOwnDietaryRestrictions(
    users[0]!.id,
    {
      dietaryTagIds: [dietaryTag.id],
    },
  );

  assert.equal(profileAfterDietaryRestrictions.dietaryRestrictions.length, 1);

  assert.deepEqual(profileAfterDietaryRestrictions.dietaryRestrictions[0], {
    id: dietaryTag.id,
    code: dietaryTag.code,
    name: dietaryTag.nameUa,
  });

  assert.equal(
    await database.personDietaryRestriction.count({
      where: {
        personProfileId: ownerProfile.id,
      },
    }),
    1,
  );

  const persistedDietaryRestriction = await database.personDietaryRestriction.findUniqueOrThrow({
    where: {
      personProfileId_dietaryTagId: {
        personProfileId: ownerProfile.id,
        dietaryTagId: dietaryTag.id,
      },
    },
  });

  assert.equal(persistedDietaryRestriction.personProfileId, ownerProfile.id);

  assert.equal(persistedDietaryRestriction.dietaryTagId, dietaryTag.id);

  /*
   * Empty collection clears all dietary restrictions.
   */

  const profileAfterDietaryRestrictionsClear = await repository.replaceOwnDietaryRestrictions(
    users[0]!.id,
    {
      dietaryTagIds: [],
    },
  );

  assert.deepEqual(profileAfterDietaryRestrictionsClear.dietaryRestrictions, []);

  assert.equal(
    await database.personDietaryRestriction.count({
      where: {
        personProfileId: ownerProfile.id,
      },
    }),
    0,
  );

  /*
   * Restore fixture for later account-activation assertions.
   */

  const restoredDietaryRestrictionsProfile = await repository.replaceOwnDietaryRestrictions(
    users[0]!.id,
    {
      dietaryTagIds: [dietaryTag.id],
    },
  );

  assert.equal(restoredDietaryRestrictionsProfile.dietaryRestrictions[0]?.id, dietaryTag.id);

  assert.equal(
    await database.personDietaryRestriction.count({
      where: {
        personProfileId: ownerProfile.id,
      },
    }),
    1,
  );

  /*
   * A valid UUID that is not an active/selectable
   * dietary restriction must be rejected.
   */

  await assert.rejects(
    repository.replaceOwnDietaryRestrictions(users[0]!.id, {
      dietaryTagIds: [crypto.randomUUID()],
    }),
    InvalidDietaryRestrictionsError,
  );

  /*
   * Failed validation must leave existing restrictions intact.
   */

  assert.equal(
    await database.personDietaryRestriction.count({
      where: {
        personProfileId: ownerProfile.id,
      },
    }),
    1,
  );

  assert.equal(
    (await repository.readOwnProfile(users[0]!.id)).dietaryRestrictions[0]?.id,
    dietaryTag.id,
  );

  /*
   * Own allergies mutation.
   *
   * PersonAllergy has a unique constraint on
   * (personProfileId, allergenId), so severity changes
   * update the same row and archived rows are reactivated.
   */

  const initialAllergy = await database.personAllergy.findUniqueOrThrow({
    where: {
      personProfileId_allergenId: {
        personProfileId: ownerProfile.id,
        allergenId: allergen.id,
      },
    },
  });

  assert.equal(initialAllergy.severity, "MODERATE");
  assert.equal(initialAllergy.archivedAt, null);

  const profileAfterAllergySeverityChange = await repository.replaceOwnAllergies(users[0]!.id, {
    items: [
      {
        allergenId: allergen.id,
        severity: "SEVERE",
      },
    ],
  });

  assert.equal(profileAfterAllergySeverityChange.allergies.length, 1);
  assert.equal(profileAfterAllergySeverityChange.allergies[0]?.allergen.id, allergen.id);
  assert.equal(profileAfterAllergySeverityChange.allergies[0]?.severity, "SEVERE");

  const updatedAllergy = await database.personAllergy.findUniqueOrThrow({
    where: {
      personProfileId_allergenId: {
        personProfileId: ownerProfile.id,
        allergenId: allergen.id,
      },
    },
  });

  assert.equal(updatedAllergy.id, initialAllergy.id);
  assert.equal(updatedAllergy.severity, "SEVERE");
  assert.equal(updatedAllergy.archivedAt, null);

  assert.equal(
    await database.personAllergy.count({
      where: {
        personProfileId: ownerProfile.id,
        allergenId: allergen.id,
      },
    }),
    1,
  );

  /*
   * Clearing the desired state archives the current row
   * rather than deleting it.
   */

  const profileAfterAllergiesClear = await repository.replaceOwnAllergies(users[0]!.id, {
    items: [],
  });

  assert.deepEqual(profileAfterAllergiesClear.allergies, []);

  const archivedAllergy = await database.personAllergy.findUniqueOrThrow({
    where: {
      personProfileId_allergenId: {
        personProfileId: ownerProfile.id,
        allergenId: allergen.id,
      },
    },
  });

  assert.equal(archivedAllergy.id, initialAllergy.id);
  assert.notEqual(archivedAllergy.archivedAt, null);

  /*
   * Re-adding an archived allergy reactivates the same row
   * and applies the new severity.
   */

  const profileAfterAllergyReactivation = await repository.replaceOwnAllergies(users[0]!.id, {
    items: [
      {
        allergenId: allergen.id,
        severity: "MILD",
      },
    ],
  });

  assert.equal(profileAfterAllergyReactivation.allergies.length, 1);
  assert.equal(profileAfterAllergyReactivation.allergies[0]?.allergen.id, allergen.id);
  assert.equal(profileAfterAllergyReactivation.allergies[0]?.severity, "MILD");

  const reactivatedAllergy = await database.personAllergy.findUniqueOrThrow({
    where: {
      personProfileId_allergenId: {
        personProfileId: ownerProfile.id,
        allergenId: allergen.id,
      },
    },
  });

  assert.equal(reactivatedAllergy.id, initialAllergy.id);
  assert.equal(reactivatedAllergy.severity, "MILD");
  assert.equal(reactivatedAllergy.source, "MANUAL");
  assert.equal(reactivatedAllergy.archivedAt, null);

  assert.equal(
    await database.personAllergy.count({
      where: {
        personProfileId: ownerProfile.id,
        allergenId: allergen.id,
      },
    }),
    1,
  );

  /*
   * A syntactically valid UUID that does not reference
   * an active allergen must fail before any mutation.
   */

  await assert.rejects(
    repository.replaceOwnAllergies(users[0]!.id, {
      items: [
        {
          allergenId: crypto.randomUUID(),
          severity: "MODERATE",
        },
      ],
    }),
    InvalidAllergiesError,
  );

  const allergyAfterFailedValidation = await database.personAllergy.findUniqueOrThrow({
    where: {
      personProfileId_allergenId: {
        personProfileId: ownerProfile.id,
        allergenId: allergen.id,
      },
    },
  });

  assert.equal(allergyAfterFailedValidation.id, initialAllergy.id);
  assert.equal(allergyAfterFailedValidation.severity, "MILD");
  assert.equal(allergyAfterFailedValidation.archivedAt, null);

  const invitedProfile = await repository.readOwnProfile(invitedUser.id);

  /*
   * OwnProfileView uses PersonProfile.id as `id`
   * and exposes FamilyMember.id separately.
   */

  assert.equal(invitedProfile.id, activationTarget.profileId);

  assert.equal(invitedProfile.familyMemberId, activationTarget.id);

  assert.equal(invitedProfile.firstName, "Запрошена");

  assert.deepEqual(
    invitedProfile.mealTypes.map((mealType) => mealType.id),
    [breakfastMealType!.id, lunchMealType!.id, dinnerMealType!.id, snackMealType!.id],
  );

  assert.equal(invitedProfile.currentBodyMeasurement?.heightCm, "168");

  assert.equal(invitedProfile.currentBodyMeasurement?.weightKg, "61");

  assert.equal(invitedProfile.currentActivity?.activityLevel, "MODERATE");

  assert.equal(invitedProfile.currentWeightGoal?.type, "MAINTAIN");

  assert.equal(invitedProfile.cuisinePreferences[0]?.id, cuisine.id);

  assert.equal(invitedProfile.dietaryRestrictions[0]?.id, dietaryTag.id);

  assert.equal(invitedProfile.allergies[0]?.allergen.id, allergen.id);

  assert.equal(invitedProfile.allergies[0]?.severity, "MILD");

  assert.equal(invitedProfile.dislikedProducts[0]?.id, product.id);

  /*
   * Claim must preserve all existing profile rows.
   */

  assert.equal(
    await database.bodyMeasurement.count({
      where: {
        personProfileId: activationTarget.profileId,
      },
    }),
    1,
  );

  assert.equal(
    await database.personActivityPeriod.count({
      where: {
        personProfileId: activationTarget.profileId,
      },
    }),
    1,
  );

  assert.equal(
    await database.personWeightGoal.count({
      where: {
        personProfileId: activationTarget.profileId,
      },
    }),
    1,
  );

  assert.equal(
    await database.personMealTypePreference.count({
      where: {
        personProfileId: activationTarget.profileId,
      },
    }),
    4,
  );

  assert.equal(
    await database.personCuisinePreference.count({
      where: {
        personProfileId: activationTarget.profileId,
      },
    }),
    1,
  );

  assert.equal(
    await database.personDietaryRestriction.count({
      where: {
        personProfileId: activationTarget.profileId,
      },
    }),
    1,
  );

  assert.equal(
    await database.personAllergy.count({
      where: {
        personProfileId: activationTarget.profileId,
      },
    }),
    1,
  );

  assert.equal(
    await database.personDislikedProduct.count({
      where: {
        personProfileId: activationTarget.profileId,
      },
    }),
    1,
  );

  assert.equal((await repository.readSession(invitedUser.id)).family?.role, "MEMBER");

  assert.equal(
    await database.familyMembership.count({
      where: {
        userId: invitedUser.id,
        status: "ACTIVE",
      },
    }),
    1,
  );

  assert.equal((await invitationRepository.inspect("b".repeat(64))).status, "ACCEPTED");

  assert.equal(invitation.view.status, "PENDING");

  /*
   * Soft archive dependent member.
   */

  await repository.archiveDependent(users[0]!.id, dependent.id);

  assert.equal(
    (await repository.listMembers(users[0]!.id)).some((member) => member.id === dependent.id),
    false,
  );

  console.info("Family repository PostgreSQL integration test passed.");
} finally {
  /*
   * Find all PersonProfiles created by this test before
   * deleting Family rows, because dependent profiles do
   * not necessarily have userId.
   */

  const profiles = await database.personProfile.findMany({
    where: {
      OR: [
        {
          userId: {
            in: users.map((user) => user.id),
          },
        },

        {
          familyMembers: {
            some: {
              family: {
                createdByUserId: {
                  in: users.map((user) => user.id),
                },
              },
            },
          },
        },
      ],
    },

    select: {
      id: true,
    },
  });

  /*
   * Family deletion cascades family memberships,
   * members and account invitations.
   */

  await database.family.deleteMany({
    where: {
      createdByUserId: {
        in: users.map((user) => user.id),
      },
    },
  });

  /*
   * Profile deletion cascades measurements,
   * activity periods, goals, preferences,
   * allergies and meal-type preferences.
   */

  await database.personProfile.deleteMany({
    where: {
      id: {
        in: profiles.map((profile) => profile.id),
      },
    },
  });

  /*
   * Remove the test product before deleting its
   * category and measurement unit.
   */

  if (testProductId !== null) {
    await database.product.deleteMany({
      where: {
        id: testProductId,
      },
    });
  }

  if (testProductCategoryId !== null) {
    await database.productCategory.deleteMany({
      where: {
        id: testProductCategoryId,
      },
    });
  }

  if (testMeasurementUnitId !== null) {
    await database.measurementUnit.deleteMany({
      where: {
        id: testMeasurementUnitId,
      },
    });
  }

  if (testCuisineId !== null) {
    await database.cuisine.deleteMany({
      where: {
        id: testCuisineId,
      },
    });
  }

  if (testDietaryTagId !== null) {
    await database.dietaryTag.deleteMany({
      where: {
        id: testDietaryTagId,
      },
    });
  }

  if (testAllergenId !== null) {
    await database.allergen.deleteMany({
      where: {
        id: testAllergenId,
      },
    });
  }

  await database.user.deleteMany({
    where: {
      id: {
        in: users.map((user) => user.id),
      },
    },
  });

  if (createdTestMealTypeIds.length > 0) {
    await database.personMealTypePreference.deleteMany({
      where: {
        mealTypeId: {
          in: createdTestMealTypeIds,
        },
      },
    });

    await database.mealType.deleteMany({
      where: {
        id: {
          in: createdTestMealTypeIds,
        },
      },
    });
  }

  if (createdDefaultMealTypeIds.length > 0) {
    await database.personMealTypePreference.deleteMany({
      where: {
        mealTypeId: {
          in: createdDefaultMealTypeIds,
        },
      },
    });

    await database.mealType.deleteMany({
      where: {
        id: {
          in: createdDefaultMealTypeIds,
        },
      },
    });
  }

  if (createdTestNutrientIds.length > 0) {
    await database.nutrient.deleteMany({
      where: {
        id: {
          in: createdTestNutrientIds,
        },
      },
    });
  }

  await database.$disconnect();
}

function requireSafeTestDatabaseUrl(rawValue: string | undefined): string {
  if (rawValue === undefined) {
    throw new Error("TEST_DATABASE_URL is required");
  }

  const url = new URL(rawValue);

  const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ""));

  if (
    !new Set(["127.0.0.1", "localhost", "::1"]).has(url.hostname) ||
    url.port !== "54322" ||
    databaseName !== "mealmind_test" ||
    url.searchParams.has("schema")
  ) {
    throw new Error("Family repository test may use only local mealmind_test on port 54322");
  }

  return url.toString();
}
