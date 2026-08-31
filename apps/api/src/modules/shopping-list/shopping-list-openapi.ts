const security = [{ bearerAuth: [] }];
const standardErrors = {
  "401": { $ref: "#/components/responses/AuthenticationRequired" },
  "404": { description: "Список або позицію не знайдено в активній сім’ї" },
  "409": { description: "Конфлікт revision, lifecycle або open version" },
  "422": { description: "Період або дані позиції не відповідають бізнес-правилам" },
  "429": { description: "Перевищено rate limit" },
} as const;

export const shoppingListOpenApiPaths = Object.freeze({
  "/api/v1/shopping-lists": {
    get: {
      summary: "Перелічити сімейні списки покупок",
      security,
      responses: {
        "200": { description: "Списки, відсортовані за близькістю періоду" },
        ...standardErrors,
      },
    },
    post: {
      summary: "Створити versioned snapshot із meal plan",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/GenerateShoppingListInput" },
          },
        },
      },
      responses: { "201": { description: "Новий відкритий snapshot" }, ...standardErrors },
    },
  },
  "/api/v1/shopping-lists/{listId}": {
    get: {
      summary: "Отримати список із категоріями, позиціями та джерелами",
      security,
      parameters: [
        { name: "listId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: { "200": { description: "Persisted snapshot і stale state" }, ...standardErrors },
    },
  },
  "/api/v1/shopping-lists/{listId}/regenerate": {
    post: {
      summary: "Створити нову версію зі зміненого плану",
      security,
      parameters: [
        { name: "listId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: { "201": { description: "Нова версія; попередню архівовано" }, ...standardErrors },
    },
  },
  "/api/v1/shopping-lists/{listId}/status": {
    patch: {
      summary: "Завершити, повторно відкрити або архівувати список",
      security,
      parameters: [
        { name: "listId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: { "200": { description: "Оновлений список" }, ...standardErrors },
    },
  },
  "/api/v1/shopping-lists/{listId}/items/{itemId}": {
    patch: {
      summary: "Змінити requested quantity або notes без зміни unit",
      security,
      parameters: [
        { name: "listId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { name: "itemId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: { "200": { description: "Оновлений список" }, ...standardErrors },
    },
  },
  "/api/v1/shopping-lists/{listId}/items/{itemId}/status": {
    patch: {
      summary: "Придбати, скасувати придбання, видалити або відновити позицію",
      security,
      parameters: [
        { name: "listId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { name: "itemId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: { "200": { description: "Оновлений список" }, ...standardErrors },
    },
  },
  "/api/v1/shopping-lists/{listId}/items/catalog": {
    post: {
      summary: "Додати активний каталожний продукт",
      security,
      parameters: [
        { name: "listId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: { "201": { description: "Оновлений список" }, ...standardErrors },
    },
  },
  "/api/v1/shopping-lists/{listId}/items/custom": {
    post: {
      summary: "Додати власну позицію без створення Product",
      security,
      parameters: [
        { name: "listId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: { "201": { description: "Оновлений список" }, ...standardErrors },
    },
  },
});

export const shoppingListOpenApiSchemas = Object.freeze({
  GenerateShoppingListInput: {
    type: "object",
    additionalProperties: false,
    required: ["mealPlanId", "periodStart", "periodEnd"],
    properties: {
      mealPlanId: { type: "string", format: "uuid" },
      periodStart: { type: "string", format: "date" },
      periodEnd: { type: "string", format: "date" },
    },
  },
});
