import assert from "node:assert/strict";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

import { createDatabaseClient } from "@mealmind/db";

import type { FoodSearchQuery } from "../domain/food-repository.js";
import { createPrismaFoodRepository } from "./prisma-food-repository.js";

try {
  loadEnvFile(resolve(process.cwd(), "../../.env"));
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
}

const database = createDatabaseClient({
  connectionString: requireSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL),
  log: ["error"],
});
const repository = createPrismaFoodRepository(database);
const emptyFilters = {
  difficulty: null,
  recipeTypeId: null,
  authorId: null,
  ingredientId: null,
  cuisineId: null,
  dietaryTagId: null,
} as const;

try {
  const latest = await repository.search(crypto.randomUUID(), {
    ...emptyFilters,
    query: "",
    type: "recipe",
    favoritesOnly: false,
    page: 1,
    pageSize: 10,
  });
  assert.ok(Array.isArray(latest.items));

  const filtered: FoodSearchQuery = {
    query: "",
    type: "recipe",
    favoritesOnly: false,
    difficulty: "EASY",
    recipeTypeId: crypto.randomUUID(),
    authorId: crypto.randomUUID(),
    ingredientId: crypto.randomUUID(),
    cuisineId: crypto.randomUUID(),
    dietaryTagId: crypto.randomUUID(),
    page: 1,
    pageSize: 10,
  };
  assert.ok(Array.isArray((await repository.search(crypto.randomUUID(), filtered)).items));

  assert.ok(
    Array.isArray(
      (
        await repository.search(crypto.randomUUID(), {
          ...emptyFilters,
          query: "інтеграційний",
          type: "all",
          favoritesOnly: false,
          page: 1,
          pageSize: 20,
        })
      ).items,
    ),
  );

  console.info("Food search PostgreSQL integration test passed.");
} finally {
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
    throw new Error("Food repository test may use only local mealmind_test on port 54322");
  }
  return url.toString();
}
