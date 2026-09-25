import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import type { AuthenticationService } from "../../../application/authentication/authentication-service.js";
import { authenticate } from "../../../http/middleware/authenticate.js";
import { createApiRateLimitOptions } from "../../../http/middleware/rate-limit.js";
import { requireAdmin } from "../../../http/middleware/require-admin.js";
import type { AdminAnalyticsController } from "./admin-analytics-controller.js";

export function createAdminAnalyticsRouter(
  controller: AdminAnalyticsController,
  authenticationService: AuthenticationService,
): Router {
  const router = Router();
  const limiter = rateLimit(createApiRateLimitOptions());
  const authenticated = authenticate(authenticationService);

  router.get("/admin/analytics/overview", limiter, authenticated, requireAdmin, controller.overview);
  router.get("/admin/analytics/users", limiter, authenticated, requireAdmin, controller.users);
  router.get(
    "/admin/analytics/products",
    limiter,
    authenticated,
    requireAdmin,
    controller.products,
  );
  router.get("/admin/analytics/recipes", limiter, authenticated, requireAdmin, controller.recipes);
  router.get(
    "/admin/analytics/references",
    limiter,
    authenticated,
    requireAdmin,
    controller.references,
  );

  return router;
}
