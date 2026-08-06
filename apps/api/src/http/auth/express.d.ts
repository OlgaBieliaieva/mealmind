import type {
  AuthenticatedUserContext,
  VerifiedIdentity,
} from "../../application/authentication/authentication-service.js";
import type { AuthorizedFamilyContext } from "../../application/authorization/family-authorization-service.js";
import type { AppLogger } from "../../application/logging/logger.js";

declare module "express-serve-static-core" {
  interface Request {
    authenticatedUser?: AuthenticatedUserContext;
    verifiedIdentity?: VerifiedIdentity;
    authorizedFamily?: AuthorizedFamilyContext;
    requestId?: string;
    logger?: AppLogger;
  }
}

export {};
