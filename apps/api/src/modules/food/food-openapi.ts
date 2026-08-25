const bearer = [{ bearerAuth: [] }];
const id = { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } };
const kind = {
  name: "kind",
  in: "path",
  required: true,
  schema: { type: "string", enum: ["product", "recipe"] },
};
const errors = {
  "400": { description: "Некоректні параметри запиту" },
  "401": { $ref: "#/components/responses/AuthenticationRequired" },
  "404": { description: "Їжу не знайдено або вона недоступна сім’ї" },
  "409": { description: "Невалідний активний сімейний контекст" },
  "429": { description: "Перевищено rate limit" },
};

export const foodOpenApiPaths = Object.freeze({
  "/api/v1/food/search": {
    get: {
      summary: "Шукати продукти й рецепти",
      description:
        "Єдиний family-scoped пошук видимих ACTIVE продуктів та PUBLISHED рецептів із детермінованою пагінацією. Порожній query дозволений для favorites і type=recipe; для порожнього пошуку рецептів результати впорядковано від найновіших.",
      security: bearer,
      parameters: [
        { name: "query", in: "query", required: false, schema: { type: "string", maxLength: 120 } },
        {
          name: "type",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["all", "product", "recipe"], default: "all" },
        },
        {
          name: "favorites",
          in: "query",
          required: false,
          schema: { type: "boolean", default: false },
        },
        {
          name: "difficulty",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["EASY", "MEDIUM", "HARD"] },
        },
        ...["recipeTypeId", "authorId", "ingredientId", "cuisineId", "dietaryTagId"].map(
          (name) => ({
            name,
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" },
          }),
        ),
        {
          name: "page",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 1, default: 1 },
        },
        {
          name: "pageSize",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 50, default: 20 },
        },
      ],
      responses: {
        "200": {
          description: "Сторінка результатів",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/FoodSearchResponse" } },
          },
        },
        ...errors,
      },
    },
  },
  "/api/v1/food/products/{id}": {
    get: {
      summary: "Переглянути продукт",
      security: bearer,
      parameters: [id],
      responses: {
        "200": {
          description: "Продукт, медіа, бренд, нутрієнти, порції та пов’язані рецепти",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ProductFoodResponse" } },
          },
        },
        ...errors,
      },
    },
  },
  "/api/v1/food/recipes/{id}": {
    get: {
      summary: "Переглянути рецепт",
      security: bearer,
      parameters: [id],
      responses: {
        "200": {
          description:
            "Рецепт, автор і social links, інгредієнти, кроки, signed media та поживність на 100 г",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/RecipeFoodResponse" } },
          },
        },
        ...errors,
      },
    },
  },
  "/api/v1/food/favorites/{kind}/{id}": {
    put: {
      summary: "Додати їжу до сімейного обраного",
      security: bearer,
      parameters: [kind, id],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { type: "object", additionalProperties: false } },
        },
      },
      responses: { "200": { description: "Їжу додано ідемпотентно" }, ...errors },
    },
    delete: {
      summary: "Видалити їжу із сімейного обраного",
      security: bearer,
      parameters: [kind, id],
      responses: { "204": { description: "Їжу видалено" }, ...errors },
    },
  },
});

export const foodOpenApiSchemas = Object.freeze({
  FoodSearchItem: {
    oneOf: [
      {
        type: "object",
        required: ["kind", "id", "name", "category", "imageUrl", "nutrition", "isFavorite"],
        properties: {
          kind: { const: "product" },
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          category: { type: "object" },
          brandName: { type: ["string", "null"] },
          imageUrl: { type: ["string", "null"], format: "uri" },
          nutrition: { $ref: "#/components/schemas/FoodCardNutrition" },
          isFavorite: { type: "boolean" },
        },
      },
      {
        type: "object",
        required: [
          "kind",
          "id",
          "name",
          "recipeType",
          "cuisines",
          "dietaryTags",
          "author",
          "imageUrl",
          "nutrition",
          "isFavorite",
        ],
        properties: {
          kind: { const: "recipe" },
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          summary: { type: ["string", "null"] },
          difficulty: { type: ["string", "null"] },
          totalTimeMin: { type: ["integer", "null"] },
          recipeType: { type: ["object", "null"] },
          cuisines: { type: "array", items: { type: "string" } },
          dietaryTags: { type: "array", items: { type: "string" } },
          author: { type: ["object", "null"] },
          imageUrl: { type: ["string", "null"], format: "uri" },
          nutrition: { $ref: "#/components/schemas/FoodCardNutrition" },
          isFavorite: { type: "boolean" },
        },
      },
    ],
  },
  FoodCardNutrition: {
    type: "object",
    required: ["basis", "energyKcal", "proteinG", "fatG", "carbohydrateG"],
    properties: {
      basis: { type: "string", enum: ["PER_100G", "PER_SERVING"] },
      energyKcal: { type: ["number", "null"] },
      proteinG: { type: ["number", "null"] },
      fatG: { type: ["number", "null"] },
      carbohydrateG: { type: ["number", "null"] },
    },
  },
  FoodSearchResponse: {
    type: "object",
    required: ["data", "meta"],
    properties: {
      data: {
        type: "object",
        required: ["items"],
        properties: {
          items: { type: "array", items: { $ref: "#/components/schemas/FoodSearchItem" } },
        },
      },
      meta: {
        type: "object",
        required: ["page", "pageSize", "total"],
        properties: {
          page: { type: "integer" },
          pageSize: { type: "integer" },
          total: { type: "integer" },
        },
      },
    },
  },
  ProductFoodResponse: {
    type: "object",
    required: ["data"],
    properties: {
      data: {
        type: "object",
        required: [
          "kind",
          "id",
          "name",
          "category",
          "brand",
          "imageUrl",
          "nutrients",
          "portions",
          "relatedRecipes",
          "isFavorite",
        ],
        properties: {
          kind: { const: "product" },
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          category: { type: "object" },
          brand: { type: ["object", "null"] },
          imageUrl: { type: ["string", "null"], format: "uri" },
          nutrients: { type: "array", items: { type: "object" } },
          portions: { type: "array", items: { type: "object" } },
          relatedRecipes: { type: "array", items: { type: "object" } },
          isFavorite: { type: "boolean" },
        },
      },
    },
  },
  RecipeFoodResponse: {
    type: "object",
    required: ["data"],
    properties: {
      data: {
        type: "object",
        required: [
          "kind",
          "id",
          "title",
          "recipeType",
          "author",
          "imageUrl",
          "ingredients",
          "steps",
          "cuisines",
          "dietaryTags",
          "sources",
          "videos",
          "images",
          "nutrients",
          "isFavorite",
        ],
        properties: {
          kind: { const: "recipe" },
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          recipeType: { type: ["object", "null"] },
          author: { type: ["object", "null"] },
          imageUrl: { type: ["string", "null"], format: "uri" },
          ingredients: { type: "array", items: { type: "object" } },
          steps: { type: "array", items: { type: "object" } },
          cuisines: { type: "array", items: { type: "object" } },
          dietaryTags: { type: "array", items: { type: "object" } },
          sources: { type: "array", items: { type: "object" } },
          videos: { type: "array", items: { type: "object" } },
          images: { type: "array", items: { type: "object" } },
          nutrients: { type: "array", items: { type: "object" } },
          isFavorite: { type: "boolean" },
        },
      },
    },
  },
});
