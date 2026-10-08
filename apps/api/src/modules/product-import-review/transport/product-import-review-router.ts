import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import type { AuthenticationService } from "../../../application/authentication/authentication-service.js";
import { authenticate } from "../../../http/middleware/authenticate.js";
import { createApiRateLimitOptions } from "../../../http/middleware/rate-limit.js";
import { requireAdmin } from "../../../http/middleware/require-admin.js";
import type { ProductImportReviewController } from "./product-import-review-controller.js";

export function createProductImportReviewRouter(
  controller: ProductImportReviewController,
  authenticationService: AuthenticationService,
): Router {
  const router = Router();
  const limiter = rateLimit(createApiRateLimitOptions());
  const authenticated = authenticate(authenticationService);
  const guards = [limiter, authenticated, requireAdmin] as const;

  router.get("/admin/product-import/candidates", ...guards, controller.list);
  router.get("/admin/product-import/candidates/:id", ...guards, controller.get);
  router.post("/admin/product-import/candidates/:id/review", ...guards, controller.start);
  router.patch("/admin/product-import/candidates/:id/review", ...guards, controller.updateDraft);
  router.post("/admin/product-import/candidates/:id/decision", ...guards, controller.decide);
  router.post("/admin/product-import/candidates/:id/reopen", ...guards, controller.reopen);
  router.post("/admin/product-import/candidates/:id/publish", ...guards, controller.publish);

  return router;
}
