import type { DatabaseClient } from "@mealmind/db";
import type { Router } from "express";

import type { AuthenticationService } from "../../application/authentication/authentication-service.js";
import { createRecipeService, type RecipeService } from "./application/recipe-service.js";
import { createPrismaRecipeRepository } from "./infrastructure/prisma-recipe-repository.js";
import { createSupabaseRecipeMediaStorage } from "./infrastructure/supabase-recipe-media-storage.js";
import { createRecipeController } from "./transport/recipe-controller.js";
import { createRecipeRouter } from "./transport/recipe-router.js";

export interface RecipeModule {
  readonly router: Router;
  readonly service: RecipeService;
}

export const RECIPE_MEDIA_BUCKET = "recipe-media";

export function createRecipeModule(
  database: DatabaseClient,
  authenticationService: AuthenticationService,
  storageConfig: { readonly url: string; readonly secretKey: string },
): RecipeModule {
  const service = createRecipeService(
    createPrismaRecipeRepository(database),
    createSupabaseRecipeMediaStorage({ ...storageConfig, bucket: RECIPE_MEDIA_BUCKET }),
  );
  return Object.freeze({
    service,
    router: createRecipeRouter(createRecipeController(service), authenticationService),
  });
}
