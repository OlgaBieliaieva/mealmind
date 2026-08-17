export const productOpenApiPaths = Object.freeze({
  "/api/v1/products/search": {
    get: {
      summary: "Пошук активних продуктів",
      description:
        "Authenticated lightweight пошук ACTIVE продуктів для клієнтських selector-ів. Повертає мінімальні display-поля без nutrients, portions і media.",
      security: [{ bearerAuth: [] }],
      parameters: [
        query("search", { type: "string", minLength: 2, maxLength: 120 }),
        query("page", { type: "integer", minimum: 1, default: 1 }),
        query("pageSize", { type: "integer", minimum: 1, maximum: 50, default: 20 }),
      ],
      responses: {
        "200": {
          description: "Сторінка активних продуктів, що відповідають пошуку",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["data", "meta"],
                properties: {
                  data: {
                    type: "object",
                    required: ["items"],
                    properties: {
                      items: {
                        type: "array",
                        items: { $ref: "#/components/schemas/ProductSearchItem" },
                      },
                    },
                  },
                  meta: {
                    type: "object",
                    required: ["page", "pageSize", "total"],
                    properties: {
                      page: { type: "integer", minimum: 1 },
                      pageSize: { type: "integer", minimum: 1 },
                      total: { type: "integer", minimum: 0 },
                    },
                  },
                },
              },
            },
          },
        },
        "400": { description: "Параметри пошуку не пройшли валідацію" },
        "401": { $ref: "#/components/responses/AuthenticationRequired" },
      },
    },
  },
  "/api/v1/admin/products": {
    get: {
      summary: "Переглянути й відфільтрувати продукти",
      security: [{ bearerAuth: [] }],
      parameters: [
        query("search", { type: "string", maxLength: 120 }),
        query("type", { type: "string", enum: ["GENERIC", "BRANDED"] }),
        query("status", { type: "string", enum: ["DRAFT", "ACTIVE", "ARCHIVED"] }),
        query("categoryId", { type: "string", format: "uuid" }),
        query("brandId", { type: "string", format: "uuid" }),
        query("page", { type: "integer", minimum: 1, default: 1 }),
        query("pageSize", { type: "integer", minimum: 1, maximum: 100, default: 20 }),
      ],
      responses: adminResponses("Сторінка продуктів із серверною пагінацією"),
    },
    post: {
      summary: "Створити generic або branded продукт",
      description:
        "Branded продукт успадковує пропущені category, unit, food state, nutrients і portions як контрольований snapshot generic base.",
      security: [{ bearerAuth: [] }],
      requestBody: jsonBody("#/components/schemas/ProductCreate"),
      responses: {
        "201": { description: "Продукт створено" },
        ...adminErrorResponses(),
        "409": { description: "GTIN уже використовується" },
      },
    },
  },
  "/api/v1/admin/products/{id}": {
    get: {
      summary: "Переглянути деталі продукту",
      security: [{ bearerAuth: [] }],
      parameters: [idParameter()],
      responses: adminResponses("Деталі продукту, nutrients, portions і фото"),
    },
    patch: {
      summary: "Оновити дозволені поля продукту",
      description:
        "Пропущені nutrients або portions зберігаються без змін; переданий порожній масив явно очищає relation.",
      security: [{ bearerAuth: [] }],
      parameters: [idParameter()],
      requestBody: jsonBody("#/components/schemas/ProductUpdate"),
      responses: adminResponses("Продукт оновлено"),
    },
  },
  "/api/v1/admin/products/{id}/status": {
    patch: {
      summary: "Змінити lifecycle status продукту",
      security: [{ bearerAuth: [] }],
      parameters: [idParameter()],
      requestBody: jsonBody("#/components/schemas/ProductStatusChange"),
      responses: adminResponses("Статус продукту змінено"),
    },
  },
  "/api/v1/admin/products/{id}/media/uploads": {
    post: {
      summary: "Зарезервувати безпечне завантаження фото",
      security: [{ bearerAuth: [] }],
      parameters: [idParameter()],
      requestBody: jsonBody("#/components/schemas/ProductMediaReservation"),
      responses: {
        "201": { description: "Повернуто short-lived upload token і server-generated object path" },
        ...adminErrorResponses(),
      },
    },
  },
  "/api/v1/admin/products/{id}/media/{mediaId}/complete": {
    post: {
      summary: "Перевірити фото, створити thumbnail і активувати media",
      security: [{ bearerAuth: [] }],
      parameters: [idParameter(), mediaIdParameter()],
      responses: adminResponses("Фото активовано"),
    },
  },
  "/api/v1/admin/products/{id}/media/{mediaId}": {
    delete: {
      summary: "Видалити objects і архівувати product media",
      security: [{ bearerAuth: [] }],
      parameters: [idParameter(), mediaIdParameter()],
      responses: { "204": { description: "Фото видалено" }, ...adminErrorResponses() },
    },
  },
});

