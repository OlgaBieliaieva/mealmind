import type { DatabaseClient } from "@mealmind/db";
import type { Router } from "express";

import type { AuthenticationService } from "../../application/authentication/authentication-service.js";
import { createActiveFamilyContextResolver } from "../../application/family-context/active-family-context.js";
import { createCookingService } from "./application/cooking-service.js";
import { createPrismaCookingRepository } from "./infrastructure/prisma-cooking-repository.js";
import { createCookingRouter } from "./transport/cooking-router.js";
import { createSupabaseRecipeMediaStorage } from "../recipe/infrastructure/supabase-recipe-media-storage.js";
import { RECIPE_MEDIA_BUCKET } from "../recipe/recipe-module.js";

export function createCookingModule(
  database: DatabaseClient,
  authenticationService: AuthenticationService,
  storageConfig: { readonly url: string; readonly secretKey: string },
): { readonly router: Router } {
  return Object.freeze({
    router: createCookingRouter(
      createCookingService(
        createPrismaCookingRepository(database),
        createActiveFamilyContextResolver(database),
        createSupabaseRecipeMediaStorage({ ...storageConfig, bucket: RECIPE_MEDIA_BUCKET }),
      ),
      authenticationService,
    ),
  });
}
