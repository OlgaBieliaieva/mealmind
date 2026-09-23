const security = [{ bearerAuth: [] }];
const sessionParameter = {
  name: "sessionId",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
} as const;
const ingredientParameter = {
  name: "ingredientId",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
} as const;
const stepParameter = {
  name: "stepId",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
} as const;
const errors = {
  "401": { $ref: "#/components/responses/AuthenticationRequired" },
  "404": { description: "Session або пов’язаний ресурс не знайдено" },
  "409": { description: "Конфлікт revision, allocation або незавершені позиції" },
  "422": { description: "Порушено cooking validation" },
  "429": { description: "Перевищено rate limit" },
} as const;
const sessionResponse = {
  "200": {
    description: "Актуальна проєкція CookingSession",
    content: {
      "application/json": {
        schema: {
          type: "object",
          required: ["data"],
          properties: { data: { $ref: "#/components/schemas/CookingSession" } },
        },
      },
    },
  },
  ...errors,
} as const;
const requestBody = (schema: string) => ({
  required: true,
  content: { "application/json": { schema: { $ref: `#/components/schemas/${schema}` } } },
});

export const cookingOpenApiPaths = Object.freeze({
  "/api/v1/cooking-sessions": {
    post: {
      summary: "Почати або відновити приготування для вибраних позицій плану",
      description:
        "Створює один immutable recipe snapshot для однієї або кількох MealEntry того самого рецепта. requestId забезпечує ідемпотентність.",
      security,
      requestBody: requestBody("StartCookingSession"),
      responses: sessionResponse,
    },
  },
  "/api/v1/cooking-sessions/{sessionId}": {
    get: {
      summary: "Отримати CookingSession",
      security,
      parameters: [sessionParameter],
      responses: sessionResponse,
    },
  },
  "/api/v1/cooking-sessions/{sessionId}/ingredients/{ingredientId}": {
    patch: {
      summary: "Підтвердити, пропустити або замінити інгредієнт",
      security,
      parameters: [sessionParameter, ingredientParameter],
      requestBody: requestBody("UpdateCookingIngredient"),
      responses: sessionResponse,
    },
    delete: {
      summary: "Видалити доданий під час приготування інгредієнт",
      security,
      parameters: [
        sessionParameter,
        ingredientParameter,
        {
          name: "expectedRevision",
          in: "query",
          required: true,
          schema: { type: "integer", minimum: 0 },
        },
      ],
      responses: sessionResponse,
    },
  },
  "/api/v1/cooking-sessions/{sessionId}/ingredients": {
    post: {
      summary: "Додати інгредієнт під час приготування",
      security,
      parameters: [sessionParameter],
      requestBody: requestBody("AddCookingIngredient"),
      responses: sessionResponse,
    },
  },
  "/api/v1/cooking-sessions/{sessionId}/steps/{stepId}": {
    patch: {
      summary: "Завершити або пропустити крок",
      security,
      parameters: [sessionParameter, stepParameter],
      requestBody: requestBody("UpdateCookingStep"),
      responses: sessionResponse,
    },
  },
  "/api/v1/cooking-sessions/{sessionId}/yield": {
    patch: {
      summary: "Зберегти вагу готової страви",
      security,
      parameters: [sessionParameter],
      requestBody: requestBody("UpdateCookingYield"),
      responses: sessionResponse,
    },
  },
  "/api/v1/cooking-sessions/{sessionId}/complete": {
    post: {
      summary: "Явно завершити приготування",
      description:
        "Не виконується автоматично після останнього checkbox. resolvePending=true підтверджує нерозв’язані позиції за recipe snapshot.",
      security,
      parameters: [sessionParameter],
      requestBody: requestBody("CompleteCookingSession"),
      responses: sessionResponse,
    },
  },
  "/api/v1/cooking-sessions/{sessionId}/cancel": {
    post: {
      summary: "Скасувати приготування і звільнити позиції плану",
      security,
      parameters: [sessionParameter],
      requestBody: requestBody("CookingRevision"),
      responses: sessionResponse,
    },
  },
});

const uuid = { type: "string", format: "uuid" } as const;
const revision = { type: "integer", minimum: 0 } as const;
const grams = { type: "number", exclusiveMinimum: 0, maximum: 1_000_000 } as const;
const nullableGrams = { type: ["number", "null"] } as const;

