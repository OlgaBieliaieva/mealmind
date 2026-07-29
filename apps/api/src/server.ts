import { createApiRuntime } from "./composition-root.js";
import { parseApiEnv } from "./config/env.js";

const config = parseApiEnv(process.env);
const runtime = createApiRuntime(config);

runtime.app.listen(config.port, () => {
  console.log(`MealMind API is running at ${config.apiOrigin}`);
});
