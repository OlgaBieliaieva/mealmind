const bearer = [{ bearerAuth: [] }];
const id = { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } };
const jsonBody = (schema: string) => ({
  required: true,
  content: { "application/json": { schema: { $ref: schema } } },
});
const errors = {
  "400": { description: "Порушено validation або domain invariant" },
  "401": { $ref: "#/components/responses/AuthenticationRequired" },
  "403": { description: "Недостатньо прав" },
  "404": { description: "Рецепт не знайдено" },
  "429": { description: "Перевищено rate limit" },
};

export const recipeOpenApiPaths = Object.freeze({
  "/api/v1/admin/recipes": {
    get: {
      summary: "Переглянути й відфільтрувати рецепти",
      security: bearer,
      parameters: [
        "search",
        "status",
        "visibility",
        "recipeTypeId",
        "authorId",
        "page",
        "pageSize",
      ].map((name) => ({
        name,
        in: "query",
        required: false,
        schema: { type: name === "page" || name === "pageSize" ? "integer" : "string" },
      })),
      responses: { "200": { description: "Сторінка рецептів" }, ...errors },
    },
    post: {
      summary: "Створити рецепт із розрахунком поживності",
      description: "Дочірні записи та nutrient snapshot створюються атомарно.",
      security: bearer,
      requestBody: jsonBody("#/components/schemas/RecipeWrite"),
      responses: { "201": { description: "Рецепт створено" }, ...errors },
    },
  },
  "/api/v1/admin/recipes/nutrition-preview": {
    post: {
      summary: "Розрахувати попередню поживність рецепта",
      security: bearer,
      requestBody: jsonBody("#/components/schemas/RecipeNutritionPreviewRequest"),
      responses: { "200": { description: "Детермінований nutrition preview" }, ...errors },
    },
  },
  "/api/v1/admin/recipes/{id}": {
    get: {
      summary: "Переглянути адміністративні деталі рецепта",
      security: bearer,
      parameters: [id],
      responses: { "200": { description: "Повний admin contract" }, ...errors },
    },
    patch: {
      summary: "Атомарно оновити рецепт і передані дочірні колекції",
      security: bearer,
      parameters: [id],
      requestBody: jsonBody("#/components/schemas/RecipeUpdate"),
      responses: { "200": { description: "Рецепт оновлено" }, ...errors },
    },
  },
  "/api/v1/admin/recipes/{id}/status": {
    patch: {
      summary: "Змінити lifecycle status рецепта",
      security: bearer,
      parameters: [id],
      requestBody: jsonBody("#/components/schemas/RecipeStatusChange"),
      responses: { "200": { description: "Статус змінено" }, ...errors },
    },
  },
  "/api/v1/recipes/{id}": {
    get: {
      summary: "Переглянути опублікований публічний рецепт",
      description: "Повертає client read contract лише для PUBLISHED + PUBLIC recipe.",
      security: bearer,
      parameters: [id],
      responses: { "200": { description: "Клієнтські деталі рецепта" }, ...errors },
    },
  },
});

const ingredient = {
  type: "object",
  required: ["productId", "quantity", "isOptional"],
  properties: {
    productId: { type: "string", format: "uuid" },
    quantity: { oneOf: [{ type: "string" }, { type: "number" }] },
    measurementUnitId: { type: ["string", "null"], format: "uuid" },
    productPortionId: { type: ["string", "null"], format: "uuid" },
    gramWeight: { oneOf: [{ type: "string" }, { type: "number" }, { type: "null" }] },
    isOptional: { type: "boolean" },
    note: { type: ["string", "null"], maxLength: 300 },
  },
};

export const recipeOpenApiSchemas = Object.freeze({
  RecipeIngredientWrite: ingredient,
  RecipeWrite: {
    type: "object",
    required: ["title", "visibility", "ingredients", "steps"],
    properties: {
      title: { type: "string", maxLength: 240 },
      summary: { type: ["string", "null"], maxLength: 500 },
      description: { type: ["string", "null"] },
      visibility: { type: "string", enum: ["FAMILY", "PUBLIC"] },
      difficulty: { type: ["string", "null"], enum: ["EASY", "MEDIUM", "HARD", null] },
      recipeTypeId: { type: ["string", "null"], format: "uuid" },
      authorId: { type: ["string", "null"], format: "uuid" },
      baseServings: { type: ["integer", "null"], minimum: 1 },
      yieldWeightG: { oneOf: [{ type: "string" }, { type: "number" }, { type: "null" }] },
      ingredients: {
        type: "array",
        minItems: 1,
        items: { $ref: "#/components/schemas/RecipeIngredientWrite" },
      },
      steps: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["instruction"],
          properties: {
            instruction: { type: "string", maxLength: 4000 },
            timerSeconds: { type: ["integer", "null"] },
          },
        },
      },
      sources: { type: "array", items: { type: "object" } },
      cuisineIds: { type: "array", items: { type: "string", format: "uuid" } },
      dietaryTagIds: { type: "array", items: { type: "string", format: "uuid" } },
      videos: { type: "array", items: { type: "object" } },
    },
  },
  RecipeUpdate: { type: "object", minProperties: 1, additionalProperties: true },
  RecipeNutritionPreviewRequest: {
    type: "object",
    required: ["ingredients"],
    properties: { ingredients: { type: "array", minItems: 1, items: ingredient } },
  },
  RecipeStatusChange: {
    type: "object",
    required: ["status"],
    properties: { status: { type: "string", enum: ["DRAFT", "READY", "PUBLISHED", "ARCHIVED"] } },
  },
});
