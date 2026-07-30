import { createServer } from "node:http";

import { createApiRuntime } from "./composition-root.js";
import { parseApiEnv } from "./config/env.js";
import { configureHttpServer } from "./http/http-policy.js";
import { registerGracefulShutdown } from "./runtime/graceful-shutdown.js";

const config = parseApiEnv(process.env);
const runtime = createApiRuntime(config);

const server = createServer(runtime.app);

configureHttpServer(server);

registerGracefulShutdown({
  server,
  logger: runtime.logger,
  dispose: runtime.dispose,
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
