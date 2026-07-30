import express, { type Express } from "express";

import type { AuthenticationService } from "./application/authentication/authentication-service.js";
import type { HealthService } from "./application/health.js";
import type { AppLogger } from "./application/logging/logger.js";
import type { ReadinessService } from "./application/readiness.js";
import { JSON_BODY_LIMIT } from "./http/http-policy.js";
import { createCorsMiddleware } from "./http/middleware/cors.js";
import { errorHandler } from "./http/middleware/error-handler.js";
import { notFoundHandler } from "./http/middleware/not-found-handler.js";
import { createRequestContextMiddleware } from "./http/middleware/request-context.js";
import { createSessionRouter } from "./http/routes/session-router.js";

export interface AppDependencies {
  readonly healthService: HealthService;
  readonly readinessService: ReadinessService;
  readonly authenticationService: AuthenticationService;
  readonly logger: AppLogger;
  readonly corsAllowedOrigins: readonly string[];
}

export function createApp(dependencies: AppDependencies): Express {
  const app = express();

  app.disable("x-powered-by");

  app.use(createRequestContextMiddleware(dependencies.logger));
  app.use(createCorsMiddleware(dependencies.corsAllowedOrigins));
  app.use(
    express.json({
      limit: JSON_BODY_LIMIT,
    }),
  );

  app.get("/health", (_request, response) => {
    response.status(200).json(dependencies.healthService.getStatus());
  });

  app.get("/ready", async (_request, response, next) => {
    try {
      const status = await dependencies.readinessService.getStatus();

      response.status(status.status === "ready" ? 200 : 503).json(status);
    } catch (error) {
      next(error);
    }
  });

  app.use("/api/v1", createSessionRouter(dependencies.authenticationService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
