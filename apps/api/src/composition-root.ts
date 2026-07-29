import { createDatabaseClient, type DatabaseClient } from "@mealmind/db";
import type { Express } from "express";

import { createApp } from "./app.js";
import { createAuthenticationService } from "./application/authentication/authentication-service.js";
import { createHealthService } from "./application/health.js";
import type { ApiConfig } from "./config/env.js";
import { createSupabaseIdentityProvider } from "./infrastructure/auth/supabase-identity-provider.js";
import { createPrismaUserIdentityRepository } from "./infrastructure/persistence/prisma-user-identity-repository.js";

export interface ApiRuntime {
  readonly app: Express;
  readonly database: DatabaseClient;
  dispose(): Promise<void>;
}

export function createApiRuntime(config: ApiConfig): ApiRuntime {
  const database = createDatabaseClient({
    connectionString: config.databaseUrl,
    log: ["error"],
  });

  const healthService = createHealthService();

  const identityProvider = createSupabaseIdentityProvider({
    url: config.supabase.url,
    publishableKey: config.supabase.publishableKey,
  });

  const userIdentityRepository = createPrismaUserIdentityRepository(database);

  const authenticationService = createAuthenticationService({
    identityProvider,
    userIdentityRepository,
  });

  const app = createApp({
    healthService,
    authenticationService,
  });

  let disposed = false;

  return Object.freeze({
    app,
    database,

    async dispose(): Promise<void> {
      if (disposed) {
        return;
      }

      disposed = true;
      await database.$disconnect();
    },
  });
}
