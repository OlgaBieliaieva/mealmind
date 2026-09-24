import type { RequestHandler } from "express";

import { validateRequest } from "../../../http/validation/validate-request.js";
import type { AdminAnalyticsService } from "../application/admin-analytics-service.js";
import { referencesAnalyticsSchema, usersAnalyticsSchema } from "./admin-analytics-schema.js";

export interface AdminAnalyticsController {
  readonly users: RequestHandler;
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
    references: validateRequest(referencesAnalyticsSchema, async (_input, _request, response) => {
      response.set("cache-control", "private, no-store");
      response.status(200).json({ data: await service.getReferences() });
    }),
  });
}
