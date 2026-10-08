const securityResponses = {
  "401": { $ref: "#/components/responses/AuthenticationRequired" },
  "403": { description: "Потрібна роль ADMIN" },
  "429": { description: "Перевищено rate limit" },
} as const;

const candidateIdParameter = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
} as const;

const mutationRequest = (extraProperties: Readonly<Record<string, unknown>> = {}) => ({
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["expectedUpdatedAt", ...Object.keys(extraProperties)],
        properties: {
          expectedUpdatedAt: { type: "string", format: "date-time" },
          comment: { type: ["string", "null"], maxLength: 4000 },
          ...extraProperties,
        },
      },
    },
  },
});

export const productImportReviewOpenApiPaths = Object.freeze({
  "/api/v1/admin/product-import/candidates": {
    get: {
      summary: "Отримати чергу кандидатів імпорту продуктів",
      description:
        "Повертає staging-кандидатів без створення канонічних Product. Доступно лише адміністратору.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "search", in: "query", schema: { type: "string" } },
        { name: "batchId", in: "query", schema: { type: "string", format: "uuid" } },
        {
          name: "disposition",
          in: "query",
          schema: { type: "string", enum: ["CANDIDATE", "REVIEW_REQUIRED", "REJECTED"] },
        },
        {
          name: "status",
          in: "query",
          schema: {
            type: "string",
            enum: ["PENDING", "IN_REVIEW", "APPROVED", "REJECTED", "DEFERRED", "PUBLISHED"],
          },
        },
        { name: "matchStatus", in: "query", schema: { type: "string" } },
        { name: "reasonCode", in: "query", schema: { type: "string" } },
        { name: "reviewedByUserId", in: "query", schema: { type: "string", format: "uuid" } },
        { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
        {
          name: "pageSize",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 100, default: 25 },
        },
      ],
      responses: {
        "200": { description: "Сторінка staging-кандидатів" },
        "400": { description: "Некоректні фільтри" },
        ...securityResponses,
      },
    },
  },
  "/api/v1/admin/product-import/candidates/{id}": {
    get: {
      summary: "Отримати кандидата для ручної перевірки",
      description:
        "Повертає source snapshot, review draft, provenance, audit events і можливі збіги з каталогом за GTIN або назвою/брендом.",
      security: [{ bearerAuth: [] }],
      parameters: [candidateIdParameter],
      responses: {
        "200": { description: "Кандидат і підказки зіставлення" },
        "404": { description: "Кандидата не знайдено" },
        ...securityResponses,
      },
    },
  },
  "/api/v1/admin/product-import/candidates/{id}/review": {
    post: {
      summary: "Розпочати ручну перевірку кандидата",
      description:
        "Переводить PENDING або DEFERRED у IN_REVIEW і закріплює кандидата за поточним адміністратором.",
      security: [{ bearerAuth: [] }],
      parameters: [candidateIdParameter],
      requestBody: mutationRequest(),
      responses: {
        "200": { description: "Перевірку розпочато" },
        "404": { description: "Кандидата не знайдено" },
        "409": { description: "Кандидат змінено або його перевіряє інший адміністратор" },
        ...securityResponses,
      },
    },
    patch: {
      summary: "Оновити review draft кандидата",
      description:
        "Виконує поверхневе злиття переданих полів із review draft і додає audit event. Source snapshot не змінюється.",
      security: [{ bearerAuth: [] }],
      parameters: [candidateIdParameter],
      requestBody: mutationRequest({
        patch: { type: "object", minProperties: 1, maxProperties: 50, additionalProperties: true },
      }),
      responses: {
        "200": { description: "Чернетку оновлено" },
        "400": { description: "Некоректний patch" },
        "404": { description: "Кандидата не знайдено" },
        "409": { description: "Конфлікт revision, статусу або власника review" },
        ...securityResponses,
      },
    },
  },
  "/api/v1/admin/product-import/candidates/{id}/decision": {
    post: {
      summary: "Зафіксувати рішення ручної перевірки",
      description:
        "Переводить IN_REVIEW у APPROVED, REJECTED або DEFERRED. APPROVED ще не створює Product; публікація є окремою транзакційною операцією.",
      security: [{ bearerAuth: [] }],
      parameters: [candidateIdParameter],
      requestBody: mutationRequest({
        decision: { type: "string", enum: ["APPROVE", "REJECT", "DEFER"] },
      }),
      responses: {
        "200": { description: "Рішення зафіксовано" },
        "404": { description: "Кандидата не знайдено" },
        "409": { description: "Конфлікт revision, статусу або власника review" },
        "422": {
          description:
            "Для відхилення не вказано коментар або схвалювана чернетка не готова до публікації",
        },
        ...securityResponses,
      },
    },
  },
  "/api/v1/admin/product-import/candidates/{id}/reopen": {
    post: {
      summary: "Повторно відкрити перевірку кандидата",
      description:
        "Повертає APPROVED, REJECTED або DEFERRED у IN_REVIEW. Опублікований кандидат є незмінним.",
      security: [{ bearerAuth: [] }],
      parameters: [candidateIdParameter],
      requestBody: mutationRequest(),
      responses: {
        "200": { description: "Перевірку повторно відкрито" },
        "404": { description: "Кандидата не знайдено" },
        "409": { description: "Перехід статусу неможливий або revision застарів" },
        ...securityResponses,
      },
    },
  },
  "/api/v1/admin/product-import/candidates/{id}/publish": {
    post: {
      summary: "Опублікувати перевірений кандидат продукту",
      description:
        "Атомарно створює або доповнює Product, ProductPackage, label nutrients, package metadata і source references; лише після успіху переводить APPROVED у PUBLISHED.",
      security: [{ bearerAuth: [] }],
      parameters: [candidateIdParameter],
      requestBody: mutationRequest(),
      responses: {
        "200": { description: "Кандидат опубліковано" },
        "404": { description: "Кандидата не знайдено" },
        "409": { description: "Конфлікт revision, GTIN або source identity" },
        "422": { description: "Review draft не містить обов’язкових canonical даних" },
        ...securityResponses,
      },
    },
  },
});

export const productImportReviewOpenApiSchemas = Object.freeze({});