export const cookingOpenApiSchemas = Object.freeze({
  CookingRevision: {
    type: "object",
    additionalProperties: false,
    required: ["expectedRevision"],
    properties: { expectedRevision: revision },
  },
  StartCookingSession: {
    type: "object",
    additionalProperties: false,
    required: ["requestId", "mealEntries"],
    properties: {
      requestId: uuid,
      mealEntries: {
        type: "array",
        minItems: 1,
        maxItems: 31,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "expectedRevision"],
          properties: { id: uuid, expectedRevision: revision },
        },
      },
    },
  },
  UpdateCookingIngredient: {
    type: "object",
    additionalProperties: false,
    required: ["expectedRevision", "status"],
    properties: {
      expectedRevision: revision,
      status: { type: "string", enum: ["USED", "OMITTED", "SUBSTITUTED"] },
      productId: uuid,
      quantityGrams: grams,
    },
  },
  AddCookingIngredient: {
    type: "object",
    additionalProperties: false,
    required: ["expectedRevision", "productId", "quantityGrams"],
    properties: { expectedRevision: revision, productId: uuid, quantityGrams: grams },
  },
  UpdateCookingStep: {
    type: "object",
    additionalProperties: false,
    required: ["expectedRevision", "status"],
    properties: {
      expectedRevision: revision,
      status: { type: "string", enum: ["COMPLETED", "SKIPPED"] },
    },
  },
  UpdateCookingYield: {
    oneOf: [
      {
        type: "object",
        additionalProperties: false,
        required: ["expectedRevision", "method", "actualWeightG"],
        properties: {
          expectedRevision: revision,
          method: { const: "DIRECT" },
          actualWeightG: grams,
        },
      },
      {
        type: "object",
        additionalProperties: false,
        required: ["expectedRevision", "method", "tareWeightG", "grossWeightG"],
        properties: {
          expectedRevision: revision,
          method: { const: "CONTAINER_DIFFERENCE" },
          tareWeightG: { type: "number", minimum: 0, maximum: 1_000_000 },
          grossWeightG: grams,
        },
      },
      {
        type: "object",
        additionalProperties: false,
        required: ["expectedRevision", "method"],
        properties: { expectedRevision: revision, method: { type: "null" } },
      },
    ],
  },
  CompleteCookingSession: {
    type: "object",
    additionalProperties: false,
    required: ["expectedRevision", "resolvePending"],
    properties: { expectedRevision: revision, resolvePending: { type: "boolean" } },
  },
  CookingSession: {
    type: "object",
    required: [
      "id",
      "recipeId",
      "status",
      "revision",
      "startedAt",
      "completedAt",
      "cancelledAt",
      "recipe",
      "planEntries",
      "ingredients",
      "steps",
      "progress",
      "nutrition",
      "yield",
      "hasCookingProgress",
      "canComplete",
    ],
    properties: {
      id: uuid,
      recipeId: uuid,
      status: { type: "string", enum: ["IN_PROGRESS", "COMPLETED", "CANCELLED"] },
      revision,
      startedAt: { type: "string", format: "date-time" },
      completedAt: { type: ["string", "null"], format: "date-time" },
      cancelledAt: { type: ["string", "null"], format: "date-time" },
      recipe: {
        type: "object",
        required: [
          "title",
          "summary",
          "description",
          "difficulty",
          "prepTimeMin",
          "cookTimeMin",
          "restTimeMin",
          "imageUrl",
        ],
        properties: {
          title: { type: "string" },
          summary: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
          difficulty: { type: ["string", "null"] },
          prepTimeMin: { type: ["integer", "null"] },
          cookTimeMin: { type: ["integer", "null"] },
          restTimeMin: { type: ["integer", "null"] },
          imageUrl: { type: ["string", "null"], format: "uri" },
        },
      },
      planEntries: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "date", "mealType", "plannedDemandWeightG", "removed"],
          properties: {
            id: uuid,
            date: { type: "string", format: "date" },
            mealType: { type: "string" },
            plannedDemandWeightG: grams,
            removed: { type: "boolean" },
          },
        },
      },
      ingredients: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "source", "position", "status", "planned", "actual"],
          properties: {
            id: uuid,
            source: { type: "string", enum: ["RECIPE", "ADDED_DURING_COOKING"] },
            position: { type: "integer", minimum: 0 },
            status: { type: "string", enum: ["PENDING", "USED", "OMITTED", "SUBSTITUTED"] },
            planned: { $ref: "#/components/schemas/CookingIngredientAmount" },
            actual: { $ref: "#/components/schemas/CookingIngredientAmount" },
          },
        },
      },
      steps: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "position", "instruction", "timerSeconds", "status"],
          properties: {
            id: uuid,
            position: { type: "integer", minimum: 0 },
            instruction: { type: "string" },
            timerSeconds: { type: ["integer", "null"], minimum: 0 },
            status: { type: "string", enum: ["PENDING", "COMPLETED", "SKIPPED"] },
          },
        },
      },
      progress: {
        type: "object",
        required: ["resolvedIngredients", "totalIngredients", "resolvedSteps", "totalSteps"],
        properties: {
          resolvedIngredients: { type: "integer", minimum: 0 },
          totalIngredients: { type: "integer", minimum: 0 },
          resolvedSteps: { type: "integer", minimum: 0 },
          totalSteps: { type: "integer", minimum: 0 },
        },
      },
      nutrition: {
        type: "object",
        required: ["basis", "completeness", "nutrients"],
        properties: {
          basis: { type: "string", enum: ["ACTUAL", "PLANNED_ESTIMATE", "UNAVAILABLE"] },
          completeness: { type: "string", enum: ["COMPLETE", "PARTIAL", "UNVERIFIED"] },
          nutrients: {
            type: "array",
            items: {
              type: "object",
              required: ["nutrientId", "code", "name", "unit", "valueTotal", "valuePer100g"],
              properties: {
                nutrientId: uuid,
                code: { type: "string" },
                name: { type: "string" },
                unit: { type: "string" },
                valueTotal: { type: "number" },
                valuePer100g: nullableGrams,
              },
            },
          },
        },
      },
      yield: {
        type: "object",
        required: ["plannedWeightG", "actualWeightG", "method", "tareWeightG", "grossWeightG"],
        properties: {
          plannedWeightG: { type: "number", minimum: 0 },
          actualWeightG: nullableGrams,
          method: { type: ["string", "null"], enum: ["DIRECT", "CONTAINER_DIFFERENCE", null] },
          tareWeightG: nullableGrams,
          grossWeightG: nullableGrams,
        },
      },
      hasCookingProgress: { type: "boolean" },
      canComplete: { type: "boolean" },
    },
  },
  CookingIngredientAmount: {
    type: ["object", "null"],
    required: ["productId", "productName", "quantity", "unit", "gramWeight"],
    properties: {
      productId: uuid,
      productName: { type: "string" },
      quantity: { type: "number" },
      unit: { type: ["string", "null"] },
      gramWeight: nullableGrams,
    },
  },
});
