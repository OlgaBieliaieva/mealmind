import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

import type { IdentityProvider } from "../../../application/authentication/authentication-service.js";
import { getVerifiedIdentity } from "../../../http/auth/verified-identity-context.js";
import { createApiRateLimitOptions } from "../../../http/middleware/rate-limit.js";
import { verifyIdentity } from "../../../http/middleware/verify-identity.js";
import { validateRequest } from "../../../http/validation/validate-request.js";
import type { AccountService } from "../application/account-service.js";

const bootstrapSchema = z.object({
  params: z.object({}).strict(),
  query: z.object({}).strict(),
  body: z.object({}).strict(),
});

export function createAccountRouter(
  identityProvider: IdentityProvider,
  accountService: AccountService,
): Router {
  const router = Router();
  const bootstrapRateLimit = rateLimit(
    createApiRateLimitOptions({
      windowMs: 60_000,
      limit: 10,
    }),
  );

  router.post(
    "/account/bootstrap",
    bootstrapRateLimit,
    verifyIdentity(identityProvider),
    validateRequest(bootstrapSchema, async (_input, request, response) => {
      const account = await accountService.bootstrap(getVerifiedIdentity(request));

      response.status(200).json({
        data: {
          user: {
            id: account.id,
            email: account.email,
            applicationRole: account.applicationRole,
          },
        },
      });
    }),
  );

  return router;
}
