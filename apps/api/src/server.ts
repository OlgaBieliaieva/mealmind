import { createApp } from "./app.js";
import { parseApiEnv } from "./config/env.js";

const config = parseApiEnv(process.env);
const app = createApp();

app.listen(config.port, () => {
  console.log(`MealMind API is running at http://localhost:${config.port}`);
});
