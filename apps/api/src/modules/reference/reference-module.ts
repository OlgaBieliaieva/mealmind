import type { DatabaseClient } from "@mealmind/db";
import type { Router } from "express";

import type { AuthenticationService } from "../../application/authentication/authentication-service.js";
import { createReferenceService } from "./application/reference-service.js";
import { createPrismaReferenceRepository } from "./infrastructure/prisma-reference-repository.js";
import { createReferenceController } from "./transport/reference-controller.js";
import { createReferenceRouter } from "./transport/reference-router.js";

export interface ReferenceModule {
  readonly router: Router;
}

export function createReferenceModule(
  database: DatabaseClient,
  authenticationService: AuthenticationService,
): ReferenceModule {
  const repository = createPrismaReferenceRepository(database);
  const service = createReferenceService(repository);
  const controller = createReferenceController(service);

  return Object.freeze({
    router: createReferenceRouter(controller, authenticationService),
  });
}
