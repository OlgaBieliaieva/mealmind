import type { DatabaseClient } from "@mealmind/db";
import type { Router } from "express";

import type { AuthenticationService } from "../../application/authentication/authentication-service.js";
import { createAdminAnalyticsService } from "./application/admin-analytics-service.js";
import { createPrismaAdminAnalyticsRepository } from "./infrastructure/prisma-admin-analytics-repository.js";
import { createAdminAnalyticsController } from "./transport/admin-analytics-controller.js";
import { createAdminAnalyticsRouter } from "./transport/admin-analytics-router.js";

export interface AdminAnalyticsModule {
  readonly router: Router;
}

export function createAdminAnalyticsModule(
  database: DatabaseClient,
  authenticationService: AuthenticationService,
): AdminAnalyticsModule {
  const service = createAdminAnalyticsService(createPrismaAdminAnalyticsRepository(database));
  return Object.freeze({
    router: createAdminAnalyticsRouter(
      createAdminAnalyticsController(service),
      authenticationService,
    ),
  });
}
