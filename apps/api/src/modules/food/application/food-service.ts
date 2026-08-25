import type { ActiveFamilyContextResolver } from "../../../application/family-context/active-family-context.js";
import { FoodNotFoundError } from "./food-errors.js";
import type {
  FoodKind,
  FoodRepository,
  FoodSearchQuery,
  ProductFoodDetails,
  RecipeFoodDetails,
} from "../domain/food-repository.js";
import {
  thumbnailObjectPath,
  type ProductMediaStorage,
} from "../../product/domain/product-media-storage.js";
import {
  recipeThumbnailObjectPath,
  type RecipeMediaStorage,
} from "../../recipe/domain/recipe-media-storage.js";
import type { AuthorAvatarStorage } from "../../reference/domain/author-avatar-storage.js";

export interface FoodService {
  search(userId: string, query: FoodSearchQuery): ReturnType<FoodRepository["search"]>;
  getProduct(userId: string, id: string): Promise<ProductFoodDetails>;
  getRecipe(userId: string, id: string): Promise<RecipeFoodDetails>;
  addFavorite(userId: string, kind: FoodKind, id: string): Promise<{ readonly isFavorite: true }>;
  removeFavorite(userId: string, kind: FoodKind, id: string): Promise<void>;
}

export function createFoodService(
  repository: FoodRepository,
  familyContextResolver: ActiveFamilyContextResolver,
  mediaStorage?: {
    readonly products: ProductMediaStorage;
    readonly recipes: RecipeMediaStorage;
    readonly authorAvatars?: AuthorAvatarStorage;
  },
): FoodService {
  async function familyId(userId: string): Promise<string> {
    return (await familyContextResolver.resolve(userId)).id;
  }

  const service: FoodService = {
    async search(userId, query) {
      const result = await repository.search(await familyId(userId), query);
      const items = await Promise.all(
        result.items.map(async (source) => {
          const { imageObjectPath, ...item } = source;
          if (!imageObjectPath || !mediaStorage) return item;

          try {
            const imageUrl =
              source.kind === "product"
                ? await mediaStorage.products.createReadUrl(thumbnailObjectPath(imageObjectPath))
                : await mediaStorage.recipes.createReadUrl(
                    recipeThumbnailObjectPath(imageObjectPath),
                  );
            return { ...item, imageUrl };
          } catch {
            // Відсутня мініатюра не повинна робити каталог недоступним.
            return item;
          }
        }),
      );
      return { ...result, items };
    },
    async getProduct(userId, id) {
      const result = await repository.findProduct(await familyId(userId), id);

      if (!result) throw new FoodNotFoundError();

      const { imageObjectPath, ...product } = result;
      const relatedRecipes = await Promise.all(
        result.relatedRecipes.map(async (source) => {
          const { imageObjectPath: recipeImagePath, ...recipe } = source;
          return {
            ...recipe,
            imageUrl: await safeReadUrl(
              mediaStorage?.recipes,
              recipeImagePath ? recipeThumbnailObjectPath(recipeImagePath) : null,
            ),
          };
        }),
      );
      return {
        ...product,
        imageUrl: await safeReadUrl(mediaStorage?.products, imageObjectPath ?? null),
        relatedRecipes,
      };
    },
    async getRecipe(userId, id) {
      const result = await repository.findRecipe(await familyId(userId), id);

      if (!result) throw new FoodNotFoundError();

      const { imageObjectPath, ...recipe } = result;
      const sourceAuthor = result.author;
      const author = sourceAuthor
        ? await (async () => {
            const { avatarObjectPath, ...authorData } = sourceAuthor;
            return {
              ...authorData,
              avatarUrl: await safeReadUrl(mediaStorage?.authorAvatars, avatarObjectPath ?? null),
            };
          })()
        : null;
      const [ingredients, images] = await Promise.all([
        Promise.all(
          result.ingredients.map(async (source) => {
            const { imageObjectPath: productImagePath, ...ingredient } = source;
            return {
              ...ingredient,
              imageUrl: await safeReadUrl(
                mediaStorage?.products,
                productImagePath ? thumbnailObjectPath(productImagePath) : null,
              ),
            };
          }),
        ),
        Promise.all(
          result.images.map(async (source) => {
            const { imageObjectPath: mediaPath, ...image } = source;
            return {
              ...image,
              imageUrl: await safeReadUrl(mediaStorage?.recipes, mediaPath ?? null),
            };
          }),
        ),
      ]);
      return {
        ...recipe,
        author,
        imageUrl: await safeReadUrl(mediaStorage?.recipes, imageObjectPath ?? null),
        ingredients,
        images,
      };
    },
    async addFavorite(userId, kind, id) {
      const created = await repository.addFavorite(await familyId(userId), userId, kind, id);

      if (!created) throw new FoodNotFoundError();

      return { isFavorite: true as const };
    },
    async removeFavorite(userId, kind, id) {
      const removed = await repository.removeFavorite(await familyId(userId), kind, id);

      if (!removed) throw new FoodNotFoundError();
    },
  };

  return Object.freeze(service);
}

async function safeReadUrl(
  storage:
    | Pick<ProductMediaStorage | RecipeMediaStorage | AuthorAvatarStorage, "createReadUrl">
    | undefined,
  objectPath: string | null,
): Promise<string | null> {
  if (!storage || !objectPath) return null;
  try {
    return await storage.createReadUrl(objectPath);
  } catch {
    return null;
  }
}
