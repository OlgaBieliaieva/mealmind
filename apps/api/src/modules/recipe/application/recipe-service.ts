import { createHash, randomUUID } from "node:crypto";

import sharp from "sharp";

import {
  calculateRecipeNutrition,
  type RecipeNutritionCalculation,
} from "./recipe-nutrition-calculator.js";
import {
  RecipeInvariantError,
  RecipeMediaNotFoundError,
  RecipeMediaProcessingError,
  RecipeNotFoundError,
} from "./recipe-errors.js";
import {
  recipeThumbnailObjectPath,
  type RecipeMediaStorage,
} from "../domain/recipe-media-storage.js";
import type {
  RecipeDetails,
  RecipeIngredientInput,
  RecipeListQuery,
  RecipeMediaRecord,
  RecipeMutationData,
  RecipePage,
  PublicRecipeDetails,
  RecipeRepository,
  RecipeStatus,
  RecipeUpdate,
  RecipeUpdateData,
  RecipeWrite,
} from "../domain/recipe-repository.js";

export const RECIPE_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const RECIPE_MEDIA_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export interface RecipeImageView extends RecipeMediaRecord {
  readonly url: string | null;
  readonly thumbnailUrl: string | null;
}

export interface RecipeDetailsView extends Omit<RecipeDetails, "images"> {
  readonly images: readonly RecipeImageView[];
}

export interface PublicRecipeDetailsView extends Omit<PublicRecipeDetails, "images"> {
  readonly images: readonly RecipeImageView[];
}

export interface RecipeNutritionPreview extends RecipeNutritionCalculation {
  readonly totalIngredientWeightG: string;
}

export interface RecipeService {
  list(query: RecipeListQuery): Promise<RecipePage>;
  getAdmin(id: string): Promise<RecipeDetailsView>;
  getPublic(id: string): Promise<PublicRecipeDetailsView>;
  preview(ingredients: readonly RecipeIngredientInput[]): Promise<RecipeNutritionPreview>;
  create(input: RecipeWrite, actorUserId: string): Promise<RecipeDetailsView>;
  update(id: string, input: RecipeUpdate, actorUserId: string): Promise<RecipeDetailsView>;
  changeStatus(id: string, status: RecipeStatus): Promise<RecipeDetailsView>;
  reserveMedia(
    recipeId: string,
    input: {
      readonly mimeType: (typeof RECIPE_MEDIA_ALLOWED_MIME_TYPES)[number];
      readonly byteSize: number;
      readonly altTextUa?: string | null | undefined;
    },
    actorUserId: string,
  ): Promise<{
    readonly media: RecipeMediaRecord;
    readonly uploadUrl: string;
    readonly token: string;
  }>;
  completeMedia(recipeId: string, mediaId: string): Promise<RecipeImageView>;
  deleteMedia(recipeId: string, mediaId: string): Promise<void>;
}

