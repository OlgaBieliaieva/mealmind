import { describe, expect, it, vi } from "vitest";

import type { ActiveFamilyContextResolver } from "../../../application/family-context/active-family-context.js";
import type { FoodRepository } from "../domain/food-repository.js";
import type { ProductMediaStorage } from "../../product/domain/product-media-storage.js";
import type { RecipeMediaStorage } from "../../recipe/domain/recipe-media-storage.js";
import { FoodNotFoundError } from "./food-errors.js";
import { createFoodService } from "./food-service.js";

function dependencies() {
  const repository: FoodRepository = {
    search: vi.fn(async () => ({ items: [], page: 1, pageSize: 20, total: 0 })),
    findProduct: vi.fn(async () => null),
    findRecipe: vi.fn(async () => null),
    addFavorite: vi.fn(async () => true),
    removeFavorite: vi.fn(async () => true),
  };
  const familyContext: ActiveFamilyContextResolver = {
    resolve: vi.fn(
      async () =>
        ({
          id: "family-id",
          name: "Родина",
          timeZone: "Europe/Kyiv",
          weekStartsOn: "MONDAY",
          role: "OWNER",
        }) as const,
    ),
  };
  return { repository, familyContext };
}

describe("food service", () => {
  it("always scopes search and favorites to the authenticated active family", async () => {
    const { repository, familyContext } = dependencies();
    const service = createFoodService(repository, familyContext);
    const query = {
      query: "яблуко",
      type: "all" as const,
      favoritesOnly: false,
      difficulty: null,
      recipeTypeId: null,
      authorId: null,
      ingredientId: null,
      cuisineId: null,
      dietaryTagId: null,
      page: 1,
      pageSize: 20,
    };

    await service.search("user-id", query);
    await service.addFavorite("user-id", "product", "product-id");

    expect(repository.search).toHaveBeenCalledWith("family-id", query);
    expect(repository.addFavorite).toHaveBeenCalledWith(
      "family-id",
      "user-id",
      "product",
      "product-id",
    );
  });

  it("returns the stable not-found error when food is not visible", async () => {
    const { repository, familyContext } = dependencies();
    await expect(
      createFoodService(repository, familyContext).getProduct("user-id", "hidden-id"),
    ).rejects.toBeInstanceOf(FoodNotFoundError);
  });

  it("returns a signed thumbnail URL without exposing the storage object path", async () => {
    const { repository, familyContext } = dependencies();
    vi.mocked(repository.search).mockResolvedValue({
      items: [
        {
          kind: "product",
          id: "product-id",
          name: "Яблуко",
          category: { id: "category-id", code: "fruits", name: "Фрукти" },
          brandName: null,
          imageObjectPath: "products/product-id/original.webp",
          imageUrl: null,
          nutrition: {
            basis: "PER_100G",
            energyKcal: 52,
            proteinG: 0.3,
            fatG: 0.2,
            carbohydrateG: 14,
          },
          isFavorite: false,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    const productStorage = storage("https://storage.test/product.webp");
    const recipeStorage = storage("https://storage.test/recipe.webp");
    const service = createFoodService(repository, familyContext, {
      products: productStorage,
      recipes: recipeStorage,
    });

    const result = await service.search("user-id", {
      query: "яблуко",
      type: "product",
      favoritesOnly: false,
      difficulty: null,
      recipeTypeId: null,
      authorId: null,
      ingredientId: null,
      cuisineId: null,
      dietaryTagId: null,
      page: 1,
      pageSize: 20,
    });

    expect(productStorage.createReadUrl).toHaveBeenCalledWith(
      "products/product-id/original.webp.thumbnail.webp",
    );
    expect(result.items[0]).toMatchObject({ imageUrl: "https://storage.test/product.webp" });
    expect(result.items[0]).not.toHaveProperty("imageObjectPath");
  });
});

function storage(readUrl: string): ProductMediaStorage & RecipeMediaStorage {
  return {
    createUploadUrl: vi.fn(async () => ({ uploadUrl: "", token: "" })),
    createReadUrl: vi.fn(async () => readUrl),
    read: vi.fn(async () => Buffer.from([])),
    write: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  };
}
