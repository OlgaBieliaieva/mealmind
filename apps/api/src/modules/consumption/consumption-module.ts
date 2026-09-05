import type { DatabaseClient } from "@mealmind/db";
import type { Router } from "express";
import type { AuthenticationService } from "../../application/authentication/authentication-service.js";
import { createActiveFamilyContextResolver } from "../../application/family-context/active-family-context.js";
import { createConsumptionService } from "./application/consumption-service.js";
import { createPrismaConsumptionRepository } from "./infrastructure/prisma-consumption-repository.js";
import { createConsumptionRouter } from "./transport/consumption-router.js";
import { createSupabaseProductMediaStorage } from "../product/infrastructure/supabase-product-media-storage.js";
import { PRODUCT_MEDIA_BUCKET } from "../product/product-module.js";
import { createSupabaseRecipeMediaStorage } from "../recipe/infrastructure/supabase-recipe-media-storage.js";
import { RECIPE_MEDIA_BUCKET } from "../recipe/recipe-module.js";

export function createConsumptionModule(
  database: DatabaseClient,
  authenticationService: AuthenticationService,
  storageConfig: { readonly url: string; readonly secretKey: string },
): { readonly router: Router } {
  return Object.freeze({
    router: createConsumptionRouter(
      createConsumptionService(
        createPrismaConsumptionRepository(database),
        createActiveFamilyContextResolver(database),
        {
          products: createSupabaseProductMediaStorage({
            ...storageConfig,
            bucket: PRODUCT_MEDIA_BUCKET,
          }),
          recipes: createSupabaseRecipeMediaStorage({
            ...storageConfig,
            bucket: RECIPE_MEDIA_BUCKET,
          }),
        },
      ),
      authenticationService,
    ),
  });
}
