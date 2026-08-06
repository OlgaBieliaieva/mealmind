import type { RequestHandler } from "express";

import { getAuthenticatedUser } from "../../../http/auth/request-context.js";
import { validateRequest } from "../../../http/validation/validate-request.js";
import type { RecipeService } from "../application/recipe-service.js";
import {
  changeRecipeStatusSchema,
  createRecipeSchema,
  getRecipeSchema,
  listRecipesSchema,
  previewRecipeNutritionSchema,
  updateRecipeSchema,
} from "./recipe-schema.js";

export interface RecipeController {
  readonly list: RequestHandler;
  readonly getAdmin: RequestHandler;
  readonly getPublic: RequestHandler;
  readonly preview: RequestHandler;
  readonly create: RequestHandler;
  readonly update: RequestHandler;
  readonly changeStatus: RequestHandler;
}

export function createRecipeController(service: RecipeService): RecipeController {
  return Object.freeze({
    list: validateRequest(listRecipesSchema, async (input, _request, response) => {
      const page = await service.list(input.query);
      response.set("cache-control", "no-store");
      response.status(200).json({
        data: { items: page.items },
        meta: { page: page.page, pageSize: page.pageSize, total: page.total },
      });
    }),
    getAdmin: validateRequest(getRecipeSchema, async (input, _request, response) => {
      response.set("cache-control", "no-store");
      response.status(200).json({ data: await service.getAdmin(input.params.id) });
    }),
    getPublic: validateRequest(getRecipeSchema, async (input, _request, response) => {
      response.set("cache-control", "private, max-age=60");
      response.status(200).json({ data: await service.getPublic(input.params.id) });
    }),
    preview: validateRequest(previewRecipeNutritionSchema, async (input, _request, response) => {
      response.set("cache-control", "no-store");
      response.status(200).json({ data: await service.preview(input.body.ingredients) });
    }),
    create: validateRequest(createRecipeSchema, async (input, request, response) => {
      response.set("cache-control", "no-store");
      response
        .status(201)
        .json({ data: await service.create(input.body, getAuthenticatedUser(request).userId) });
    }),
    update: validateRequest(updateRecipeSchema, async (input, request, response) => {
      response.set("cache-control", "no-store");
      response.status(200).json({
        data: await service.update(
          input.params.id,
          input.body,
          getAuthenticatedUser(request).userId,
        ),
      });
    }),
    changeStatus: validateRequest(changeRecipeStatusSchema, async (input, _request, response) => {
      response.set("cache-control", "no-store");
      response
        .status(200)
        .json({ data: await service.changeStatus(input.params.id, input.body.status) });
    }),
  });
}
