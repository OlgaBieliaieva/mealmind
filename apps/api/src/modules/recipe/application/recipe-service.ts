import {
  calculateRecipeNutrition,
  type RecipeNutritionCalculation,
} from "./recipe-nutrition-calculator.js";
import { RecipeInvariantError, RecipeNotFoundError } from "./recipe-errors.js";
import type {
  RecipeDetails,
  RecipeIngredientInput,
  RecipeListQuery,
  RecipeMutationData,
  RecipePage,
  PublicRecipeDetails,
  RecipeRepository,
  RecipeStatus,
  RecipeUpdate,
  RecipeUpdateData,
  RecipeWrite,
} from "../domain/recipe-repository.js";

export interface RecipeNutritionPreview extends RecipeNutritionCalculation {
  readonly totalIngredientWeightG: string;
}

export interface RecipeService {
  list(query: RecipeListQuery): Promise<RecipePage>;
  getAdmin(id: string): Promise<RecipeDetails>;
  getPublic(id: string): Promise<PublicRecipeDetails>;
  preview(ingredients: readonly RecipeIngredientInput[]): Promise<RecipeNutritionPreview>;
  create(input: RecipeWrite, actorUserId: string): Promise<RecipeDetails>;
  update(id: string, input: RecipeUpdate, actorUserId: string): Promise<RecipeDetails>;
  changeStatus(id: string, status: RecipeStatus): Promise<RecipeDetails>;
}

export function createRecipeService(repository: RecipeRepository): RecipeService {
  const service: RecipeService = {
    list: (query) => repository.list(query),

    async getAdmin(id) {
      const recipe = await repository.findAdminById(id);
      if (recipe === null) throw new RecipeNotFoundError();
      return recipe;
    },

    async getPublic(id) {
      const recipe = await repository.findPublicById(id);
      if (recipe === null) throw new RecipeNotFoundError();
      return presentPublicRecipe(recipe);
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
      return repository.create(data, actorUserId);
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
      return updated;
    },

    async changeStatus(id, status) {
      const existing = await repository.findAdminById(id);
      if (existing === null) throw new RecipeNotFoundError();
      assertStatusTransition(existing, status);
      if (existing.status === status) return existing;
      const updated = await repository.updateStatus(id, status);
      if (updated === null) throw new RecipeNotFoundError();
      return updated;
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

function presentPublicRecipe(recipe: RecipeDetails): PublicRecipeDetails {
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
    nutrients: recipe.nutrients,
  });
}
