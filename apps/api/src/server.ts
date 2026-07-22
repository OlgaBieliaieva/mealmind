import { createApp } from "./app.js";

const DEFAULT_PORT = 3002;

const port = Number(process.env.PORT ?? DEFAULT_PORT);
const app = createApp();

app.listen(port, () => {
  console.log(`MealMind API is running at http://localhost:${port}`);
});
