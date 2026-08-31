import assert from "node:assert/strict";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

import { createDatabaseClient } from "@mealmind/db";

import { ShoppingListConflictError } from "../application/shopping-list-errors.js";
import { createPrismaShoppingListRepository } from "./prisma-shopping-list-repository.js";

try {
  loadEnvFile(resolve(process.cwd(), "../../.env"));
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
}

const database = createDatabaseClient({
  connectionString: requireSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL),
  log: ["error"],
});
const repository = createPrismaShoppingListRepository(database);
const marker = crypto.randomUUID();
const owner = await database.user.create({
  data: { externalSubject: crypto.randomUUID(), email: `shopping-${marker}@example.test` },
});
const profile = await database.personProfile.create({
  data: { userId: owner.id, firstName: "Олена" },
});
const parentCategory = await database.productCategory.create({
  data: {
    code: `shop_group_${marker.slice(0, 8)}`,
    nameUa: "Бакалія",
    nameEn: "Grocery",
    kind: "GROUP",
    isAssignable: false,
    sortOrder: 900,
  },
});
const childCategory = await database.productCategory.create({
  data: {
    code: `shop_item_${marker.slice(0, 8)}`,
    nameUa: "Крупи",
    nameEn: "Grains",
    kind: "INGREDIENT",
    parentCategoryId: parentCategory.id,
    sortOrder: 901,
  },
});
const gramUnit = await database.measurementUnit.findFirstOrThrow({
  where: { dimension: "MASS", isBaseUnit: true, isActive: true },
});
const mealType = await database.mealType.findFirstOrThrow({ where: { isActive: true } });
const family = await database.family.create({
  data: { name: `Shopping ${marker}`, createdByUserId: owner.id, timeZone: "Europe/Kyiv" },
});
await database.familyMembership.create({
  data: { familyId: family.id, userId: owner.id, role: "OWNER", status: "ACTIVE" },
});
const member = await database.familyMember.create({
  data: { familyId: family.id, personProfileId: profile.id },
});
const [productA, productB] = await Promise.all([
  database.product.create({
    data: {
      type: "GENERIC",
      nameEn: `Flour ${marker}`,
      nameUa: "Борошно",
      categoryId: childCategory.id,
      defaultMeasurementUnitId: gramUnit.id,
      status: "ACTIVE",
    },
  }),
  database.product.create({
    data: {
      type: "GENERIC",
      nameEn: `Seeds ${marker}`,
      nameUa: "Насіння",
      categoryId: childCategory.id,
      defaultMeasurementUnitId: gramUnit.id,
      status: "ACTIVE",
    },
  }),
]);
const recipe = await database.recipe.create({
  data: {
    title: `Recipe ${marker}`,
    status: "PUBLISHED",
    visibility: "PUBLIC",
    familyId: family.id,
    createdByUserId: owner.id,
    baseServings: 2,
    // Навмисно не відповідає сумі інгредієнтів: shopping v1 її ігнорує.
    yieldWeightG: 9999,
    ingredients: {
      create: [
        {
          productId: productA.id,
          quantity: 200,
          measurementUnitId: gramUnit.id,
          gramWeight: 200,
          conversionMethod: "DIRECT_MASS",
          position: 1,
        },
        {
          productId: productB.id,
          quantity: 100,
          measurementUnitId: gramUnit.id,
          gramWeight: 100,
          conversionMethod: "DIRECT_MASS",
          isOptional: true,
          position: 2,
        },
      ],
    },
  },
  include: { ingredients: true },
});
const familyToday = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Kyiv",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const today = new Date(`${familyToday}T00:00:00.000Z`);
const weekStart = new Date(today);
weekStart.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
const periodStart = today.toISOString().slice(0, 10);
const periodEndDate = new Date(today);
periodEndDate.setUTCDate(today.getUTCDate() + Math.min(1, 6 - ((today.getUTCDay() + 6) % 7)));
const periodEnd = periodEndDate.toISOString().slice(0, 10);
const plan = await database.mealPlan.create({
  data: { familyId: family.id, weekStart, weekStartsOn: "MONDAY" },
});
await database.mealEntry.create({
  data: {
    mealPlanId: plan.id,
    date: today,
    mealTypeId: mealType.id,
    productId: productA.id,
    position: 1,
    participants: {
      create: {
        familyMemberId: member.id,
        quantity: 150,
        quantityInGrams: 150,
        measurementUnitId: gramUnit.id,
      },
    },
  },
});
const recipeEntry = await database.mealEntry.create({
  data: {
    mealPlanId: plan.id,
    date: today,
    mealTypeId: mealType.id,
    recipeId: recipe.id,
    position: 2,
    participants: {
      create: {
        familyMemberId: member.id,
        quantity: 600,
        quantityInGrams: 600,
        measurementUnitId: gramUnit.id,
      },
    },
  },
});

