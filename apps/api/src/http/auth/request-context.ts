import type { Request } from "express";

import { AuthenticationRequiredError } from "../../application/errors/authentication-errors.js";

export function getAuthenticatedUser(request: Request) {
  if (request.authenticatedUser === undefined) {
    throw new AuthenticationRequiredError();
  }

  return request.authenticatedUser;
}
