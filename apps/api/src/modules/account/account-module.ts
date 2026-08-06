import type { DatabaseClient } from "@mealmind/db";
import type { Router } from "express";

import type { IdentityProvider } from "../../application/authentication/authentication-service.js";
import { createAccountService } from "./application/account-service.js";
import { createPrismaAccountRepository } from "./infrastructure/prisma-account-repository.js";
import { createAccountRouter } from "./transport/account-router.js";

export interface AccountModule {
  readonly router: Router;
}

export function createAccountModule(
  database: DatabaseClient,
  identityProvider: IdentityProvider,
): AccountModule {
  const repository = createPrismaAccountRepository(database);
  const service = createAccountService(repository);

  return Object.freeze({
    router: createAccountRouter(identityProvider, service),
  });
}
