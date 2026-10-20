export const productOpenApiPaths = Object.freeze({
  "/api/v1/products/search": {
    get: {
      summary: "Пошук активних продуктів",
      description:
        "Authenticated lightweight пошук ACTIVE продуктів для клієнтських selector-ів. Повертає display-поля, загальний foodState і призначені характеристики без nutrients, portions і media.",
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
      description:
        "Повертає lifecycle status і verificationStatus для відображення стану перевірки кожного продукту в адміністративному каталозі.",
      security: [{ bearerAuth: [] }],
      parameters: [
        query("search", { type: "string", maxLength: 120 }),
        query("type", { type: "string", enum: ["GENERIC", "BRANDED"] }),
        query("status", { type: "string", enum: ["DRAFT", "ACTIVE", "ARCHIVED"] }),
        query("verificationStatus", {
          type: "string",
          enum: ["UNVERIFIED", "VERIFIED", "REJECTED"],
        }),
        query("foodState", {
          type: "string",
          enum: ["UNSPECIFIED", "RAW", "COOKED", "PROCESSED", "READY_TO_EAT"],
        }),
        query("sourceProvider", {
          type: "string",
          enum: ["USDA", "ZAKAZ", "MEALMIND_ADMIN", "MEALMIND_USER", "UNASSIGNED"],
        }),
        query("createdFrom", { type: "string", format: "date-time" }),
        query("includeArchived", { type: "boolean", default: true }),
        query("categoryId", { type: "string", format: "uuid" }),
        query("brandId", { type: "string", format: "uuid" }),
        query("page", { type: "integer", minimum: 1, default: 1 }),
        query("pageSize", { type: "integer", minimum: 1, maximum: 100, default: 20 }),
      ],
      responses: {
        "200": {
          description: "Сторінка продуктів із серверною пагінацією",
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
                        items: { $ref: "#/components/schemas/ProductSummary" },
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
        ...adminErrorResponses(),
      },
    },
    post: {
      summary: "Створити generic або branded продукт",
      description:
        "GTIN і generic base для branded продукту optional. Якщо base вибрано, власні label-нутрієнти перекривають його значення, а відсутні динамічно успадковуються як ESTIMATED з origin=BASE_PRODUCT без створення snapshot. Без base category та unit обов’язкові.",
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
        "Пропущені nutrients або portions зберігаються без змін; переданий порожній масив явно очищає relation. Для branded продукту nutrients містить лише власні значення, а effective profile формується під час читання з generic base.",
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
  ProductSummary: {
    type: "object",
    required: [
      "id",
      "type",
      "nameEn",
      "nameUa",
      "gtin",
      "categoryId",
      "categoryName",
      "brandId",
      "brandName",
      "sourceProvider",
      "sourceDataset",
      "foodState",
      "foodCharacteristics",
      "status",
      "verificationStatus",
      "verifiedByUserId",
      "verifiedAt",
      "verificationReadiness",
      "updatedAt",
      "primaryMedia",
    ],
    properties: {
      id: { type: "string", format: "uuid" },
      type: { type: "string", enum: ["GENERIC", "BRANDED"] },
      nameEn: { type: "string" },
      nameUa: { type: ["string", "null"] },
      gtin: { type: ["string", "null"] },
      categoryId: { type: "string", format: "uuid" },
      categoryName: { type: "string" },
      brandId: { type: ["string", "null"], format: "uuid" },
      brandName: { type: ["string", "null"] },
      sourceProvider: {
        type: ["string", "null"],
        enum: ["USDA", "ZAKAZ", "MEALMIND_ADMIN", "MEALMIND_USER", null],
      },
      sourceDataset: {
        type: ["string", "null"],
        enum: [
          "FOUNDATION_FOOD",
          "SR_LEGACY",
          "ZAKAZ_RETAIL_CATALOG",
          "ADMIN_CATALOG",
          "USER_CATALOG",
          null,
        ],
      },
      foodState: {
        type: "string",
        enum: ["UNSPECIFIED", "RAW", "COOKED", "PROCESSED", "READY_TO_EAT"],
      },
      foodCharacteristics: {
        type: "array",
        items: { $ref: "#/components/schemas/ProductFoodCharacteristic" },
      },
      status: { type: "string", enum: ["DRAFT", "ACTIVE", "ARCHIVED"] },
      verificationStatus: {
        type: "string",
        enum: ["UNVERIFIED", "VERIFIED", "REJECTED"],
      },
      verifiedByUserId: { type: ["string", "null"], format: "uuid" },
      verifiedAt: { type: ["string", "null"], format: "date-time" },
      verificationReadiness: { $ref: "#/components/schemas/ProductVerificationReadiness" },
      updatedAt: { type: "string", format: "date-time" },
      primaryMedia: { type: ["object", "null"], additionalProperties: true },
    },
  },
  ProductSearchItem: {
    type: "object",
    required: [
      "id",
      "name",
      "type",
      "categoryName",
      "brandName",
      "foodState",
      "foodCharacteristics",
    ],
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      type: { type: "string", enum: ["GENERIC", "BRANDED"] },
      categoryName: { type: "string" },
      brandName: { type: ["string", "null"] },
      foodState: {
        type: "string",
        enum: ["UNSPECIFIED", "RAW", "COOKED", "PROCESSED", "READY_TO_EAT"],
      },
      foodCharacteristics: {
        type: "array",
        items: { $ref: "#/components/schemas/ProductFoodCharacteristic" },
      },
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
  ProductPortionWrite: {
    type: "object",
    required: [
      "amount",
      "gramWeight",
      "labelEn",
      "kind",
      "weightType",
      "isDefault",
      "isActive",
      "sortOrder",
    ],
    properties: {
      productPackageId: { type: ["string", "null"], format: "uuid" },
      amount: { oneOf: [{ type: "string" }, { type: "number" }] },
      gramWeight: { oneOf: [{ type: "string" }, { type: "number" }] },
      labelEn: { type: "string", minLength: 1, maxLength: 200 },
      labelUa: { type: ["string", "null"], maxLength: 200 },
      kind: {
        type: "string",
        enum: ["MASS", "VOLUME", "COUNT", "HOUSEHOLD", "PACKAGE", "SERVING", "OTHER"],
      },
      weightType: {
        type: "string",
        enum: ["MEASURED", "CALCULATED", "ESTIMATED", "LABEL", "UNKNOWN"],
      },
      measurementUnitId: { type: ["string", "null"], format: "uuid" },
      isDefault: { type: "boolean" },
      isActive: { type: "boolean" },
      sortOrder: { type: "integer", minimum: -32_768, maximum: 32_767 },
    },
  },
  ProductVerificationReadiness: {
    type: "object",
    required: ["status", "blockingIssues", "warnings"],
    properties: {
      status: { type: "string", enum: ["READY", "BLOCKED"] },
      blockingIssues: {
        type: "array",
        uniqueItems: true,
        items: {
          type: "string",
          enum: [
            "MISSING_UA_NAME",
            "UNSPECIFIED_FOOD_STATE",
            "MISSING_ENERGY",
            "MISSING_PROTEIN",
            "MISSING_TOTAL_FAT",
            "MISSING_CARBOHYDRATE",
            "MISSING_BRAND",
            "MISSING_ACTIVE_PACKAGE",
            "MISSING_PACKAGE_GTIN",
            "MISSING_PACKAGE_QUANTITY",
          ],
        },
      },
      warnings: {
        type: "array",
        uniqueItems: true,
        items: {
          type: "string",
          enum: ["MISSING_PRIMARY_IMAGE", "MISSING_DEFAULT_PORTION"],
        },
      },
    },
  },
  ProductPackageWrite: {
    type: "object",
    required: [
      "gtin",
      "kind",
      "weightG",
      "volumeMl",
      "itemCount",
      "labelUa",
      "labelEn",
      "isDefault",
      "status",
    ],
    properties: {
      id: { type: "string", format: "uuid" },
      gtin: { type: ["string", "null"], pattern: "^(?:[0-9]{8}|[0-9]{12,14})$" },
      kind: {
        type: "string",
        enum: [
          "UNSPECIFIED",
          "FIXED_MASS",
          "FIXED_VOLUME",
          "FIXED_MASS_AND_VOLUME",
          "FIXED_COUNT",
        ],
      },
      weightG: { oneOf: [{ type: "string" }, { type: "number" }, { type: "null" }] },
      volumeMl: { oneOf: [{ type: "string" }, { type: "number" }, { type: "null" }] },
      itemCount: { type: ["integer", "null"], minimum: 1 },
      labelUa: { type: ["string", "null"], maxLength: 200 },
      labelEn: { type: ["string", "null"], maxLength: 200 },
      isDefault: { type: "boolean" },
      status: { type: "string", enum: ["DRAFT", "ACTIVE", "ARCHIVED"] },
      ingredientStatements: {
        type: "array",
        maxItems: 10,
        items: { $ref: "#/components/schemas/ProductIngredientStatementWrite" },
      },
      shelfLifeRules: {
        type: "array",
        maxItems: 20,
        items: { $ref: "#/components/schemas/ProductShelfLifeRuleWrite" },
      },
    },
  },
  ProductIngredientStatementWrite: {
    type: "object",
    required: ["locale", "statement"],
    properties: {
      locale: { type: "string", minLength: 2, maxLength: 16 },
      statement: { type: "string", minLength: 1, maxLength: 20_000 },
    },
  },
  ProductShelfLifeRuleWrite: {
    type: "object",
    required: [
      "rawShelfLife",
      "rawTemperatureRange",
      "durationValue",
      "durationUnit",
      "minTemperatureC",
      "maxTemperatureC",
      "sortOrder",
    ],
    properties: {
      rawShelfLife: { type: ["string", "null"], maxLength: 2_000 },
      rawTemperatureRange: { type: ["string", "null"], maxLength: 2_000 },
      durationValue: { oneOf: [{ type: "string" }, { type: "number" }, { type: "null" }] },
      durationUnit: { type: ["string", "null"], enum: ["HOURS", "DAYS", "MONTHS", "YEARS", null] },
      minTemperatureC: { oneOf: [{ type: "string" }, { type: "number" }, { type: "null" }] },
      maxTemperatureC: { oneOf: [{ type: "string" }, { type: "number" }, { type: "null" }] },
      sortOrder: { type: "integer", minimum: 0, maximum: 32_767 },
    },
  },
  ProductDietaryTagWrite: {
    type: "object",
    required: ["dietaryTagId", "evidenceNote"],
    properties: {
      dietaryTagId: { type: "string", format: "uuid" },
      evidenceNote: { type: ["string", "null"], maxLength: 2_000 },
    },
  },
  ProductAllergenWrite: {
    type: "object",
    required: ["allergenId", "declaration", "evidenceNote"],
    properties: {
      allergenId: { type: "string", format: "uuid" },
      declaration: {
        type: "string",
        enum: ["CONTAINS", "MAY_CONTAIN", "SHARED_FACILITY"],
      },
      evidenceNote: { type: ["string", "null"], maxLength: 2_000 },
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
      characteristicIds: {
        type: "array",
        maxItems: 50,
        uniqueItems: true,
        items: { type: "string", format: "uuid" },
      },
      ediblePortionPercent: { oneOf: [{ type: "string" }, { type: "number" }, { type: "null" }] },
      status: { type: "string", enum: ["DRAFT", "ACTIVE", "ARCHIVED"], default: "DRAFT" },
      verificationStatus: {
        type: "string",
        enum: ["UNVERIFIED", "VERIFIED", "REJECTED"],
        default: "UNVERIFIED",
      },
      notes: { type: ["string", "null"] },
      nutrients: { type: "array", items: { $ref: "#/components/schemas/ProductNutrientWrite" } },
      portions: { type: "array", items: { $ref: "#/components/schemas/ProductPortionWrite" } },
    },
  },
  ProductUpdate: {
    allOf: [
      { $ref: "#/components/schemas/ProductCreate" },
      {
        type: "object",
        properties: {
          packages: {
            type: "array",
            maxItems: 100,
            items: { $ref: "#/components/schemas/ProductPackageWrite" },
          },
          dietaryTags: {
            type: "array",
            maxItems: 100,
            uniqueItems: true,
            items: { $ref: "#/components/schemas/ProductDietaryTagWrite" },
          },
          allergens: {
            type: "array",
            maxItems: 100,
            uniqueItems: true,
            items: { $ref: "#/components/schemas/ProductAllergenWrite" },
          },
        },
      },
    ],
    description:
      "Partial update без полів type, baseProductId і status; verificationStatus дозволено змінювати адміністратору. packages оновлює передані пакування або створює нові, архівація виконується статусом ARCHIVED. Порція може посилатися через productPackageId лише на збережене неархівне пакування цього продукту. ingredientStatements і shelfLifeRules замінюють лише canonical manual rows; source-backed записи залишаються незмінними. dietaryTags та allergens є повними наборами атрибутів, вручну підтверджених поточним адміністратором; source/rule-based пропозиції не стають канонічними без такого підтвердження.",
  },
  ProductFoodCharacteristic: {
    type: "object",
    required: ["id", "code", "kind", "nameUa", "nameEn", "source", "confidence"],
    properties: {
      id: { type: "string", format: "uuid" },
      code: { type: "string" },
      kind: {
        type: "string",
        enum: ["PRESERVATION_STATE", "COOKING_METHOD", "PROCESSING_METHOD"],
      },
      nameUa: { type: "string" },
      nameEn: { type: "string" },
      source: { type: "string", enum: ["MANUAL", "SOURCE_IMPORT", "RULE_BASED"] },
      confidence: { type: "string", enum: ["UNSPECIFIED", "LOW", "MEDIUM", "HIGH"] },
    },
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
    "422": { description: "Обов’язкові вимоги доменної верифікації не виконано" },
  };
}
