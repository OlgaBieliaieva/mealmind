import { Router } from "express";

import type { AuthenticationService } from "../../application/authentication/authentication-service.js";
import { getAuthenticatedUser } from "../auth/request-context.js";
import { authenticate } from "../middleware/authenticate.js";

export function createSessionRouter(authenticationService: AuthenticationService): Router {
  const router = Router();

  router.get("/session", authenticate(authenticationService), (request, response) => {
    const user = getAuthenticatedUser(request);

    response.status(200).json({
      data: {
        user: {
          id: user.userId,
          email: user.email,
          applicationRole: user.applicationRole,
        },
      },
    });
  });

  return router;
}
