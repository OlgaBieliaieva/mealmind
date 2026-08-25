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
      delete: {
        summary: "Безпечно архівувати значення довідника",
        description:
          "Операція є soft delete: звичайні довідники деактивуються, автор архівується, бренд отримує status=ARCHIVED. Фізичне видалення не виконується.",
        security: [{ bearerAuth: [] }],
        parameters: [
          resourceParameter(),
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": { description: "Значення довідника архівовано" },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/AuthenticationRequired" },
          "403": { $ref: "#/components/responses/AdminRequired" },
          "404": { description: "Значення довідника не знайдено" },
          "409": { $ref: "#/components/responses/ReferenceConflict" },
        },
      },
    },
    "/api/v1/admin/reference/authors/{id}/avatar/uploads": {
      post: {
        summary: "Зарезервувати безпечне завантаження аватара автора",
        description:
          "Повертає короткочасні дані підписаного завантаження до приватного Storage bucket. Шлях об’єкта генерує сервер.",
        security: [{ bearerAuth: [] }],
        parameters: [idParameter()],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthorAvatarUploadRequest" },
            },
          },
        },
        responses: authorAvatarResponses("201", "Завантаження зарезервовано"),
      },
    },
    "/api/v1/admin/reference/authors/{id}/avatar/complete": {
      post: {
        summary: "Завершити опрацювання аватара автора",
        description:
          "Перевіряє належність objectPath автору, декодує зображення та зберігає нормалізований WebP 512×512.",
        security: [{ bearerAuth: [] }],
        parameters: [idParameter()],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthorAvatarCompleteRequest" },
            },
          },
        },
        responses: {
          ...authorAvatarResponses("200", "Аватар опрацьовано"),
          "422": { $ref: "#/components/responses/AuthorAvatarProcessingFailed" },
        },
      },
    },
    "/api/v1/admin/reference/authors/{id}/avatar": {
      delete: {
        summary: "Видалити аватар автора",
        security: [{ bearerAuth: [] }],
        parameters: [idParameter()],
        responses: {
          "204": { description: "Аватар видалено" },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/AuthenticationRequired" },
          "403": { $ref: "#/components/responses/AdminRequired" },
          "404": { description: "Автора не знайдено" },
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
      AuthorAvatarUploadRequest: {
        type: "object",
        required: ["mimeType", "byteSize"],
        additionalProperties: false,
        properties: {
          mimeType: { type: "string", enum: ["image/jpeg", "image/png", "image/webp"] },
          byteSize: { type: "integer", minimum: 1, maximum: 3 * 1024 * 1024 },
        },
      },
      AuthorAvatarCompleteRequest: {
        type: "object",
        required: ["objectPath"],
        additionalProperties: false,
        properties: { objectPath: { type: "string", minLength: 1, maxLength: 1024 } },
      },
    },
    responses: {
      ValidationError: { description: "Запит не пройшов валідацію" },
      AuthenticationRequired: { description: "Потрібна автентифікація користувача" },
      AdminRequired: { description: "Потрібна роль адміністратора" },
      ReferenceConflict: { description: "Порушено унікальність значення довідника" },
      AuthorAvatarProcessingFailed: {
        description: "Файл аватара не вдалося перевірити або опрацювати",
      },
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

function idParameter() {
  return { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } };
}

function authorAvatarResponses(successCode: "200" | "201", successDescription: string) {
  return {
    [successCode]: { description: successDescription },
    "400": { $ref: "#/components/responses/ValidationError" },
    "401": { $ref: "#/components/responses/AuthenticationRequired" },
    "403": { $ref: "#/components/responses/AdminRequired" },
    "404": { description: "Автора не знайдено" },
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
      value: {
        type: "EXPERT",
        expertiseArea: "DIETITIAN",
        slug: "test-author",
        displayName: "Тестовий автор",
        instagramUrl: "https://instagram.com/test-author",
        websiteUrl: "https://example.com/test-author",
      },
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
