import type { DatabaseClient } from "@mealmind/db";
import type { Router } from "express";

import type { AuthenticationService } from "../../application/authentication/authentication-service.js";
import { createProductService, type ProductService } from "./application/product-service.js";
import { createPrismaProductRepository } from "./infrastructure/prisma-product-repository.js";
import { createSupabaseProductMediaStorage } from "./infrastructure/supabase-product-media-storage.js";
import { createProductController } from "./transport/product-controller.js";
import { createProductRouter } from "./transport/product-router.js";

export const PRODUCT_MEDIA_BUCKET = "product-media";

export interface ProductModule {
  readonly router: Router;
  readonly service: ProductService;
}

export function createProductModule(
  database: DatabaseClient,
  authenticationService: AuthenticationService,
  storageConfig: { readonly url: string; readonly secretKey: string },
): ProductModule {
  const repository = createPrismaProductRepository(database);
  const storage = createSupabaseProductMediaStorage({
    ...storageConfig,
    bucket: PRODUCT_MEDIA_BUCKET,
  });
  const service = createProductService(repository, storage);
  const controller = createProductController(service);

  return Object.freeze({
    router: createProductRouter(controller, authenticationService),
    service,
  });
}
