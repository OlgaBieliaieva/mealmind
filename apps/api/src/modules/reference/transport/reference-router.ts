import { Router } from "express";

import type { AuthenticationService } from "../../../application/authentication/authentication-service.js";
import { authenticate } from "../../../http/middleware/authenticate.js";
import { requireAdmin } from "../../../http/middleware/require-admin.js";
import type { ReferenceController } from "./reference-controller.js";

export function createReferenceRouter(
  controller: ReferenceController,
  authenticationService: AuthenticationService,
): Router {
  const router = Router();
  const authenticated = authenticate(authenticationService);

  router.get("/reference/:resource", authenticated, controller.list);
  router.get("/admin/reference/:resource", authenticated, requireAdmin, controller.list);
  router.post("/admin/reference/:resource", authenticated, requireAdmin, controller.create);
  router.patch("/admin/reference/:resource/:id", authenticated, requireAdmin, controller.update);

  return router;
}