try {
  const created = await repository.generate({
    familyId: family.id,
    userId: owner.id,
    mealPlanId: plan.id,
    periodStart,
    periodEnd,
  });
  assert.equal(created.version, 1);
  assert.equal(created.items.length, 2);
  assert.equal(created.warnings.length, 0);
  const flour = created.items.find((item) => item.productId === productA.id);
  const optionalSeeds = created.items.find((item) => item.productId === productB.id);
  assert.equal(flour?.derivedQuantity, 550);
  assert.equal(optionalSeeds?.derivedQuantity, 200);
  assert.equal(flour?.groupCategory?.name, "Бакалія");
  assert.equal(flour?.sources.length, 2);

  await assert.rejects(
    () =>
      repository.generate({
        familyId: family.id,
        userId: owner.id,
        mealPlanId: plan.id,
        periodStart,
        periodEnd,
      }),
    ShoppingListConflictError,
  );

  const adjusted = await repository.updateItem({
    familyId: family.id,
    listId: created.id,
    itemId: flour!.id,
    expectedRevision: created.revision,
    requestedQuantity: 600,
  });
  assert.equal(adjusted.items.find((item) => item.id === flour!.id)?.derivedQuantity, 550);
  assert.equal(adjusted.items.find((item) => item.id === flour!.id)?.requestedQuantity, 600);

  const purchased = await repository.setItemStatus({
    familyId: family.id,
    listId: created.id,
    itemId: flour!.id,
    expectedRevision: adjusted.revision,
    status: "PURCHASED",
  });
  assert.equal(purchased.purchasedCount, 1);

  await database.mealEntryParticipant.update({
    where: {
      mealEntryId_familyMemberId: { mealEntryId: recipeEntry.id, familyMemberId: member.id },
    },
    data: { quantity: 300, quantityInGrams: 300 },
  });
  const stale = await repository.find(family.id, created.id);
  assert.equal(stale?.stale, true);
  const regenerated = await repository.regenerate({
    familyId: family.id,
    userId: owner.id,
    listId: created.id,
    expectedRevision: purchased.revision,
  });
  assert.equal(regenerated.version, 2);
  assert.equal(regenerated.purchasedCount, 0);
  assert.equal((await repository.find(family.id, created.id))?.status, "ARCHIVED");
  assert.equal(await repository.find(crypto.randomUUID(), regenerated.id), null);

  console.info("Shopping list PostgreSQL integration test passed.");
} finally {
  await database.shoppingList.deleteMany({ where: { familyId: family.id } });
  await database.mealPlan.delete({ where: { id: plan.id } });
  await database.recipe.delete({ where: { id: recipe.id } });
  await database.family.delete({ where: { id: family.id } });
  await database.product.deleteMany({ where: { id: { in: [productA.id, productB.id] } } });
  await database.productCategory.delete({ where: { id: childCategory.id } });
  await database.productCategory.delete({ where: { id: parentCategory.id } });
  await database.personProfile.delete({ where: { id: profile.id } });
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
  ) {
    throw new Error("Shopping list test may use only local mealmind_test on port 54322");
  }
  return url.toString();
}
