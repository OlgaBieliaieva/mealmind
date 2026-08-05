import type { RequestHandler } from "express";

import { AccountAccessDeniedError } from "../../application/errors/authentication-errors.js";
import { getAuthenticatedUser } from "../auth/request-context.js";

export const requireAdmin: RequestHandler = (request, _response, next) => {
  if (getAuthenticatedUser(request).applicationRole !== "ADMIN") {
    next(new AccountAccessDeniedError());
    return;
  }

  next();
};
