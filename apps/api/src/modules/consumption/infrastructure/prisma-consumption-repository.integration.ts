import assert from "node:assert/strict";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { createDatabaseClient } from "@mealmind/db";
import { createPrismaConsumptionRepository } from "./prisma-consumption-repository.js";

try {
  loadEnvFile(resolve(process.cwd(), "../../.env"));
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
}
const database = createDatabaseClient({
  connectionString: requireSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL),
  log: ["error"],
});
const repository = createPrismaConsumptionRepository(database);
const marker = crypto.randomUUID();
const owner = await database.user.create({
  data: { externalSubject: crypto.randomUUID(), email: `consumption-owner-${marker}@example.test` },
});
const memberUser = await database.user.create({
  data: {
    externalSubject: crypto.randomUUID(),
    email: `consumption-member-${marker}@example.test`,
  },
});
const [ownerProfile, memberProfile, dependentProfile] = await Promise.all([
  database.personProfile.create({ data: { userId: owner.id, firstName: "Олена" } }),
  database.personProfile.create({ data: { userId: memberUser.id, firstName: "Іван" } }),
  database.personProfile.create({ data: { firstName: "Дитина" } }),
]);
const category = await database.productCategory.findFirstOrThrow({
  where: { isActive: true, isAssignable: true },
});
const gram = await database.measurementUnit.findUniqueOrThrow({ where: { code: "g" } });
const mealType = await database.mealType.findFirstOrThrow({ where: { isActive: true } });
const alternateMealType = await database.mealType.findFirstOrThrow({
  where: { isActive: true, id: { not: mealType.id } },
});
const nutrient = await database.nutrient.findFirstOrThrow({ where: { code: "energy_kcal" } });
const excludedNutrient = await database.nutrient.findFirstOrThrow({
  where: { isActive: true, displayLevel: "EXTENDED", isTargetable: false },
});
const family = await database.family.create({
  data: { name: `Consumption ${marker}`, createdByUserId: owner.id, timeZone: "Europe/Kyiv" },
});
await database.familyMembership.createMany({
  data: [
    { familyId: family.id, userId: owner.id, role: "OWNER", status: "ACTIVE" },
    { familyId: family.id, userId: memberUser.id, role: "MEMBER", status: "ACTIVE" },
  ],
});
const [ownerMember, registeredMember, dependentMember] = await Promise.all([
  database.familyMember.create({ data: { familyId: family.id, personProfileId: ownerProfile.id } }),
  database.familyMember.create({
    data: { familyId: family.id, personProfileId: memberProfile.id },
  }),
  database.familyMember.create({
    data: { familyId: family.id, personProfileId: dependentProfile.id },
  }),
]);
const product = await database.product.create({
  data: {
    type: "GENERIC",
    nameEn: `Oats ${marker}`,
    nameUa: "Вівсянка",
    categoryId: category.id,
    defaultMeasurementUnitId: gram.id,
    status: "ACTIVE",
    nutrients: {
      create: [
        { nutrientId: nutrient.id, valuePer100g: 200, valueType: "ANALYTICAL" },
        {
          nutrientId: excludedNutrient.id,
          valuePer100g: 10,
          valueType: "ANALYTICAL",
        },
      ],
    },
  },
});
const recipe = await database.recipe.create({
  data: {
    title: `Запечена вівсянка ${marker}`,
    status: "PUBLISHED",
    visibility: "PUBLIC",
    yieldWeightG: 500,
    publishedAt: new Date(),
    nutrients: {
      create: [
        {
          nutrientId: nutrient.id,
          valueTotal: 1000,
          calculationMethod: "IMPORTED_SNAPSHOT",
          completeness: "UNVERIFIED",
          calculatedAt: new Date(),
        },
        {
          nutrientId: excludedNutrient.id,
          valueTotal: 50,
          calculationMethod: "IMPORTED_SNAPSHOT",
          completeness: "UNVERIFIED",
          calculatedAt: new Date(),
        },
      ],
    },
  },
});
const plan = await database.mealPlan.create({
  data: {
    familyId: family.id,
    weekStart: new Date("2026-08-31T00:00:00.000Z"),
    weekStartsOn: "MONDAY",
  },
});
const mealEntry = await database.mealEntry.create({
  data: {
    mealPlanId: plan.id,
    date: new Date("2026-09-01T00:00:00.000Z"),
    mealTypeId: mealType.id,
    productId: product.id,
    position: 1,
    preparedAt: new Date("2026-09-01T07:00:00.000Z"),
    preparedByUserId: owner.id,
    participants: {
      create: [
        {
          familyMemberId: ownerMember.id,
          quantity: 100,
          measurementUnitId: gram.id,
          quantityInGrams: 100,
        },
        {
          familyMemberId: registeredMember.id,
          quantity: 80,
          measurementUnitId: gram.id,
          quantityInGrams: 80,
        },
      ],
    },
  },
});
const ownerParticipant = await database.mealEntryParticipant.findFirstOrThrow({
  where: { mealEntryId: mealEntry.id, familyMemberId: ownerMember.id },
});
const registeredParticipant = await database.mealEntryParticipant.findFirstOrThrow({
  where: { mealEntryId: mealEntry.id, familyMemberId: registeredMember.id },
});
await database.bodyMeasurement.createMany({
  data: [
    {
      personProfileId: ownerProfile.id,
      weightKg: 70,
      measuredAt: new Date("2026-08-31T07:00:00.000Z"),
    },
    {
      personProfileId: ownerProfile.id,
      weightKg: 69.5,
      measuredAt: new Date("2026-09-01T07:00:00.000Z"),
    },
  ],
});
await database.nutrientTargetSet.create({
  data: {
    personProfileId: ownerProfile.id,
    source: "MANUAL",
    effectiveFrom: new Date("2026-08-01T00:00:00.000Z"),
    targets: {
      create: {
        nutrientId: nutrient.id,
        targetValue: 2000,
        source: "MANUAL",
      },
    },
  },
});

