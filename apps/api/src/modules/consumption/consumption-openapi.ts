const security = [{ bearerAuth: [] }];
const dateParameter = {
  name: "date",
  in: "query",
  required: true,
  schema: { type: "string", format: "date" },
} as const;
const datesParameter = {
  name: "dates",
  in: "query",
  required: true,
  description: "Від однієї до 31 унікальної локальної дати через кому",
  schema: { type: "string", example: "2026-09-01,2026-09-02" },
} as const;
const errors = {
  "401": { $ref: "#/components/responses/AuthenticationRequired" },
  "403": { description: "Немає права керувати вибраним сімейним профілем" },
  "404": { description: "Позицію не знайдено в активній сім’ї" },
  "409": { description: "Конфлікт revision або lifecycle факту" },
  "422": { description: "Некоректна дата, порція або catalog food" },
  "429": { description: "Перевищено rate limit" },
} as const;
const diaryResponse = {
  "200": {
    description: "Денний read model щоденника",
    content: {
      "application/json": {
        schema: {
          type: "object",
          required: ["data"],
          properties: { data: { $ref: "#/components/schemas/ConsumptionDiaryDay" } },
        },
      },
    },
  },
  ...errors,
} as const;
const dashboardResponse = {
  "200": {
    description: "Агрегований read model dashboard за вибраний період",
    content: {
      "application/json": {
        schema: {
          type: "object",
          required: ["data"],
          properties: { data: { $ref: "#/components/schemas/ConsumptionDashboard" } },
        },
      },
    },
  },
  ...errors,
} as const;
const participantParameter = {
  name: "participantId",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
} as const;
const entryParameter = {
  name: "entryId",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
} as const;

export const consumptionOpenApiPaths = Object.freeze({
  "/api/v1/consumption/diary": {
    get: {
      summary: "Отримати щоденник за один день",
      description:
        "Повертає приготовані планові позиції як derived pending-кандидати та підтверджені факти. OWNER бачить усю сім’ю, MEMBER — лише себе.",
      security,
      parameters: [dateParameter],
      responses: diaryResponse,
    },
  },
  "/api/v1/consumption/dashboard": {
    get: {
      summary: "Отримати сімейний dashboard за період",
      description:
        "Повертає plan-vs-fact, макронутрієнти, персональні цілі та вагу на межах періоду. OWNER бачить усі профілі, MEMBER — лише власний.",
      security,
      parameters: [datesParameter],
      responses: dashboardResponse,
    },
  },
  "/api/v1/consumption/plan/{participantId}/confirm": {
    post: {
      summary: "Підтвердити фактичне споживання планової позиції",
      description:
        "Створює ConsumptionEntry лише після явної дії. Повторне підтвердження відновлює раніше скасований факт.",
      security,
      parameters: [participantParameter],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ConfirmPlannedConsumption" },
          },
        },
      },
      responses: diaryResponse,
    },
  },
  "/api/v1/consumption/plan/{participantId}/skip": {
    post: {
      summary: "Позначити планову позицію як пропущену",
      security,
      parameters: [participantParameter],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/ConsumptionDateBody" } },
        },
      },
      responses: diaryResponse,
    },
  },
  "/api/v1/consumption/plan/{participantId}/restore": {
    post: {
      summary: "Відновити явно пропущену планову позицію",
      description: "Повертає позицію зі SKIPPED до очікування підтвердження.",
      security,
      parameters: [participantParameter],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/ConsumptionDateBody" } },
        },
      },
      responses: diaryResponse,
    },
  },
  "/api/v1/consumption/entries/{entryId}": {
    patch: {
      summary: "Змінити фактичну порцію або прийом їжі",
      description:
        "Optimistic concurrency за expectedRevision; nutrient snapshot перераховується, відмінність від плану стає CHANGED.",
      security,
      parameters: [entryParameter],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateConsumptionQuantity" },
          },
        },
      },
      responses: diaryResponse,
    },
  },
  "/api/v1/consumption/entries/{entryId}/void": {
    post: {
      summary: "Скасувати факт споживання",
      description:
        "Переводить факт у VOIDED. Для планової позиції resolution стає UNCONFIRMED, чекбокс — false; явний SKIPPED керується окремою дією.",
      security,
      parameters: [entryParameter],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/VoidConsumption" } },
        },
      },
      responses: diaryResponse,
    },
  },
  "/api/v1/consumption/entries/manual": {
    post: {
      summary: "Додати спожиту поза планом їжу",
      description:
        "Приймає рівно один catalog source: product або recipe. Дефолтна порція web-клієнта — 100 г.",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/AddManualConsumption" } },
        },
      },
      responses: { "201": diaryResponse["200"], ...errors },
    },
  },
});

const date = { type: "string", format: "date" } as const;
const grams = { type: "number", exclusiveMinimum: 0, maximum: 100000 } as const;
export const consumptionOpenApiSchemas = Object.freeze({
  ConsumptionDiaryDay: {
    type: "object",
    required: ["familyName", "role", "selfMemberId", "date", "timeZone", "members"],
    properties: {
      familyName: { type: "string" },
      role: { type: "string", enum: ["OWNER", "MEMBER"] },
      selfMemberId: { type: ["string", "null"], format: "uuid" },
      date,
      timeZone: { type: "string" },
      members: {
        type: "array",
        items: {
          type: "object",
          description: "Member-scoped summary, targets, nutrients and diary items",
        },
      },
    },
  },
  ConsumptionDashboard: {
    type: "object",
    required: [
      "familyName",
      "role",
      "selfMemberId",
      "dates",
      "periodStart",
      "periodEnd",
      "timeZone",
      "members",
    ],
    properties: {
      familyName: { type: "string" },
      role: { type: "string", enum: ["OWNER", "MEMBER"] },
      selfMemberId: { type: ["string", "null"], format: "uuid" },
      dates: { type: "array", minItems: 1, maxItems: 31, items: date },
      periodStart: date,
      periodEnd: date,
      timeZone: { type: "string" },
      members: {
        type: "array",
        items: {
          type: "object",
          description:
            "Member-scoped period summary, aggregated nutrients, scaled targets and boundary weights",
        },
      },
    },
  },
  ConfirmPlannedConsumption: {
    type: "object",
    additionalProperties: false,
    properties: { quantityGrams: grams },
  },
  ConsumptionDateBody: {
    type: "object",
    additionalProperties: false,
    required: ["date"],
    properties: { date },
  },
  UpdateConsumptionQuantity: {
    type: "object",
    additionalProperties: false,
    required: ["expectedRevision", "quantityGrams", "mealTypeId", "date"],
    properties: {
      expectedRevision: { type: "integer", minimum: 0 },
      quantityGrams: grams,
      mealTypeId: { type: "string", format: "uuid" },
      date,
    },
  },
  VoidConsumption: {
    type: "object",
    additionalProperties: false,
    required: ["expectedRevision", "date"],
    properties: { expectedRevision: { type: "integer", minimum: 0 }, date },
  },
  AddManualConsumption: {
    type: "object",
    additionalProperties: false,
    required: ["memberId", "date", "kind", "foodId", "mealTypeId", "quantityGrams"],
    properties: {
      memberId: { type: "string", format: "uuid" },
      date,
      kind: { type: "string", enum: ["product", "recipe"] },
      foodId: { type: "string", format: "uuid" },
      mealTypeId: { type: "string", format: "uuid" },
      quantityGrams: grams,
    },
  },
});
