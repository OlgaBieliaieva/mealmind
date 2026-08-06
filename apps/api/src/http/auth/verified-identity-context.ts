import type { Request } from "express";

import { AuthenticationRequiredError } from "../../application/errors/authentication-errors.js";

export function getVerifiedIdentity(request: Request) {
  if (request.verifiedIdentity === undefined) {
    throw new AuthenticationRequiredError();
  }

  return request.verifiedIdentity;
}
