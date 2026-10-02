import { describe, expect, it, vi } from "vitest";

import type { RecipeDetails, RecipeRepository } from "../domain/recipe-repository.js";
import type { RecipeMediaStorage } from "../domain/recipe-media-storage.js";
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
  images: [],
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
    createPendingMedia: vi.fn(),
    findMedia: vi.fn(async () => null),
    activateMedia: vi.fn(async () => null),
    markMediaFailed: vi.fn(async () => undefined),
    archiveMedia: vi.fn(async () => undefined),
  };
}

describe("recipe service", () => {
  it("returns a signed thumbnail for the primary image in the admin list", async () => {
    const store = repository();
    const primaryImage = {
      id: "00000000-0000-4000-8000-000000000005",
      recipeId: recipe.id,
      status: "ACTIVE" as const,
      storageObjectPath: "recipes/primary.webp",
      mimeType: "image/webp",
      byteSize: "1024",
      widthPx: 1200,
      heightPx: 800,
      checksumSha256: "a".repeat(64),
      altTextUa: "Суп",
      altTextEn: null,
      isPrimary: true,
      sortOrder: 0,
      createdAt: "2026-08-06T00:00:00.000Z",
    };
    store.list = vi.fn(async () => ({
      items: [
        {
          id: recipe.id,
          title: recipe.title,
          status: recipe.status,
          visibility: recipe.visibility,
          difficulty: recipe.difficulty,
          recipeTypeName: recipe.recipeTypeName,
          authorName: recipe.authorName,
          baseServings: recipe.baseServings,
          updatedAt: recipe.updatedAt,
          primaryImage,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    }));
    const storage: RecipeMediaStorage = {
      createUploadUrl: vi.fn(),
      createReadUrl: vi.fn(async (path) => `https://storage.example/${path}`),
      read: vi.fn(),
      write: vi.fn(),
      remove: vi.fn(),
    };

    const page = await createRecipeService(store, storage).list({ page: 1, pageSize: 20 });

    expect(page.items[0]?.primaryImage?.thumbnailUrl).toBe(
      "https://storage.example/recipes/primary.webp.thumbnail.webp",
    );
  });

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

    await expect(service.getAdmin(recipe.id)).resolves.toEqual(published);
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

    await expect(service.changeStatus(recipe.id, recipe.status)).resolves.toEqual(recipe);
    expect(store.updateStatus).not.toHaveBeenCalled();
  });
});
