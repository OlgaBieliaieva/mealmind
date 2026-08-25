import type { RequestHandler } from "express";

import { getAuthenticatedUser } from "../../../http/auth/request-context.js";
import { validateRequest } from "../../../http/validation/validate-request.js";
import type { FoodService } from "../application/food-service.js";
import { favoriteFoodSchema, foodDetailsSchema, searchFoodSchema } from "./food-schema.js";

export interface FoodController {
  readonly search: RequestHandler;
  readonly getProduct: RequestHandler;
  readonly getRecipe: RequestHandler;
  readonly addFavorite: RequestHandler;
  readonly removeFavorite: RequestHandler;
}

export function createFoodController(service: FoodService): FoodController {
  return Object.freeze({
    search: validateRequest(searchFoodSchema, async (input, request, response) => {
      const page = await service.search(getAuthenticatedUser(request).userId, {
        query: input.query.query,
        type: input.query.type,
        favoritesOnly: input.query.favorites,
        difficulty: input.query.difficulty ?? null,
        recipeTypeId: input.query.recipeTypeId ?? null,
        authorId: input.query.authorId ?? null,
        ingredientId: input.query.ingredientId ?? null,
        cuisineId: input.query.cuisineId ?? null,
        dietaryTagId: input.query.dietaryTagId ?? null,
        page: input.query.page,
        pageSize: input.query.pageSize,
      });

      response.set("cache-control", "private, no-store");
      response.status(200).json({
        data: { items: page.items },
        meta: { page: page.page, pageSize: page.pageSize, total: page.total },
      });
    }),
    getProduct: validateRequest(foodDetailsSchema, async (input, request, response) => {
      response.set("cache-control", "private, no-store");
      response.status(200).json({
        data: await service.getProduct(getAuthenticatedUser(request).userId, input.params.id),
      });
    }),
    getRecipe: validateRequest(foodDetailsSchema, async (input, request, response) => {
      response.set("cache-control", "private, no-store");
      response.status(200).json({
        data: await service.getRecipe(getAuthenticatedUser(request).userId, input.params.id),
      });
    }),
    addFavorite: validateRequest(favoriteFoodSchema, async (input, request, response) => {
      response.set("cache-control", "private, no-store");
      response.status(200).json({
        data: await service.addFavorite(
          getAuthenticatedUser(request).userId,
          input.params.kind,
          input.params.id,
        ),
      });
    }),
    removeFavorite: validateRequest(favoriteFoodSchema, async (input, request, response) => {
      await service.removeFavorite(
        getAuthenticatedUser(request).userId,
        input.params.kind,
        input.params.id,
      );
      response.status(204).send();
    }),
  });
}
