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
});
