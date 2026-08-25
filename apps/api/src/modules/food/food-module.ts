import type { DatabaseClient } from "@mealmind/db";
import type { Router } from "express";

import type { AuthenticationService } from "../../application/authentication/authentication-service.js";
import { createActiveFamilyContextResolver } from "../../application/family-context/active-family-context.js";
import { createFoodService } from "./application/food-service.js";
import { createPrismaFoodRepository } from "./infrastructure/prisma-food-repository.js";
import { createSupabaseProductMediaStorage } from "../product/infrastructure/supabase-product-media-storage.js";
import { PRODUCT_MEDIA_BUCKET } from "../product/product-module.js";
import { createSupabaseRecipeMediaStorage } from "../recipe/infrastructure/supabase-recipe-media-storage.js";
import { RECIPE_MEDIA_BUCKET } from "../recipe/recipe-module.js";
import { createSupabaseAuthorAvatarStorage } from "../reference/infrastructure/supabase-author-avatar-storage.js";
import { AUTHOR_AVATAR_BUCKET } from "../reference/reference-module.js";
import { createFoodController } from "./transport/food-controller.js";
import { createFoodRouter } from "./transport/food-router.js";

export interface FoodModule {
  readonly router: Router;
}

export function createFoodModule(
  database: DatabaseClient,
  authenticationService: AuthenticationService,
  storageConfig: { readonly url: string; readonly secretKey: string },
): FoodModule {
  const service = createFoodService(
    createPrismaFoodRepository(database),
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
      authorAvatars: createSupabaseAuthorAvatarStorage({
        ...storageConfig,
        bucket: AUTHOR_AVATAR_BUCKET,
      }),
    },
  );

  return Object.freeze({
    router: createFoodRouter(createFoodController(service), authenticationService),
  });
}
