import type { DatabaseClient } from "@mealmind/db";
import type { Router } from "express";

import type { AuthenticationService } from "../../application/authentication/authentication-service.js";
import {
  createProductImportReviewService,
  type ProductImportReviewService,
} from "./application/product-import-review-service.js";
import { createPrismaProductImportReviewRepository } from "./infrastructure/prisma-product-import-review-repository.js";
import { createProductImportReviewController } from "./transport/product-import-review-controller.js";
import { createProductImportReviewRouter } from "./transport/product-import-review-router.js";

export interface ProductImportReviewModule {
  readonly router: Router;
  readonly service: ProductImportReviewService;
}

export function createProductImportReviewModule(
  database: DatabaseClient,
  authenticationService: AuthenticationService,
): ProductImportReviewModule {
  const service = createProductImportReviewService(
    createPrismaProductImportReviewRepository(database),
  );
  return Object.freeze({
    router: createProductImportReviewRouter(
      createProductImportReviewController(service),
      authenticationService,
    ),
    service,
  });
}
