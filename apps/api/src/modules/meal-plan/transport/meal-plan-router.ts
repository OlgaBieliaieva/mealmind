import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import type { AuthenticationService } from "../../../application/authentication/authentication-service.js";
import { getAuthenticatedUser } from "../../../http/auth/request-context.js";
import { authenticate } from "../../../http/middleware/authenticate.js";
import { createApiRateLimitOptions } from "../../../http/middleware/rate-limit.js";
import { validateRequest } from "../../../http/validation/validate-request.js";
import type { MealPlanService } from "../application/meal-plan-service.js";
import { mealPlanWeekSchema } from "./meal-plan-schema.js";

export function createMealPlanRouter(
  service: MealPlanService,
  authenticationService: AuthenticationService,
): Router {
  const router = Router();
  const limiter = rateLimit(createApiRateLimitOptions({ windowMs: 60_000, limit: 60 }));

  router.get(
    "/meal-plans/week",
    limiter,
    authenticate(authenticationService),
    validateRequest(mealPlanWeekSchema, async (input, request, response) => {
      response.setHeader("Cache-Control", "private, no-store");
      response.status(200).json({
        data: await service.readWeek(getAuthenticatedUser(request).userId, input.query.date),
      });
    }),
  );

  return router;
}
