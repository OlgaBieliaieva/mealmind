import type { RequestHandler } from "express";

import type {
  FamilyAuthorizationService,
  FamilyRole,
} from "../../application/authorization/family-authorization-service.js";
import { FamilyAccessDeniedError } from "../../application/errors/authentication-errors.js";
import { getAuthenticatedUser } from "../auth/request-context.js";

export interface AuthorizeFamilyOptions {
  readonly parameterName?: string;
  readonly allowedRoles?: readonly FamilyRole[];
}

export function authorizeFamily(
  authorizationService: FamilyAuthorizationService,
  options: AuthorizeFamilyOptions = {},
): RequestHandler {
  const parameterName = options.parameterName ?? "familyId";

  return async (request, _response, next): Promise<void> => {
    try {
      const user = getAuthenticatedUser(request);
      const familyId = request.params[parameterName];

      if (typeof familyId !== "string") {
        throw new FamilyAccessDeniedError();
      }

      request.authorizedFamily = await authorizationService.authorize(
        user.userId,
        familyId,
        options.allowedRoles,
      );

      next();
    } catch (error) {
      next(error);
    }
  };
}
