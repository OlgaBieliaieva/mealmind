import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import type { AuthenticationService } from "../../../application/authentication/authentication-service.js";
import { getAuthenticatedUser } from "../../../http/auth/request-context.js";
import { authenticate } from "../../../http/middleware/authenticate.js";
import { createApiRateLimitOptions } from "../../../http/middleware/rate-limit.js";
import { validateRequest } from "../../../http/validation/validate-request.js";
import type { CookingService } from "../application/cooking-service.js";
import {
  addIngredientSchema,
  cancelCookingSchema,
  completeCookingSchema,
  deleteIngredientSchema,
  readCookingSchema,
  startCookingSchema,
  updateIngredientSchema,
  updateStepSchema,
  updateYieldSchema,
} from "./cooking-schema.js";

export function createCookingRouter(
  service: CookingService,
  authenticationService: AuthenticationService,
): Router {
  const router = Router();
  const auth = authenticate(authenticationService);
  const readLimiter = rateLimit(createApiRateLimitOptions({ windowMs: 60_000, limit: 90 }));
  const writeLimiter = rateLimit(createApiRateLimitOptions({ windowMs: 60_000, limit: 60 }));
  const userId = (request: Parameters<typeof getAuthenticatedUser>[0]) =>
    getAuthenticatedUser(request).userId;

  router.post(
    "/cooking-sessions",
    writeLimiter,
    auth,
    validateRequest(startCookingSchema, async (input, request, response) => {
      response.setHeader("Cache-Control", "private, no-store");
      response.status(200).json({ data: await service.start(userId(request), input.body) });
    }),
  );
  router.get(
    "/cooking-sessions/:sessionId",
    readLimiter,
    auth,
    validateRequest(readCookingSchema, async (input, request, response) => {
      response.setHeader("Cache-Control", "private, no-store");
      response
        .status(200)
        .json({ data: await service.find(userId(request), input.params.sessionId) });
    }),
  );
  router.patch(
    "/cooking-sessions/:sessionId/ingredients/:ingredientId",
    writeLimiter,
    auth,
    validateRequest(updateIngredientSchema, async (input, request, response) => {
      response
        .status(200)
        .json({
          data: await service.updateIngredient(
            userId(request),
            input.params.sessionId,
            input.params.ingredientId,
            input.body,
          ),
        });
    }),
  );
  router.post(
    "/cooking-sessions/:sessionId/ingredients",
    writeLimiter,
    auth,
    validateRequest(addIngredientSchema, async (input, request, response) => {
      response
        .status(200)
        .json({
          data: await service.addIngredient(userId(request), input.params.sessionId, input.body),
        });
    }),
  );
  router.delete(
    "/cooking-sessions/:sessionId/ingredients/:ingredientId",
    writeLimiter,
    auth,
    validateRequest(deleteIngredientSchema, async (input, request, response) => {
      response
        .status(200)
        .json({
          data: await service.deleteIngredient(
            userId(request),
            input.params.sessionId,
            input.params.ingredientId,
            input.query.expectedRevision,
          ),
        });
    }),
  );
  router.patch(
    "/cooking-sessions/:sessionId/steps/:stepId",
    writeLimiter,
    auth,
    validateRequest(updateStepSchema, async (input, request, response) => {
      response
        .status(200)
        .json({
          data: await service.updateStep(
            userId(request),
            input.params.sessionId,
            input.params.stepId,
            input.body,
          ),
        });
    }),
  );
  router.patch(
    "/cooking-sessions/:sessionId/yield",
    writeLimiter,
    auth,
    validateRequest(updateYieldSchema, async (input, request, response) => {
      response
        .status(200)
        .json({
          data: await service.updateYield(userId(request), input.params.sessionId, input.body),
        });
    }),
  );
  router.post(
    "/cooking-sessions/:sessionId/complete",
    writeLimiter,
    auth,
    validateRequest(completeCookingSchema, async (input, request, response) => {
      response
        .status(200)
        .json({
          data: await service.complete(userId(request), input.params.sessionId, input.body),
        });
    }),
  );
  router.post(
    "/cooking-sessions/:sessionId/cancel",
    writeLimiter,
    auth,
    validateRequest(cancelCookingSchema, async (input, request, response) => {
      response
        .status(200)
        .json({
          data: await service.cancel(
            userId(request),
            input.params.sessionId,
            input.body.expectedRevision,
          ),
        });
    }),
  );
  return router;
}
