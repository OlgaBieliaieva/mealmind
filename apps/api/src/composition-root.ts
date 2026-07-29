import { createDatabaseClient, type DatabaseClient } from "@mealmind/db";
import type { Express } from "express";

import { createApp } from "./app.js";
import { createHealthService } from "./application/health.js";
import type { ApiConfig } from "./config/env.js";

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

  const app = createApp({
    healthService,
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