export function createRecipeService(
  repository: RecipeRepository,
  storage: RecipeMediaStorage = unavailableStorage,
): RecipeService {
  const service: RecipeService = {
    list: (query) => repository.list(query),

    async getAdmin(id) {
      const recipe = await repository.findAdminById(id);
      if (recipe === null) throw new RecipeNotFoundError();
      return presentRecipe(storage, recipe);
    },

    async getPublic(id) {
      const recipe = await repository.findPublicById(id);
      if (recipe === null) throw new RecipeNotFoundError();
      return presentPublicRecipe(await presentRecipe(storage, recipe));
    },

    async preview(ingredients) {
      const resolved = await repository.resolveIngredients(ingredients);
      const calculation = calculateRecipeNutrition(resolved);
      return Object.freeze({
        ...calculation,
        totalIngredientWeightG: decimalString(
          resolved
            .filter((ingredient) => !ingredient.isOptional)
            .reduce((sum, ingredient) => sum + Number(ingredient.gramWeight), 0),
        ),
      });
    },

    async create(input, actorUserId) {
      assertRecipeContent(input);
      const ingredients = await repository.resolveIngredients(input.ingredients);
      const calculation = calculateRecipeNutrition(ingredients);
      const data: RecipeMutationData = {
        ...input,
        ingredients,
        nutrients: calculation.nutrients,
        ingredientFingerprint: calculation.inputFingerprint,
      };
      return presentRecipe(storage, await repository.create(data, actorUserId));
    },

    async update(id, input, actorUserId) {
      const existing = await repository.findAdminById(id);
      if (existing === null) throw new RecipeNotFoundError();
      const current = detailsAsWrite(existing);
      assertRecipeContent({
        ...current,
        ...input,
        title: input.title ?? current.title,
        visibility: input.visibility ?? current.visibility,
        ingredients: input.ingredients ?? current.ingredients,
        steps: input.steps ?? current.steps,
        sources: input.sources ?? current.sources,
        cuisineIds: input.cuisineIds ?? current.cuisineIds,
        dietaryTagIds: input.dietaryTagIds ?? current.dietaryTagIds,
        videos: input.videos ?? current.videos,
      });

      const { ingredients: ingredientInput, ...unchangedInput } = input;
      let data: RecipeUpdateData = { ...unchangedInput };
      if (ingredientInput !== undefined) {
        const ingredients = await repository.resolveIngredients(ingredientInput);
        const calculation = calculateRecipeNutrition(ingredients);
        data = {
          ...data,
          ingredients,
          nutrients: calculation.nutrients,
          ingredientFingerprint: calculation.inputFingerprint,
        };
      }

      const updated = await repository.update(id, data, actorUserId);
      if (updated === null) throw new RecipeNotFoundError();
      return presentRecipe(storage, updated);
    },

    async changeStatus(id, status) {
      const existing = await repository.findAdminById(id);
      if (existing === null) throw new RecipeNotFoundError();
      assertStatusTransition(existing, status);
      if (existing.status === status) return presentRecipe(storage, existing);
      const updated = await repository.updateStatus(id, status);
      if (updated === null) throw new RecipeNotFoundError();
      return presentRecipe(storage, updated);
    },

    async reserveMedia(recipeId, input, actorUserId) {
      if (!RECIPE_MEDIA_ALLOWED_MIME_TYPES.includes(input.mimeType)) {
        throw new RecipeInvariantError("Unsupported recipe image MIME type");
      }
      if (input.byteSize < 1 || input.byteSize > RECIPE_MEDIA_MAX_BYTES) {
        throw new RecipeInvariantError("Recipe image exceeds the allowed size");
      }
      if ((await repository.findAdminById(recipeId)) === null) throw new RecipeNotFoundError();

      const mediaId = randomUUID();
      const extension = input.mimeType === "image/jpeg" ? "jpg" : input.mimeType.split("/")[1];
      const storageObjectPath = `recipes/${recipeId}/${mediaId}/original.${extension}`;
      const { uploadUrl, token } = await storage.createUploadUrl(storageObjectPath);
      const media = await repository.createPendingMedia({
        id: mediaId,
        recipeId,
        storageObjectPath,
        mimeType: input.mimeType,
        byteSize: input.byteSize,
        altTextUa: input.altTextUa,
        actorUserId,
      });
      return Object.freeze({ media, uploadUrl, token });
    },

    async completeMedia(recipeId, mediaId) {
      const media = await requireRecipeMedia(repository, recipeId, mediaId);
      if (media.status !== "PENDING") {
        throw new RecipeInvariantError("Only a pending recipe image can be completed");
      }
      const thumbnailPath = recipeThumbnailObjectPath(media.storageObjectPath);
      try {
        const original = await storage.read(media.storageObjectPath);
        if (
          original.byteLength < 1 ||
          original.byteLength > RECIPE_MEDIA_MAX_BYTES ||
          (media.byteSize !== null && original.byteLength !== Number(media.byteSize))
        ) {
          throw new RecipeMediaProcessingError("Stored recipe image has an invalid size");
        }
        const image = sharp(original, { failOn: "error", limitInputPixels: 40_000_000 }).rotate();
        const metadata = await image.metadata();
        const detectedMimeType = mimeTypeForFormat(metadata.format);
        if (
          detectedMimeType !== media.mimeType ||
          metadata.width === undefined ||
          metadata.height === undefined
        ) {
          throw new RecipeMediaProcessingError(
            "Stored object does not match the declared image type",
          );
        }
        const thumbnail = await image
          .clone()
          .resize({ width: 720, height: 480, fit: "cover", withoutEnlargement: true })
          .webp({ quality: 84 })
          .toBuffer();
        await storage.write(thumbnailPath, thumbnail, "image/webp");
        const activated = await repository.activateMedia(mediaId, {
          widthPx: metadata.width,
          heightPx: metadata.height,
          checksumSha256: createHash("sha256").update(original).digest("hex"),
        });
        if (activated === null) throw new RecipeMediaNotFoundError();
        return presentImage(storage, activated);
      } catch (error) {
        await Promise.allSettled([
          storage.remove([media.storageObjectPath, thumbnailPath]),
          repository.markMediaFailed(mediaId),
        ]);
        if (error instanceof RecipeMediaProcessingError) throw error;
        throw new RecipeMediaProcessingError("Recipe image processing failed", error);
      }
    },

    async deleteMedia(recipeId, mediaId) {
      const media = await requireRecipeMedia(repository, recipeId, mediaId);
      await repository.markMediaFailed(mediaId);
      await storage.remove([
        media.storageObjectPath,
        recipeThumbnailObjectPath(media.storageObjectPath),
      ]);
      await repository.archiveMedia(mediaId);
    },
  };
  return Object.freeze(service);
}

