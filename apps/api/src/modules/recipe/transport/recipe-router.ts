import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import type { AuthenticationService } from "../../../application/authentication/authentication-service.js";
import { authenticate } from "../../../http/middleware/authenticate.js";
import { createApiRateLimitOptions } from "../../../http/middleware/rate-limit.js";
import { requireAdmin } from "../../../http/middleware/require-admin.js";
import type { RecipeController } from "./recipe-controller.js";

export function createRecipeRouter(
  controller: RecipeController,
  authenticationService: AuthenticationService,
): Router {
  const router = Router();
  const limiter = rateLimit(createApiRateLimitOptions());
  const authenticated = authenticate(authenticationService);

  router.get("/recipes/:id", limiter, authenticated, controller.getPublic);
  router.get("/admin/recipes", limiter, authenticated, requireAdmin, controller.list);
  router.post("/admin/recipes", limiter, authenticated, requireAdmin, controller.create);
  router.post(
    "/admin/recipes/nutrition-preview",
    limiter,
    authenticated,
    requireAdmin,
    controller.preview,
  );
  router.get("/admin/recipes/:id", limiter, authenticated, requireAdmin, controller.getAdmin);
  router.patch("/admin/recipes/:id", limiter, authenticated, requireAdmin, controller.update);
  router.patch(
    "/admin/recipes/:id/status",
    limiter,
    authenticated,
    requireAdmin,
    controller.changeStatus,
  );
  return router;
}
