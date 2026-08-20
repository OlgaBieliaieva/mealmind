import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import type { AuthenticationService } from "../../../application/authentication/authentication-service.js";
import { authenticate } from "../../../http/middleware/authenticate.js";
import {
  type ApiRateLimitOverrides,
  createApiRateLimitOptions,
} from "../../../http/middleware/rate-limit.js";
import { requireAdmin } from "../../../http/middleware/require-admin.js";
import type { ReferenceController } from "./reference-controller.js";

export function createReferenceRouter(
  controller: ReferenceController,
  authenticationService: AuthenticationService,
  rateLimitOverrides: ApiRateLimitOverrides = {},
): Router {
  const router = Router();
  const referenceRateLimiter = rateLimit(createApiRateLimitOptions(rateLimitOverrides));
  const authenticated = authenticate(authenticationService);

  router.get("/reference/:resource", referenceRateLimiter, authenticated, controller.list);
  router.get(
    "/admin/reference/:resource",
    referenceRateLimiter,
    authenticated,
    requireAdmin,
    controller.list,
  );
  router.post(
    "/admin/reference/:resource",
    referenceRateLimiter,
    authenticated,
    requireAdmin,
    controller.create,
  );
  router.patch(
    "/admin/reference/:resource/:id",
    referenceRateLimiter,
    authenticated,
    requireAdmin,
    controller.update,
  );
  router.delete(
    "/admin/reference/:resource/:id",
    referenceRateLimiter,
    authenticated,
    requireAdmin,
    controller.archive,
  );

  return router;
}
