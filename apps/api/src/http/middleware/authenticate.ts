import type { RequestHandler } from "express";

import type { AuthenticationService } from "../../application/authentication/authentication-service.js";
import { AuthenticationRequiredError } from "../../application/errors/authentication-errors.js";
import { parseBearerToken } from "../auth/bearer-token.js";

export function authenticate(authenticationService: AuthenticationService): RequestHandler {
  return async (request, _response, next): Promise<void> => {
    try {
      const accessToken = parseBearerToken(request.get("authorization"));

      if (accessToken === null) {
        throw new AuthenticationRequiredError();
      }

      request.authenticatedUser = await authenticationService.authenticateAccessToken(accessToken);

      next();
    } catch (error) {
      next(error);
    }
  };
}
