const resources = [
  "allergens",
  "authors",
  "brands",
  "cuisines",
  "dietary-tags",
  "meal-types",
  "measurement-units",
  "nutrients",
  "product-categories",
  "recipe-types",
] as const;

export const referenceOpenApiDocument = Object.freeze({
  openapi: "3.1.0",
  info: {
    title: "MealMind API",
    version: "1.0.0",
    description: "HTTP API застосунку MealMind.",
  },
  servers: [
    {
      url: "http://127.0.0.1:3002",
      description: "Локальне середовище розробки",
    },
  ],
  paths: {
    "/api/v1/reference/{resource}": {
      get: {
        summary: "Отримати активні значення довідника",
        security: [{ bearerAuth: [] }],
        parameters: referenceListParameters(false),
        responses: standardReadResponses(),
      },
    },
    "/api/v1/admin/reference/{resource}": {
      get: {
        summary: "Отримати значення довідника для адміністрування",
        security: [{ bearerAuth: [] }],
        parameters: referenceListParameters(true),
        responses: standardReadResponses(),
      },
      post: {
        summary: "Створити значення довідника",
        security: [{ bearerAuth: [] }],
        parameters: [resourceParameter()],
        requestBody: referenceRequestBody(true),
        responses: {
          "201": { description: "Значення довідника створено" },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/AuthenticationRequired" },
          "403": { $ref: "#/components/responses/AdminRequired" },
          "409": { $ref: "#/components/responses/ReferenceConflict" },
        },
      },
    },
    "/api/v1/admin/reference/{resource}/{id}": {
      patch: {
        summary: "Оновити або деактивувати значення довідника",
        description:
          "Коди seeded-довідників не змінюються. Для деактивації передайте isActive=false; автори архівуються, а бренди використовують status=ARCHIVED.",
        security: [{ bearerAuth: [] }],
        parameters: [
          resourceParameter(),
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: referenceRequestBody(false),
        responses: {
          "200": { description: "Значення довідника оновлено" },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/AuthenticationRequired" },
          "403": { $ref: "#/components/responses/AdminRequired" },
          "404": { description: "Значення довідника не знайдено" },
          "409": { $ref: "#/components/responses/ReferenceConflict" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      ReferenceWrite: {
        type: "object",
        description:
          "Набір полів залежить від resource. Точні обмеження наведені в документації reference-модуля.",
        additionalProperties: true,
      },
    },
    responses: {
      ValidationError: { description: "Запит не пройшов валідацію" },
      AuthenticationRequired: { description: "Потрібна автентифікація користувача" },
      AdminRequired: { description: "Потрібна роль адміністратора" },
      ReferenceConflict: { description: "Порушено унікальність значення довідника" },
    },
  },
});

function resourceParameter() {
  return {
    name: "resource",
    in: "path",
    required: true,
    schema: { type: "string", enum: resources },
  };
}

function referenceListParameters(isAdmin: boolean) {
  return [
    resourceParameter(),
    { name: "search", in: "query", schema: { type: "string", maxLength: 120 } },
    { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
    {
      name: "pageSize",
      in: "query",
      schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
    },
    ...(isAdmin
      ? [{ name: "includeInactive", in: "query", schema: { type: "boolean", default: false } }]
      : []),
  ];
}

function standardReadResponses() {
  return {
    "200": { description: "Детерміновано відсортований список значень" },
    "400": { $ref: "#/components/responses/ValidationError" },
    "401": { $ref: "#/components/responses/AuthenticationRequired" },
  };
}

function referenceRequestBody(requiredFields: boolean) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ReferenceWrite" },
        examples: requiredFields ? createReferenceExamples() : updateReferenceExamples(),
      },
    },
  };
}

function createReferenceExamples() {
  return {
    allergen: {
      summary: "Алерген",
      value: { code: "test_allergen", nameUa: "Алерген", nameEn: "Allergen", isActive: true },
    },
    author: {
      summary: "Автор",
      value: { type: "EXPERT", slug: "test-author", displayName: "Тестовий автор" },
    },
    brand: { summary: "Бренд", value: { name: "Test Foods", status: "DRAFT" } },
    cuisine: {
      summary: "Кухня",
      value: {
        code: "test_cuisine",
        nameUa: "Тестова кухня",
        nameEn: "Test cuisine",
        scope: "NATIONAL",
        sortOrder: 10,
      },
    },
    dietaryTag: {
      summary: "Дієтичний тег",
      value: {
        code: "test_tag",
        nameUa: "Тестовий тег",
        nameEn: "Test tag",
        kind: "DIET_PATTERN",
        sortOrder: 10,
      },
    },
    mealType: {
      summary: "Тип прийому їжі",
      value: {
        code: "test_meal",
        nameUa: "Тестовий прийом",
        nameEn: "Test meal",
        kind: "FLEXIBLE",
        sortOrder: 10,
      },
    },
    measurementUnit: {
      summary: "Одиниця вимірювання",
      value: {
        code: "test_unit",
        symbol: "tu",
        nameUa: "Тестова одиниця",
        nameEn: "Test unit",
        dimension: "COUNT",
        factorToBaseUnit: "1",
        sortOrder: 10,
      },
    },
    nutrient: {
      summary: "Нутрієнт",
      value: {
        code: "test_nutrient",
        nameUa: "Тестовий нутрієнт",
        nameEn: "Test nutrient",
        group: "OTHER",
        unit: "G",
        sortOrder: 10,
      },
    },
    productCategory: {
      summary: "Категорія продукту",
      value: {
        code: "test_category",
        nameUa: "Тестова категорія",
        nameEn: "Test category",
        kind: "GROUP",
        parentCategoryId: null,
        sortOrder: 10,
      },
    },
    recipeType: {
      summary: "Тип рецепта",
      value: { code: "test_recipe", nameUa: "Тестовий тип", nameEn: "Test type", sortOrder: 10 },
    },
  };
}

function updateReferenceExamples() {
  return {
    rename: { summary: "Змінити назву", value: { nameUa: "Оновлена назва" } },
    deactivate: { summary: "Деактивувати", value: { isActive: false } },
    archiveBrand: { summary: "Архівувати бренд", value: { status: "ARCHIVED" } },
  };
}
