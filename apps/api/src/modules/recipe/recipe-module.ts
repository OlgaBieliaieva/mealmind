import type { DatabaseClient } from "@mealmind/db";
import type { Router } from "express";

import type { AuthenticationService } from "../../application/authentication/authentication-service.js";
import { createRecipeService, type RecipeService } from "./application/recipe-service.js";
import { createPrismaRecipeRepository } from "./infrastructure/prisma-recipe-repository.js";
import { createRecipeController } from "./transport/recipe-controller.js";
import { createRecipeRouter } from "./transport/recipe-router.js";

export interface RecipeModule {
  readonly router: Router;
  readonly service: RecipeService;
}

export function createRecipeModule(
  database: DatabaseClient,
  authenticationService: AuthenticationService,
): RecipeModule {
  const service = createRecipeService(createPrismaRecipeRepository(database));
  return Object.freeze({
    service,
    router: createRecipeRouter(createRecipeController(service), authenticationService),
  });
}
