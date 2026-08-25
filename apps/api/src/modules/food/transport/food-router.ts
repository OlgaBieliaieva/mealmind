import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import type { AuthenticationService } from "../../../application/authentication/authentication-service.js";
import { authenticate } from "../../../http/middleware/authenticate.js";
import { createApiRateLimitOptions } from "../../../http/middleware/rate-limit.js";
import type { FoodController } from "./food-controller.js";

export function createFoodRouter(
  controller: FoodController,
  authenticationService: AuthenticationService,
): Router {
  const router = Router();
  const limiter = rateLimit(createApiRateLimitOptions());
  const authenticated = authenticate(authenticationService);

  router.get("/food/search", limiter, authenticated, controller.search);
  router.get("/food/products/:id", limiter, authenticated, controller.getProduct);
  router.get("/food/recipes/:id", limiter, authenticated, controller.getRecipe);
  router.put("/food/favorites/:kind/:id", limiter, authenticated, controller.addFavorite);
  router.delete("/food/favorites/:kind/:id", limiter, authenticated, controller.removeFavorite);

  return router;
}
