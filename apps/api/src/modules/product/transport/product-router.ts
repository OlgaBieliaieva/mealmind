import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import type { AuthenticationService } from "../../../application/authentication/authentication-service.js";
import { authenticate } from "../../../http/middleware/authenticate.js";
import { createApiRateLimitOptions } from "../../../http/middleware/rate-limit.js";
import { requireAdmin } from "../../../http/middleware/require-admin.js";
import type { ProductController } from "./product-controller.js";

export function createProductRouter(
  controller: ProductController,
  authenticationService: AuthenticationService,
): Router {
  const router = Router();
  const limiter = rateLimit(createApiRateLimitOptions());
  const authenticated = authenticate(authenticationService);

  router.get("/products/search", limiter, authenticated, controller.search);

  router.get("/admin/products", limiter, authenticated, requireAdmin, controller.list);
  router.post("/admin/products", limiter, authenticated, requireAdmin, controller.create);
  router.get("/admin/products/:id", limiter, authenticated, requireAdmin, controller.get);
  router.patch("/admin/products/:id", limiter, authenticated, requireAdmin, controller.update);
  router.patch(
    "/admin/products/:id/status",
    limiter,
    authenticated,
    requireAdmin,
    controller.changeStatus,
  );
  router.post(
    "/admin/products/:id/media/uploads",
    limiter,
    authenticated,
    requireAdmin,
    controller.reserveMedia,
  );
  router.post(
    "/admin/products/:id/media/:mediaId/complete",
    limiter,
    authenticated,
    requireAdmin,
    controller.completeMedia,
  );
  router.delete(
    "/admin/products/:id/media/:mediaId",
    limiter,
    authenticated,
    requireAdmin,
    controller.deleteMedia,
  );

  return router;
}
