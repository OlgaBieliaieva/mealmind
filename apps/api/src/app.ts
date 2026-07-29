import express, { type Express } from "express";

import type { AuthenticationService } from "./application/authentication/authentication-service.js";
import type { HealthService } from "./application/health.js";
import { errorHandler } from "./http/middleware/error-handler.js";
import { notFoundHandler } from "./http/middleware/not-found-handler.js";
import { createSessionRouter } from "./http/routes/session-router.js";

export interface AppDependencies {
  readonly healthService: HealthService;
  readonly authenticationService: AuthenticationService;
}

export function createApp(dependencies: AppDependencies): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.status(200).json(dependencies.healthService.getStatus());
  });

  app.use("/api/v1", createSessionRouter(dependencies.authenticationService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
