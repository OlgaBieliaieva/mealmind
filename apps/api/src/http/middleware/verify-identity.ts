import type { RequestHandler } from "express";

import type { IdentityProvider } from "../../application/authentication/authentication-service.js";
import { AuthenticationRequiredError } from "../../application/errors/authentication-errors.js";
import { parseBearerToken } from "../auth/bearer-token.js";

export function verifyIdentity(identityProvider: IdentityProvider): RequestHandler {
  return async (request, _response, next): Promise<void> => {
    try {
      const accessToken = parseBearerToken(request.get("authorization"));

      if (accessToken === null) {
        throw new AuthenticationRequiredError();
      }

      const identity = await identityProvider.verifyAccessToken(accessToken);

      if (identity === null) {
        throw new AuthenticationRequiredError();
      }

      request.verifiedIdentity = identity;
      next();
    } catch (error) {
      next(error);
    }
  };
}