export const productOpenApiSchemas = Object.freeze({
  ProductSearchItem: {
    type: "object",
    required: ["id", "name", "type", "categoryName", "brandName"],
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      type: { type: "string", enum: ["GENERIC", "BRANDED"] },
      categoryName: { type: "string" },
      brandName: { type: ["string", "null"] },
    },
  },
  ProductNutrientWrite: {
    type: "object",
    required: ["nutrientId", "valuePer100g"],
    properties: {
      nutrientId: { type: "string", format: "uuid" },
      valuePer100g: { oneOf: [{ type: "string" }, { type: "number" }] },
      valueType: {
        type: "string",
        enum: ["ANALYTICAL", "DERIVED", "ESTIMATED", "CALCULATED", "LABEL", "UNKNOWN"],
        default: "UNKNOWN",
      },
    },
  },
  ProductCreate: {
    type: "object",
    required: ["type", "nameEn"],
    properties: {
      type: { type: "string", enum: ["GENERIC", "BRANDED"] },
      nameEn: { type: "string", maxLength: 240 },
      nameUa: { type: ["string", "null"], maxLength: 240 },
      gtin: { type: ["string", "null"], pattern: "^(?:[0-9]{8}|[0-9]{12,14})$" },
      categoryId: { type: "string", format: "uuid" },
      brandId: { type: ["string", "null"], format: "uuid" },
      defaultMeasurementUnitId: { type: "string", format: "uuid" },
      baseProductId: { type: ["string", "null"], format: "uuid" },
      foodState: {
        type: "string",
        enum: ["UNSPECIFIED", "RAW", "COOKED", "PROCESSED", "READY_TO_EAT"],
      },
      ediblePortionPercent: { oneOf: [{ type: "string" }, { type: "number" }, { type: "null" }] },
      status: { type: "string", enum: ["DRAFT", "ACTIVE", "ARCHIVED"], default: "DRAFT" },
      notes: { type: ["string", "null"] },
      nutrients: { type: "array", items: { $ref: "#/components/schemas/ProductNutrientWrite" } },
      portions: { type: "array", items: { type: "object", additionalProperties: true } },
    },
  },
  ProductUpdate: {
    allOf: [{ $ref: "#/components/schemas/ProductCreate" }],
    description: "Partial update без полів type, baseProductId і status.",
  },
  ProductStatusChange: {
    type: "object",
    required: ["status"],
    properties: { status: { type: "string", enum: ["DRAFT", "ACTIVE", "ARCHIVED"] } },
  },
  ProductMediaReservation: {
    type: "object",
    required: ["kind", "mimeType", "byteSize"],
    properties: {
      kind: {
        type: "string",
        enum: ["PRODUCT", "PACKAGING", "INGREDIENTS_LABEL", "NUTRITION_LABEL", "BARCODE", "OTHER"],
      },
      mimeType: { type: "string", enum: ["image/jpeg", "image/png", "image/webp"] },
      byteSize: { type: "integer", minimum: 1, maximum: 5_242_880 },
      altTextUa: { type: ["string", "null"], maxLength: 300 },
      altTextEn: { type: ["string", "null"], maxLength: 300 },
      isPrimary: { type: "boolean", default: false },
    },
  },
});

function query(name: string, schema: object) {
  return { name, in: "query", schema };
}

function idParameter() {
  return { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } };
}

function mediaIdParameter() {
  return {
    name: "mediaId",
    in: "path",
    required: true,
    schema: { type: "string", format: "uuid" },
  };
}

function jsonBody(schemaReference: string) {
  return {
    required: true,
    content: { "application/json": { schema: { $ref: schemaReference } } },
  };
}

function adminResponses(successDescription: string) {
  return { "200": { description: successDescription }, ...adminErrorResponses() };
}

function adminErrorResponses() {
  return {
    "400": { description: "Запит не пройшов валідацію або domain invariant" },
    "401": { $ref: "#/components/responses/AuthenticationRequired" },
    "403": { $ref: "#/components/responses/AdminRequired" },
    "404": { description: "Продукт або фото не знайдено" },
  };
}
