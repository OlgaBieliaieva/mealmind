import { createServer } from "node:http";

import { createApiRuntime } from "./composition-root.js";
import { parseApiEnv } from "./config/env.js";
import { configureHttpServer } from "./http/http-policy.js";
import {
  flushApiSentry,
  initializeApiSentry,
} from "./infrastructure/observability/sentry.js";
import { resolveApiRelease } from "./infrastructure/observability/release.js";
import { registerGracefulShutdown } from "./runtime/graceful-shutdown.js";

const config = parseApiEnv(process.env);

initializeApiSentry({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  release: resolveApiRelease(),
});

const runtime = createApiRuntime(config);
const server = createServer(runtime.app);

configureHttpServer(server);

registerGracefulShutdown({
  server,
  logger: runtime.logger,
  async dispose() {
    await runtime.dispose();
    await flushApiSentry();
  },
});

server.listen(config.port, () => {
  runtime.logger.info(
    {
      origin: config.apiOrigin,
      port: config.port,
    },
    "MealMind API started",
  );
});
