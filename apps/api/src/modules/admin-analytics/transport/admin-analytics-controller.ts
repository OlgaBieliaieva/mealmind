import type { RequestHandler } from "express";

import { validateRequest } from "../../../http/validation/validate-request.js";
import type { AdminAnalyticsService } from "../application/admin-analytics-service.js";
import {
  productsAnalyticsSchema,
  recipesAnalyticsSchema,
  referencesAnalyticsSchema,
  usersAnalyticsSchema,
} from "./admin-analytics-schema.js";

export interface AdminAnalyticsController {
  readonly users: RequestHandler;
  readonly products: RequestHandler;
  readonly recipes: RequestHandler;
  readonly references: RequestHandler;
}

export function createAdminAnalyticsController(
  service: AdminAnalyticsService,
): AdminAnalyticsController {
  return Object.freeze({
    users: validateRequest(usersAnalyticsSchema, async (input, _request, response) => {
      response.set("cache-control", "private, no-store");
      response.status(200).json({ data: await service.getUsers(input.query) });
    }),
    products: validateRequest(productsAnalyticsSchema, async (input, _request, response) => {
      response.set("cache-control", "private, no-store");
      response.status(200).json({ data: await service.getProducts(input.query) });
    }),
    recipes: validateRequest(recipesAnalyticsSchema, async (input, _request, response) => {
      response.set("cache-control", "private, no-store");
      response.status(200).json({ data: await service.getRecipes(input.query) });
    }),
    references: validateRequest(referencesAnalyticsSchema, async (_input, _request, response) => {
      response.set("cache-control", "private, no-store");
      response.status(200).json({ data: await service.getReferences() });
    }),
  });
}
