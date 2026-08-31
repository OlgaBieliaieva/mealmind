import type { DatabaseClient } from "@mealmind/db";
import type { Router } from "express";

import type { AuthenticationService } from "../../application/authentication/authentication-service.js";
import { createActiveFamilyContextResolver } from "../../application/family-context/active-family-context.js";
import { createMealPlanService } from "./application/meal-plan-service.js";
import { createPrismaMealPlanRepository } from "./infrastructure/prisma-meal-plan-repository.js";
import { createMealPlanRouter } from "./transport/meal-plan-router.js";
import { createSupabaseProductMediaStorage } from "../product/infrastructure/supabase-product-media-storage.js";
import { PRODUCT_MEDIA_BUCKET } from "../product/product-module.js";
import { createSupabaseRecipeMediaStorage } from "../recipe/infrastructure/supabase-recipe-media-storage.js";
import { RECIPE_MEDIA_BUCKET } from "../recipe/recipe-module.js";

export interface MealPlanModule {
  readonly router: Router;
}

export function createMealPlanModule(
  database: DatabaseClient,
  authenticationService: AuthenticationService,
  storageConfig: { readonly url: string; readonly secretKey: string },
): MealPlanModule {
  return Object.freeze({
    router: createMealPlanRouter(
      createMealPlanService(
        createPrismaMealPlanRepository(database),
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
