import { createDatabaseClient, type DatabaseClient } from "@mealmind/db";
import type { Express } from "express";

import { createApp } from "./app.js";
import { createAuthenticationService } from "./application/authentication/authentication-service.js";
import { createHealthService } from "./application/health.js";
import type { AppLogger } from "./application/logging/logger.js";
import { createReadinessService } from "./application/readiness.js";
import type { ApiConfig } from "./config/env.js";
import { createSupabaseIdentityProvider } from "./infrastructure/auth/supabase-identity-provider.js";
import { createPinoLogger } from "./infrastructure/logging/pino-logger.js";
import { createPrismaReadinessProbe } from "./infrastructure/persistence/prisma-readiness-probe.js";
import { createPrismaUserIdentityRepository } from "./infrastructure/persistence/prisma-user-identity-repository.js";
import { createAccountModule } from "./modules/account/account-module.js";
import { createProductModule } from "./modules/product/product-module.js";
import { createReferenceModule } from "./modules/reference/reference-module.js";
import { createRecipeModule } from "./modules/recipe/recipe-module.js";

export interface ApiRuntime {
  readonly app: Express;
  readonly database: DatabaseClient;
  readonly logger: AppLogger;
  dispose(): Promise<void>;
}

export function createApiRuntime(config: ApiConfig): ApiRuntime {
  const logger = createPinoLogger({
    environment: config.nodeEnv,
  });

  const database = createDatabaseClient({
    connectionString: config.databaseUrl,
    log: ["error"],
  });

  const healthService = createHealthService();

  const readinessProbe = createPrismaReadinessProbe(database);
  const readinessService = createReadinessService(readinessProbe);

  const identityProvider = createSupabaseIdentityProvider({
    url: config.supabase.url,
    publishableKey: config.supabase.publishableKey,
  });

  const userIdentityRepository = createPrismaUserIdentityRepository(database);

  const authenticationService = createAuthenticationService({
    identityProvider,
    userIdentityRepository,
  });

  const accountModule = createAccountModule(database, identityProvider);

  const referenceModule = createReferenceModule(database, authenticationService);
  const productModule = createProductModule(database, authenticationService, {
    url: config.supabase.url,
    secretKey: config.supabase.secretKey,
  });
  const recipeModule = createRecipeModule(database, authenticationService);

  const app = createApp({
    healthService,
    readinessService,
    authenticationService,
    accountRouter: accountModule.router,
    referenceRouter: referenceModule.router,
    productRouter: productModule.router,
    recipeRouter: recipeModule.router,
    logger,
    corsAllowedOrigins: config.corsAllowedOrigins,
  });

  let disposed = false;

  return Object.freeze({
    app,
    database,
    logger,

    async dispose(): Promise<void> {
      if (disposed) {
        return;
      }

      disposed = true;
      await database.$disconnect();
    },
  });
}
