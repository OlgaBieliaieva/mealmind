import type { DatabaseClient } from "@mealmind/db";
import type { Router } from "express";

import type { AuthenticationService } from "../../application/authentication/authentication-service.js";
import { createActiveFamilyContextResolver } from "../../application/family-context/active-family-context.js";
import { createShoppingListService } from "./application/shopping-list-service.js";
import { createPrismaShoppingListRepository } from "./infrastructure/prisma-shopping-list-repository.js";
import { createShoppingListRouter } from "./transport/shopping-list-router.js";

export interface ShoppingListModule {
  readonly router: Router;
}

export function createShoppingListModule(
  database: DatabaseClient,
  authenticationService: AuthenticationService,
): ShoppingListModule {
  return Object.freeze({
    router: createShoppingListRouter(
      createShoppingListService(
        createPrismaShoppingListRepository(database),
        createActiveFamilyContextResolver(database),
      ),
      authenticationService,
    ),
  });
}
