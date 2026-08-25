export const mealPlanOpenApiPaths = Object.freeze({
  "/api/v1/meal-plans/week": {
    get: {
      summary: "Отримати тижневе представлення плану харчування",
      description:
        "Read-only family-scoped модель. Не створює MealPlan під час читання; сортування, групування та персональні нутрієнтні агрегації формує backend.",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "date",
          in: "query",
          required: false,
          schema: { type: "string", format: "date" },
          description: "Будь-яка дата потрібного тижня",
        },
      ],
      responses: {
        "200": {
          description: "Канонічний тиждень із днями, прийомами їжі та учасниками",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["data"],
                properties: { data: { $ref: "#/components/schemas/MealPlanWeek" } },
              },
            },
          },
        },
        "400": { description: "Некоректна дата" },
        "401": { $ref: "#/components/responses/AuthenticationRequired" },
        "409": { description: "Невалідний активний сімейний контекст" },
        "429": { description: "Перевищено rate limit" },
      },
    },
  },
});

export const mealPlanOpenApiSchemas = Object.freeze({
  MealPlanWeek: {
    type: "object",
    required: [
      "planId",
      "familyName",
      "weekStart",
      "weekEnd",
      "weekStartsOn",
      "timeZone",
      "days",
      "members",
    ],
    properties: {
      planId: { type: ["string", "null"], format: "uuid" },
      familyName: { type: "string" },
      weekStart: { type: "string", format: "date" },
      weekEnd: { type: "string", format: "date" },
      weekStartsOn: { type: "string" },
      timeZone: { type: "string" },
      days: {
        type: "array",
        items: {
          type: "object",
          required: ["date", "meals"],
          properties: {
            date: { type: "string", format: "date" },
            meals: { type: "array", items: { type: "object" } },
          },
        },
      },
      members: {
        type: "array",
        items: {
          type: "object",
          required: ["memberId", "name", "consumed", "targets", "completeness"],
          properties: {
            memberId: { type: "string", format: "uuid" },
            name: { type: "string" },
            consumed: { type: "array", items: { type: "object" } },
            targets: { type: "array", items: { type: "object" } },
            completeness: { type: "string", enum: ["complete", "partial", "unavailable"] },
          },
        },
      },
    },
  },
});
