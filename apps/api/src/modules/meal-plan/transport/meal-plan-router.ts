import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import type { AuthenticationService } from "../../../application/authentication/authentication-service.js";
import { getAuthenticatedUser } from "../../../http/auth/request-context.js";
import { authenticate } from "../../../http/middleware/authenticate.js";
import { createApiRateLimitOptions } from "../../../http/middleware/rate-limit.js";
import { validateRequest } from "../../../http/validation/validate-request.js";
import type { MealPlanService } from "../application/meal-plan-service.js";
import {
  createMealEntriesSchema,
  deleteEntrySchema,
  deleteParticipantSchema,
  mealPlanWeekSchema,
  planningContextSchema,
  setEntryPreparedSchema,
  updateEntryPlacementSchema,
  updateParticipantSchema,
} from "./meal-plan-schema.js";

export function createMealPlanRouter(
  service: MealPlanService,
  authenticationService: AuthenticationService,
): Router {
  const router = Router();
  const readLimiter = rateLimit(createApiRateLimitOptions({ windowMs: 60_000, limit: 60 }));
  const writeLimiter = rateLimit(createApiRateLimitOptions({ windowMs: 60_000, limit: 30 }));
  const auth = authenticate(authenticationService);

  router.get(
    "/meal-plans/week",
    readLimiter,
    auth,
    validateRequest(mealPlanWeekSchema, async (input, request, response) => {
      response.setHeader("Cache-Control", "private, no-store");
      response.status(200).json({
        data: await service.readWeek(
          getAuthenticatedUser(request).userId,
          input.query.date,
          input.query.days,
        ),
      });
    }),
  );

  router.get(
    "/meal-plans/planning-context",
    readLimiter,
    auth,
    validateRequest(planningContextSchema, async (input, request, response) => {
      response.setHeader("Cache-Control", "private, no-store");
      response.status(200).json({
        data: await service.readPlanningContext(
          getAuthenticatedUser(request).userId,
          input.query.date,
        ),
      });
    }),
  );

  router.post(
    "/meal-plans/entries/batch",
    writeLimiter,
    auth,
    validateRequest(createMealEntriesSchema, async (input, request, response) => {
      const result = await service.createEntries(
        getAuthenticatedUser(request).userId,
        input.query.date,
        input.body,
      );
      response.setHeader("Cache-Control", "private, no-store");
      response.status(200).json({ data: result });
    }),
  );

  router.patch(
    "/meal-plans/entries/:entryId/prepared",
    writeLimiter,
    auth,
    validateRequest(setEntryPreparedSchema, async (input, request, response) => {
      response.setHeader("Cache-Control", "private, no-store");
      response.status(200).json({
        data: await service.setEntryPrepared(
          getAuthenticatedUser(request).userId,
          input.params.entryId,
          input.body,
        ),
      });
    }),
  );

  router.patch(
    "/meal-plans/entries/:entryId",
    writeLimiter,
    auth,
    validateRequest(updateEntryPlacementSchema, async (input, request, response) => {
      response.status(200).json({
        data: await service.updateEntryPlacement(
          getAuthenticatedUser(request).userId,
          input.params.entryId,
          input.body,
        ),
      });
    }),
  );

  router.patch(
    "/meal-plans/entries/:entryId/participants/:memberId",
    writeLimiter,
    auth,
    validateRequest(updateParticipantSchema, async (input, request, response) => {
      response.status(200).json({
        data: await service.updateParticipant(
          getAuthenticatedUser(request).userId,
          input.params.entryId,
          input.params.memberId,
          input.body,
        ),
      });
    }),
  );

  router.delete(
    "/meal-plans/entries/:entryId",
    writeLimiter,
    auth,
    validateRequest(deleteEntrySchema, async (input, request, response) => {
      await service.deleteEntry(
        getAuthenticatedUser(request).userId,
        input.params.entryId,
        input.query.expectedRevision,
      );
      response.status(204).send();
    }),
  );

  router.delete(
    "/meal-plans/entries/:entryId/participants/:memberId",
    writeLimiter,
    auth,
    validateRequest(deleteParticipantSchema, async (input, request, response) => {
      await service.deleteParticipant(
        getAuthenticatedUser(request).userId,
        input.params.entryId,
        input.params.memberId,
        input.query.expectedRevision,
      );
      response.status(204).send();
    }),
  );

  return router;
}
