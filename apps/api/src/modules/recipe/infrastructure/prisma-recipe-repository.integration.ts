import assert from "node:assert/strict";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";

import { createDatabaseClient } from "@mealmind/db";

import { RecipeConflictError } from "../application/recipe-errors.js";
import { createRecipeService } from "../application/recipe-service.js";
import { createPrismaRecipeRepository } from "./prisma-recipe-repository.js";

try {
  loadEnvFile(resolve(process.cwd(), "../../.env"));
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
}

const database = createDatabaseClient({
  connectionString: requireSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL),
  log: ["error"],
});
const repository = createPrismaRecipeRepository(database);
const service = createRecipeService(repository);
const userId = crypto.randomUUID();
const productId = crypto.randomUUID();
let recipeId: string | undefined;

try {
  const [category, gram, nutrient] = await Promise.all([
    database.productCategory.findFirstOrThrow({ where: { isAssignable: true, isActive: true } }),
    database.measurementUnit.findFirstOrThrow({ where: { code: "g", isActive: true } }),
    database.nutrient.findFirstOrThrow({ where: { code: "energy_kcal", isActive: true } }),
  ]);
  await database.user.create({
    data: {
      id: userId,
      externalSubject: crypto.randomUUID(),
      email: `recipe-${userId}@example.com`,
      applicationRole: "ADMIN",
    },
  });
  await database.product.create({
    data: {
      id: productId,
      type: "GENERIC",
      nameEn: "Integration ingredient",
      categoryId: category.id,
      defaultMeasurementUnitId: gram.id,
      status: "ACTIVE",
      nutrients: {
        create: { nutrientId: nutrient.id, valuePer100g: "52", valueType: "ANALYTICAL" },
      },
    },
  });

  const created = await service.create(
    {
      title: `Integration recipe ${crypto.randomUUID()}`,
      visibility: "PUBLIC",
      baseServings: 2,
      yieldWeightG: "200",
      ingredients: [{ productId, quantity: "200", measurementUnitId: gram.id, isOptional: false }],
      steps: [{ instruction: "Перший крок" }, { instruction: "Другий крок", timerSeconds: 60 }],
      sources: [],
      cuisineIds: [],
      dietaryTagIds: [],
      videos: [],
    },
    userId,
  );
  recipeId = created.id;
  assert.deepEqual(
    created.steps.map((step) => step.position),
    [1, 2],
  );
  assert.equal(created.nutrients[0]?.valueTotal, "104");
  assert.equal(created.nutrients[0]?.valuePerServing, "52");

  await assert.rejects(
    repository.update(
      created.id,
      {
        title: "Must roll back",
        sources: [
          { kind: "WEB_PAGE", url: "https://example.com/source" },
          { kind: "OTHER", url: "https://example.com/source" },
        ],
      },
      userId,
    ),
    RecipeConflictError,
  );
  assert.equal((await repository.findAdminById(created.id))?.title, created.title);

  await service.changeStatus(created.id, "READY");
  await service.changeStatus(created.id, "PUBLISHED");
  assert.equal((await repository.findPublicById(created.id))?.status, "PUBLISHED");

  const updated = await service.update(
    created.id,
    {
      steps: [{ instruction: "Оновлений перший" }, { instruction: "Оновлений другий" }],
    },
    userId,
  );
  assert.deepEqual(
    updated.steps.map((step) => [step.position, step.instruction]),
    [
      [1, "Оновлений перший"],
      [2, "Оновлений другий"],
    ],
  );

  const publishedAt = updated.publishedAt;
  assert.notEqual(publishedAt, null);
  await service.changeStatus(created.id, "ARCHIVED");
  assert.equal(await repository.findPublicById(created.id), null);
  const archived = await repository.findAdminById(created.id);
  assert.equal(archived?.publishedAt, publishedAt);
  assert.notEqual(archived?.archivedAt, null);

  console.info("Recipe repository PostgreSQL integration test passed.");
} finally {
  if (recipeId !== undefined) await database.recipe.deleteMany({ where: { id: recipeId } });
  await database.product.deleteMany({ where: { id: productId } });
  await database.user.deleteMany({ where: { id: userId } });
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
  ) {
    throw new Error("Recipe repository test may use only local mealmind_test on port 54322");
  }
  return url.toString();
}