try {
  const pending = await repository.readDay({
    familyId: family.id,
    familyName: family.name,
    timeZone: family.timeZone,
    role: "OWNER",
    userId: owner.id,
    date: "2026-09-01",
  });
  assert.equal(pending.members.length, 3);
  assert.equal(
    pending.members.find((item) => item.memberId === ownerMember.id)?.items[0]?.status,
    "PENDING",
  );

  await repository.confirmPlanned({
    familyId: family.id,
    role: "OWNER",
    userId: owner.id,
    participantId: ownerParticipant.id,
  });
  let fact = await database.consumptionEntry.findUniqueOrThrow({
    where: { sourceMealEntryParticipantId: ownerParticipant.id },
    include: { nutrients: true },
  });
  assert.equal(fact.status, "CONFIRMED");
  assert.equal(fact.mealTypeId, mealType.id);
  assert.equal(fact.nutrients.length, 1);
  assert.equal(fact.nutrients[0]?.value.toNumber(), 200);
  assert.equal(
    await database.consumptionEntry.count({
      where: { sourceMealEntryParticipantId: ownerParticipant.id },
    }),
    1,
  );

  await repository.updateEntry({
    familyId: family.id,
    role: "OWNER",
    userId: owner.id,
    entryId: fact.id,
    expectedRevision: fact.revision,
    quantityGrams: 125,
    mealTypeId: mealType.id,
  });
  fact = await database.consumptionEntry.findUniqueOrThrow({
    where: { id: fact.id },
    include: { nutrients: true },
  });
  assert.equal(fact.quantityInGrams.toNumber(), 125);
  assert.equal(fact.nutrients[0]?.value.toNumber(), 250);
  assert.equal(
    (
      await database.mealConsumptionResolution.findUniqueOrThrow({
        where: { consumptionEntryId: fact.id },
      })
    ).outcome,
    "CHANGED",
  );

  await repository.voidEntry({
    familyId: family.id,
    role: "OWNER",
    userId: owner.id,
    entryId: fact.id,
    expectedRevision: fact.revision,
  });
  assert.equal(
    (await database.consumptionEntry.findUniqueOrThrow({ where: { id: fact.id } })).status,
    "VOIDED",
  );
  assert.equal(
    (
      await repository.readDay({
        familyId: family.id,
        familyName: family.name,
        timeZone: family.timeZone,
        role: "OWNER",
        userId: owner.id,
        date: "2026-09-01",
      })
    ).members.find((item) => item.memberId === ownerMember.id)?.items[0]?.status,
    "PENDING",
  );

  await repository.confirmPlanned({
    familyId: family.id,
    role: "OWNER",
    userId: owner.id,
    participantId: ownerParticipant.id,
  });
  fact = await database.consumptionEntry.findUniqueOrThrow({
    where: { id: fact.id },
    include: { nutrients: true },
  });
  assert.equal(fact.status, "CONFIRMED");
  assert.equal(fact.quantityInGrams.toNumber(), 125);
  assert.equal(fact.nutrients.length, 1);

  await repository.updateEntry({
    familyId: family.id,
    role: "OWNER",
    userId: owner.id,
    entryId: fact.id,
    expectedRevision: fact.revision,
    quantityGrams: 100,
    mealTypeId: alternateMealType.id,
  });
  fact = await database.consumptionEntry.findUniqueOrThrow({
    where: { id: fact.id },
    include: { nutrients: true },
  });
  assert.equal(fact.mealTypeId, alternateMealType.id);
  assert.equal(
    (
      await repository.readDay({
        familyId: family.id,
        familyName: family.name,
        timeZone: family.timeZone,
        role: "OWNER",
        userId: owner.id,
        date: "2026-09-01",
      })
    ).members.find((item) => item.memberId === ownerMember.id)?.items[0]?.status,
    "CHANGED",
  );

  await repository.skipPlanned({
    familyId: family.id,
    role: "OWNER",
    userId: owner.id,
    participantId: ownerParticipant.id,
  });
  assert.equal(
    (
      await repository.readDay({
        familyId: family.id,
        familyName: family.name,
        timeZone: family.timeZone,
        role: "OWNER",
        userId: owner.id,
        date: "2026-09-01",
      })
    ).members.find((item) => item.memberId === ownerMember.id)?.items[0]?.status,
    "SKIPPED",
  );
  await repository.restorePlanned({
    familyId: family.id,
    role: "OWNER",
    userId: owner.id,
    participantId: ownerParticipant.id,
  });
  assert.equal(
    (
      await repository.readDay({
        familyId: family.id,
        familyName: family.name,
        timeZone: family.timeZone,
        role: "OWNER",
        userId: owner.id,
        date: "2026-09-01",
      })
    ).members.find((item) => item.memberId === ownerMember.id)?.items[0]?.status,
    "PENDING",
  );

  await repository.addManual({
    familyId: family.id,
    role: "OWNER",
    userId: owner.id,
    memberId: dependentMember.id,
    date: "2026-08-20",
    kind: "product",
    foodId: product.id,
    mealTypeId: mealType.id,
    quantityGrams: 90,
  });
  assert.equal(
    await database.consumptionEntry.count({
      where: { familyMemberId: dependentMember.id, source: "MANUAL" },
    }),
    1,
  );

  await repository.addManual({
    familyId: family.id,
    role: "OWNER",
    userId: owner.id,
    memberId: dependentMember.id,
    date: "2026-08-20",
    kind: "recipe",
    foodId: recipe.id,
    mealTypeId: mealType.id,
    quantityGrams: 100,
  });
  const manualRecipe = await database.consumptionEntry.findFirstOrThrow({
    where: { familyMemberId: dependentMember.id, source: "MANUAL", recipeId: recipe.id },
    include: { nutrients: true },
  });
  assert.equal(manualRecipe.mealTypeId, mealType.id);
  assert.equal(manualRecipe.nutrients.length, 1);

  await repository.confirmPlanned({
    familyId: family.id,
    role: "OWNER",
    userId: owner.id,
    participantId: registeredParticipant.id,
  });
  assert.equal(
    (
      await database.consumptionEntry.findUniqueOrThrow({
        where: { sourceMealEntryParticipantId: registeredParticipant.id },
      })
    ).familyMemberId,
    registeredMember.id,
  );

  await assert.rejects(() =>
    repository.addManual({
      familyId: family.id,
      role: "MEMBER",
      userId: memberUser.id,
      memberId: dependentMember.id,
      date: "2026-08-20",
      kind: "product",
      foodId: product.id,
      mealTypeId: mealType.id,
      quantityGrams: 100,
    }),
  );

  const memberProjection = await repository.readDay({
    familyId: family.id,
    familyName: family.name,
    timeZone: family.timeZone,
    role: "MEMBER",
    userId: memberUser.id,
    date: "2026-09-01",
  });
  assert.deepEqual(
    memberProjection.members.map((item) => item.memberId),
    [registeredMember.id],
  );

  const dashboard = await repository.readDashboard({
    familyId: family.id,
    familyName: family.name,
    timeZone: family.timeZone,
    role: "OWNER",
    userId: owner.id,
    dates: ["2026-09-01", "2026-08-31"],
  });
  assert.deepEqual(dashboard.dates, ["2026-08-31", "2026-09-01"]);
  assert.equal(dashboard.members[0]?.memberId, ownerMember.id);
  assert.equal(dashboard.members[0]?.targets[0]?.targetValue, 4000);
  assert.equal(dashboard.members[0]?.weight.startKg, 70);
  assert.equal(dashboard.members[0]?.weight.endKg, 69.5);
  assert.equal(dashboard.members[0]?.weight.changeKg, -0.5);

  const memberDashboard = await repository.readDashboard({
    familyId: family.id,
    familyName: family.name,
    timeZone: family.timeZone,
    role: "MEMBER",
    userId: memberUser.id,
    dates: ["2026-09-01"],
  });
  assert.deepEqual(
    memberDashboard.members.map((item) => item.memberId),
    [registeredMember.id],
  );
  console.info("Consumption PostgreSQL integration test passed.");
} finally {
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
    throw new Error("Consumption test may use only local mealmind_test on port 54322");
  return url.toString();
}
