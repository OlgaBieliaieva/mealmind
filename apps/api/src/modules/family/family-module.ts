import type { DatabaseClient } from "@mealmind/db";
import type { Router } from "express";
import type { AuthenticationService } from "../../application/authentication/authentication-service.js";
import { createFamilyService, type FamilyService } from "./application/family-service.js";
import { createPrismaFamilyRepository } from "./infrastructure/prisma-family-repository.js";
import { createFamilyRouter } from "./transport/family-router.js";

export interface FamilyModule {
  readonly router: Router;
  readonly service: FamilyService;
}
export function createFamilyModule(
  database: DatabaseClient,
  authenticationService: AuthenticationService,
): FamilyModule {
  const service = createFamilyService(createPrismaFamilyRepository(database));
  return Object.freeze({ service, router: createFamilyRouter(service, authenticationService) });
}
