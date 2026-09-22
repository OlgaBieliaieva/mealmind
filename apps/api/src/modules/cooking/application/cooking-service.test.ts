import { describe, expect, it, vi } from "vitest";

import type { ActiveFamilyContextResolver } from "../../../application/family-context/active-family-context.js";
import type { RecipeMediaStorage } from "../../recipe/domain/recipe-media-storage.js";
import type { CookingRepository, CookingSessionView } from "../domain/cooking-repository.js";
import { createCookingService } from "./cooking-service.js";

const session: CookingSessionView = {
  id: "session-id",
  recipeId: "recipe-id",
  status: "IN_PROGRESS",
  revision: 0,
  startedAt: "2026-09-23T08:00:00.000Z",
  completedAt: null,
  cancelledAt: null,
  recipe: {
    title: "Рагу",
    summary: null,
    description: null,
    difficulty: "EASY",
    prepTimeMin: 10,
    cookTimeMin: 30,
    restTimeMin: null,
    imageObjectPath: "recipes/recipe-id/image.webp",
  },
  planEntries: [],
  ingredients: [],
  steps: [],
  progress: { resolvedIngredients: 0, totalIngredients: 0, resolvedSteps: 0, totalSteps: 0 },
  nutrition: { basis: "PLANNED_ESTIMATE", completeness: "COMPLETE", nutrients: [] },
  yield: {
    plannedWeightG: 500,
    actualWeightG: null,
    method: null,
    tareWeightG: null,
    grossWeightG: null,
  },
  hasCookingProgress: false,
  canComplete: true,
};

function dependencies() {
  const repository: CookingRepository = {
    start: vi.fn(async () => session),
    find: vi.fn(async () => session),
    updateIngredient: vi.fn(async () => session),
    addIngredient: vi.fn(async () => session),
    deleteIngredient: vi.fn(async () => session),
    updateStep: vi.fn(async () => session),
    updateYield: vi.fn(async () => session),
    complete: vi.fn(async () => session),
    cancel: vi.fn(async () => session),
  };
  const familyContext: ActiveFamilyContextResolver = {
    resolve: vi.fn(
      async () =>
        ({
          id: "family-id",
          name: "Родина",
          timeZone: "Europe/Kyiv",
          weekStartsOn: "MONDAY",
          role: "MEMBER",
        }) as const,
    ),
  };
  const mediaStorage: RecipeMediaStorage = {
    createUploadUrl: vi.fn(),
    createReadUrl: vi.fn(async () => "https://storage.test/recipe.webp"),
    read: vi.fn(),
    write: vi.fn(),
    remove: vi.fn(),
  };
  return { repository, familyContext, mediaStorage };
}

describe("cooking service", () => {
  it("scopes reads to the active family and returns a signed image URL", async () => {
    const { repository, familyContext, mediaStorage } = dependencies();
    const result = await createCookingService(repository, familyContext, mediaStorage).find(
      "user-id",
      "session-id",
    );

    expect(repository.find).toHaveBeenCalledWith(
      { userId: "user-id", familyId: "family-id", role: "MEMBER" },
      "session-id",
    );
    expect(mediaStorage.createReadUrl).toHaveBeenCalledWith("recipes/recipe-id/image.webp");
    expect(result.recipe).toMatchObject({
      title: "Рагу",
      imageUrl: "https://storage.test/recipe.webp",
    });
    expect(result.recipe).not.toHaveProperty("imageObjectPath");
  });

  it("keeps Cooking Mode available when the image cannot be signed", async () => {
    const { repository, familyContext, mediaStorage } = dependencies();
    vi.mocked(mediaStorage.createReadUrl).mockRejectedValue(new Error("Storage unavailable"));

    const result = await createCookingService(repository, familyContext, mediaStorage).find(
      "user-id",
      "session-id",
    );

    expect(result.recipe.imageUrl).toBeNull();
  });
});
