import express, { type Express } from "express";

import type { HealthService } from "./application/health.js";
import { errorHandler } from "./http/middleware/error-handler.js";
import { notFoundHandler } from "./http/middleware/not-found-handler.js";

export interface AppDependencies {
  readonly healthService: HealthService;
}

export function createApp(dependencies: AppDependencies): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.status(200).json(dependencies.healthService.getStatus());
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
