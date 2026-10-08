import type { DatabaseClient } from "@mealmind/db";
import type { Router } from "express";

import type { AuthenticationService } from "../../application/authentication/authentication-service.js";
import {
  createProductImportReviewService,
  type ProductImportReviewService,
} from "./application/product-import-review-service.js";
import { createPrismaProductImportReviewRepository } from "./infrastructure/prisma-product-import-review-repository.js";
import { createPrismaProductImportPublisher } from "./infrastructure/prisma-product-import-publisher.js";
import { createSupabaseProductMediaStorage } from "../product/infrastructure/supabase-product-media-storage.js";
import { PRODUCT_MEDIA_BUCKET } from "../product/product-module.js";
import { createProductImportReviewController } from "./transport/product-import-review-controller.js";
import { createProductImportReviewRouter } from "./transport/product-import-review-router.js";

export interface ProductImportReviewModule {
  readonly router: Router;
  readonly service: ProductImportReviewService;
}

export function createProductImportReviewModule(
  database: DatabaseClient,
  authenticationService: AuthenticationService,
  storageConfig: { readonly url: string; readonly secretKey: string },
): ProductImportReviewModule {
  const storage = createSupabaseProductMediaStorage({
    ...storageConfig,
    bucket: PRODUCT_MEDIA_BUCKET,
  });
  const service = createProductImportReviewService(
    createPrismaProductImportReviewRepository(database),
    createPrismaProductImportPublisher(database, storage),
  );
  return Object.freeze({
    router: createProductImportReviewRouter(
      createProductImportReviewController(service),
      authenticationService,
    ),
    service,
  });
}