function assertRecipeContent(input: RecipeWrite): void {
  if (input.ingredients.length === 0) {
    throw new RecipeInvariantError("Recipe must contain at least one ingredient");
  }
  if (input.steps.length === 0) {
    throw new RecipeInvariantError("Recipe must contain at least one step");
  }
  if (input.baseServings === null || input.baseServings === undefined) {
    throw new RecipeInvariantError("Recipe base servings are required");
  }
  if (input.visibility === "FAMILY") {
    throw new RecipeInvariantError("Family-owned recipes are introduced with family lifecycle");
  }
}

function assertStatusTransition(recipe: RecipeDetails, target: RecipeStatus): void {
  if (recipe.status === target) return;
  const allowed: Readonly<Record<RecipeStatus, readonly RecipeStatus[]>> = {
    DRAFT: ["READY"],
    READY: ["DRAFT", "PUBLISHED"],
    PUBLISHED: ["ARCHIVED"],
    ARCHIVED: ["DRAFT"],
  };
  if (!allowed[recipe.status].includes(target)) {
    throw new RecipeInvariantError(`Recipe cannot transition from ${recipe.status} to ${target}`);
  }
  if (target === "PUBLISHED") {
    if (recipe.visibility !== "PUBLIC") {
      throw new RecipeInvariantError("Only a public recipe can be published");
    }
    if (recipe.ingredients.length === 0 || recipe.steps.length === 0) {
      throw new RecipeInvariantError("Recipe content is incomplete");
    }
  }
}

function detailsAsWrite(recipe: RecipeDetails): RecipeWrite {
  return {
    title: recipe.title,
    summary: recipe.summary,
    description: recipe.description,
    visibility: recipe.visibility,
    difficulty: recipe.difficulty,
    recipeTypeId: recipe.recipeTypeId,
    authorId: recipe.authorId,
    baseServings: recipe.baseServings,
    yieldWeightG: recipe.yieldWeightG,
    prepTimeMin: recipe.prepTimeMin,
    cookTimeMin: recipe.cookTimeMin,
    restTimeMin: recipe.restTimeMin,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    sources: recipe.sources,
    cuisineIds: recipe.cuisines.map((item) => item.id),
    dietaryTagIds: recipe.dietaryTags.map((item) => item.id),
    videos: recipe.videos,
  };
}

function decimalString(value: number): string {
  return value.toFixed(4).replace(/\.?0+$/, "");
}

function presentPublicRecipe(recipe: RecipeDetailsView): PublicRecipeDetailsView {
  if (recipe.publishedAt === null) throw new RecipeNotFoundError();
  return Object.freeze({
    id: recipe.id,
    title: recipe.title,
    summary: recipe.summary,
    description: recipe.description,
    difficulty: recipe.difficulty,
    recipeTypeName: recipe.recipeTypeName,
    authorName: recipe.authorName,
    author: recipe.author,
    baseServings: recipe.baseServings,
    yieldWeightG: recipe.yieldWeightG,
    prepTimeMin: recipe.prepTimeMin,
    cookTimeMin: recipe.cookTimeMin,
    restTimeMin: recipe.restTimeMin,
    publishedAt: recipe.publishedAt,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    sources: recipe.sources,
    cuisines: recipe.cuisines,
    dietaryTags: recipe.dietaryTags,
    videos: recipe.videos,
    images: recipe.images,
    nutrients: recipe.nutrients,
  });
}

async function presentRecipe(
  storage: RecipeMediaStorage,
  recipe: RecipeDetails,
): Promise<RecipeDetailsView> {
  return Object.freeze({
    ...recipe,
    images: Object.freeze(
      await Promise.all(recipe.images.map((item) => presentImage(storage, item))),
    ),
  });
}

async function presentImage(
  storage: RecipeMediaStorage,
  media: RecipeMediaRecord,
): Promise<RecipeImageView> {
  if (media.status !== "ACTIVE") return Object.freeze({ ...media, url: null, thumbnailUrl: null });
  const [url, thumbnailUrl] = await Promise.all([
    storage.createReadUrl(media.storageObjectPath),
    storage.createReadUrl(recipeThumbnailObjectPath(media.storageObjectPath)),
  ]);
  return Object.freeze({ ...media, url, thumbnailUrl });
}

async function requireRecipeMedia(
  repository: RecipeRepository,
  recipeId: string,
  mediaId: string,
): Promise<RecipeMediaRecord> {
  const media = await repository.findMedia(mediaId);
  if (media === null || media.recipeId !== recipeId) throw new RecipeMediaNotFoundError();
  return media;
}

function mimeTypeForFormat(format: string | undefined): string | undefined {
  if (format === "jpeg") return "image/jpeg";
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  return undefined;
}

const unavailableStorage: RecipeMediaStorage = Object.freeze({
  async createUploadUrl() {
    throw new Error("Recipe media storage is unavailable");
  },
  async createReadUrl() {
    return "";
  },
  async read() {
    throw new Error("Recipe media storage is unavailable");
  },
  async write() {
    throw new Error("Recipe media storage is unavailable");
  },
  async remove() {
    throw new Error("Recipe media storage is unavailable");
  },
});
