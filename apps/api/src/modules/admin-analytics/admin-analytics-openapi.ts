const metric = {
  type: "object",
  required: ["value", "previousValue", "delta", "deltaPercent"],
  properties: {
    value: { type: "number" },
    previousValue: { type: "number" },
    delta: { type: "number" },
    deltaPercent: { type: ["number", "null"] },
  },
} as const;

const periodParameters = [
  { name: "from", in: "query", schema: { type: "string", format: "date" } },
  { name: "to", in: "query", schema: { type: "string", format: "date" } },
  {
    name: "granularity",
    in: "query",
    schema: { type: "string", enum: ["day", "week", "month"] },
  },
  {
    name: "timezone",
    in: "query",
    schema: { type: "string", default: "Europe/Kyiv" },
  },
] as const;

export const adminAnalyticsOpenApiPaths = Object.freeze({
  "/api/v1/admin/analytics/users": {
    get: {
      summary: "Отримати агреговану аналітику користувачів",
      description:
        "Поточні totals виключають логічно видалені або архівні записи. Creation series зберігає історичні події та включає записи, архівовані пізніше.",
      security: [{ bearerAuth: [] }],
      parameters: periodParameters,
      responses: {
        "200": {
          description: "Users analytics без персональних даних",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["data"],
                properties: { data: { $ref: "#/components/schemas/UsersAnalytics" } },
              },
            },
          },
        },
        "400": { description: "Некоректний period або timezone" },
        "401": { $ref: "#/components/responses/AuthenticationRequired" },
        "403": { description: "Потрібна роль ADMIN" },
        "429": { description: "Перевищено rate limit" },
      },
    },
  },
  "/api/v1/admin/analytics/references": {
    get: {
      summary: "Отримати стан довідників і сигнали якості даних",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Агреговані reference metrics",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["data"],
                properties: { data: { $ref: "#/components/schemas/ReferencesAnalytics" } },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/AuthenticationRequired" },
        "403": { description: "Потрібна роль ADMIN" },
        "429": { description: "Перевищено rate limit" },
      },
    },
  },
  "/api/v1/admin/analytics/products": {
    get: {
      summary: "Отримати агреговану аналітику продуктів",
      description:
        "Totals і breakdowns охоплюють увесь каталог. Операційні KPI та rankings виключають архівні продукти. Creation series є історичною.",
      security: [{ bearerAuth: [] }],
      parameters: periodParameters,
      responses: {
        "200": {
          description: "Products analytics",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["data"],
                properties: { data: { $ref: "#/components/schemas/ProductsAnalytics" } },
              },
            },
          },
        },
        "400": { description: "Некоректний period або timezone" },
        "401": { $ref: "#/components/responses/AuthenticationRequired" },
        "403": { description: "Потрібна роль ADMIN" },
        "429": { description: "Перевищено rate limit" },
      },
    },
  },
  "/api/v1/admin/analytics/recipes": {
    get: {
      summary: "Отримати агреговану аналітику рецептів",
      description:
        "Totals і breakdowns охоплюють всю історію. Операційні KPI та rankings виключають архівні рецепти. Доменний автор і користувач-створювач подані окремо.",
      security: [{ bearerAuth: [] }],
      parameters: periodParameters,
      responses: {
        "200": {
          description: "Recipes analytics",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["data"],
                properties: { data: { $ref: "#/components/schemas/RecipesAnalytics" } },
              },
            },
          },
        },
        "400": { description: "Некоректний period або timezone" },
        "401": { $ref: "#/components/responses/AuthenticationRequired" },
        "403": { description: "Потрібна роль ADMIN" },
        "429": { description: "Перевищено rate limit" },
      },
    },
  },
});

export const adminAnalyticsOpenApiSchemas = Object.freeze({
  UsersAnalytics: {
    type: "object",
    required: ["meta", "totals", "completion", "averages", "created", "series"],
    properties: {
      meta: {
        type: "object",
        required: ["from", "to", "granularity", "timezone", "generatedAt"],
        properties: {
          from: { type: "string", format: "date" },
          to: { type: "string", format: "date" },
          granularity: { type: "string", enum: ["day", "week", "month"] },
          timezone: { type: "string" },
          generatedAt: { type: "string", format: "date-time" },
        },
      },
      totals: {
        type: "object",
        additionalProperties: { type: "integer", minimum: 0 },
      },
      completion: { type: "object" },
      averages: { type: "object" },
      created: {
        type: "object",
        required: ["users", "families", "profiles"],
        properties: { users: metric, families: metric, profiles: metric },
      },
      series: {
        type: "array",
        items: {
          type: "object",
          required: ["period", "users", "families", "profiles"],
          properties: {
            period: { type: "string", format: "date" },
            users: { type: "integer", minimum: 0 },
            families: { type: "integer", minimum: 0 },
            profiles: { type: "integer", minimum: 0 },
          },
        },
      },
    },
  },
  ReferencesAnalytics: {
    type: "object",
    required: ["generatedAt", "resources", "brands", "authors", "quality"],
    properties: {
      generatedAt: { type: "string", format: "date-time" },
      resources: {
        type: "array",
        items: {
          type: "object",
          required: ["resource", "total", "active", "inactive"],
          properties: {
            resource: { type: "string" },
            total: { type: "integer", minimum: 0 },
            active: { type: "integer", minimum: 0 },
            inactive: { type: "integer", minimum: 0 },
          },
        },
      },
      brands: { type: "object" },
      authors: { type: "object" },
      quality: { type: "object" },
    },
  },
  ProductsAnalytics: {
    type: "object",
    required: ["meta", "totals", "created", "breakdowns", "rankings", "series"],
    properties: {
      meta: {
        type: "object",
        required: ["from", "to", "granularity", "timezone", "generatedAt"],
        properties: {
          from: { type: "string", format: "date" },
          to: { type: "string", format: "date" },
          granularity: { type: "string", enum: ["day", "week", "month"] },
          timezone: { type: "string" },
          generatedAt: { type: "string", format: "date-time" },
        },
      },
      totals: { type: "object", additionalProperties: { type: "integer", minimum: 0 } },
      created: metric,
      breakdowns: { type: "object" },
      rankings: { type: "object" },
      series: {
        type: "array",
        items: {
          type: "object",
          required: ["period", "value"],
          properties: {
            period: { type: "string", format: "date" },
            value: { type: "integer", minimum: 0 },
          },
        },
      },
    },
  },
  RecipesAnalytics: {
    type: "object",
    required: ["meta", "totals", "created", "breakdowns", "rankings", "series"],
    properties: {
      meta: {
        type: "object",
        required: ["from", "to", "granularity", "timezone", "generatedAt"],
        properties: {
          from: { type: "string", format: "date" },
          to: { type: "string", format: "date" },
          granularity: { type: "string", enum: ["day", "week", "month"] },
          timezone: { type: "string" },
          generatedAt: { type: "string", format: "date-time" },
        },
      },
      totals: { type: "object", additionalProperties: { type: "integer", minimum: 0 } },
      created: metric,
      breakdowns: { type: "object" },
      rankings: { type: "object" },
      series: {
        type: "array",
        items: {
          type: "object",
          required: ["period", "value"],
          properties: {
            period: { type: "string", format: "date" },
            value: { type: "integer", minimum: 0 },
          },
        },
      },
    },
  },
});
