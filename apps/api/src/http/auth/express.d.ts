import type { AuthenticatedUserContext } from "../../application/authentication/authentication-service.js";
import type { AuthorizedFamilyContext } from "../../application/authorization/family-authorization-service.js";

declare module "express-serve-static-core" {
  interface Request {
    authenticatedUser?: AuthenticatedUserContext;
    authorizedFamily?: AuthorizedFamilyContext;
  }
}

export {};
