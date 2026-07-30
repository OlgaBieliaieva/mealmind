import type { AuthenticatedUserContext } from "../../application/authentication/authentication-service.js";
import type { AuthorizedFamilyContext } from "../../application/authorization/family-authorization-service.js";
import type { AppLogger } from "../../application/logging/logger.js";

declare module "express-serve-static-core" {
  interface Request {
    authenticatedUser?: AuthenticatedUserContext;
    authorizedFamily?: AuthorizedFamilyContext;
    requestId?: string;
    logger?: AppLogger;
  }
}

export {};
