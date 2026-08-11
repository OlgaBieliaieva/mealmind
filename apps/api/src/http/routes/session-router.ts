import { Router } from "express";

import type { AuthenticationService } from "../../application/authentication/authentication-service.js";
import { getAuthenticatedUser } from "../auth/request-context.js";
import { authenticate } from "../middleware/authenticate.js";

export interface ApplicationSessionReader {
  readSession(userId: string): Promise<{
    readonly onboardingCompleted: boolean;
    readonly profile: unknown;
    readonly family: unknown;
  }>;
}

export function createSessionRouter(
  authenticationService: AuthenticationService,
  sessionReader?: ApplicationSessionReader,
): Router {
  const router = Router();

  router.get("/session", authenticate(authenticationService), async (request, response, next) => {
    const user = getAuthenticatedUser(request);
    try {
      const context = await sessionReader?.readSession(user.userId);
      response.status(200).json({
        data: {
          user: {
            id: user.userId,
            email: user.email,
            applicationRole: user.applicationRole,
          },
          ...(context === undefined ? {} : context),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
