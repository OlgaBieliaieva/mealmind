import { describe, expect, it, vi } from "vitest";

import type { RecipeDetails, RecipeRepository } from "../domain/recipe-repository.js";
import { RecipeInvariantError } from "./recipe-errors.js";
import { createRecipeService } from "./recipe-service.js";

const recipe: RecipeDetails = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Суп",
  summary: null,
  description: null,
  status: "READY",
  visibility: "PUBLIC",
  difficulty: "EASY",
  recipeTypeId: null,
  recipeTypeName: null,
  authorId: null,
  authorName: null,
  author: null,
  baseServings: 2,
  yieldWeightG: "500",
  prepTimeMin: 10,
  cookTimeMin: 20,
  restTimeMin: null,
  publishedAt: null,
  archivedAt: null,
  updatedAt: "2026-08-06T00:00:00.000Z",
  ingredients: [
    {
      id: "00000000-0000-4000-8000-000000000002",
      productId: "00000000-0000-4000-8000-000000000003",
      productName: "Вода",
      quantity: "500",
      measurementUnitId: null,
      measurementUnitSymbol: null,
      productPortionId: null,
      gramWeight: "500",
      conversionMethod: "MANUAL",
      isOptional: false,
      position: 0,
    },
  ],
  steps: [
    {
      id: "00000000-0000-4000-8000-000000000004",
      position: 0,
      instruction: "Зварити",
      timerSeconds: null,
    },
  ],
  sources: [],
  cuisines: [],
  dietaryTags: [],
  videos: [],
  nutrients: [],
};

function repository(): RecipeRepository {
  return {
    list: vi.fn(async () => ({ items: [], page: 1, pageSize: 20, total: 0 })),
    findAdminById: vi.fn(async () => recipe),
    findPublicById: vi.fn(async () => recipe),
    resolveIngredients: vi.fn(async () => []),
    create: vi.fn(async () => recipe),
    update: vi.fn(async () => recipe),
    updateStatus: vi.fn(async (_id, status) => ({ ...recipe, status })),
  };
}

describe("recipe service", () => {
  it("keeps administrative details separate from the public read contract", async () => {
    const store = repository();
    const published = {
      ...recipe,
      status: "PUBLISHED" as const,
      publishedAt: "2026-08-06T00:00:00.000Z",
    };
    store.findAdminById = vi.fn(async () => published);
    store.findPublicById = vi.fn(async () => published);
    const service = createRecipeService(store);

    await expect(service.getAdmin(recipe.id)).resolves.toBe(published);
    const publicRecipe = await service.getPublic(recipe.id);
    expect(publicRecipe).toMatchObject({ id: recipe.id, publishedAt: published.publishedAt });
    expect(publicRecipe).not.toHaveProperty("status");
    expect(publicRecipe).not.toHaveProperty("visibility");
    expect(publicRecipe).not.toHaveProperty("authorId");
    expect(publicRecipe).not.toHaveProperty("archivedAt");
  });

  it("publishes only through the READY state", async () => {
    const store = repository();
    const service = createRecipeService(store);
    await expect(service.changeStatus(recipe.id, "PUBLISHED")).resolves.toMatchObject({
      status: "PUBLISHED",
    });
  });

  it("rejects an invalid lifecycle transition", async () => {
    const store = repository();
    store.findAdminById = vi.fn(async () => ({ ...recipe, status: "DRAFT" as const }));
    await expect(
      createRecipeService(store).changeStatus(recipe.id, "PUBLISHED"),
    ).rejects.toBeInstanceOf(RecipeInvariantError);
  });

  it("does not rewrite timestamps for an idempotent status change", async () => {
    const store = repository();
    const service = createRecipeService(store);

    await expect(service.changeStatus(recipe.id, recipe.status)).resolves.toBe(recipe);
    expect(store.updateStatus).not.toHaveBeenCalled();
  });
});
