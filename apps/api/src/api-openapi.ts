import { productOpenApiPaths, productOpenApiSchemas } from "./modules/product/product-openapi.js";
import { familyOpenApiPaths, familyOpenApiSchemas } from "./modules/family/family-openapi.js";
import { referenceOpenApiDocument } from "./modules/reference/reference-openapi.js";
import { recipeOpenApiPaths, recipeOpenApiSchemas } from "./modules/recipe/recipe-openapi.js";
import { foodOpenApiPaths, foodOpenApiSchemas } from "./modules/food/food-openapi.js";
import {
  mealPlanOpenApiPaths,
  mealPlanOpenApiSchemas,
} from "./modules/meal-plan/meal-plan-openapi.js";
import {
  shoppingListOpenApiPaths,
  shoppingListOpenApiSchemas,
} from "./modules/shopping-list/shopping-list-openapi.js";
import {
  consumptionOpenApiPaths,
  consumptionOpenApiSchemas,
} from "./modules/consumption/consumption-openapi.js";
import { cookingOpenApiPaths, cookingOpenApiSchemas } from "./modules/cooking/cooking-openapi.js";

export const apiOpenApiDocument = Object.freeze({
  ...referenceOpenApiDocument,
  paths: Object.freeze({
    ...referenceOpenApiDocument.paths,
    "/api/v1/account/bootstrap": {
      post: {
        summary: "Створити або повернути локальний обліковий запис",
        description:
          "Ідемпотентно створює локального користувача з роллю USER на основі підтвердженої Supabase identity.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: false,
              },
            },
          },
        },
        responses: {
          "200": { description: "Canonical application account" },
          "400": { description: "Request body містить неочікувані поля" },
          "401": { $ref: "#/components/responses/AuthenticationRequired" },
          "403": { description: "Email не підтверджено або account недоступний" },
          "409": { description: "Email належить іншій identity" },
          "429": { description: "Перевищено rate limit" },
        },
      },
    },
    "/api/v1/session": {
      get: {
        summary: "Отримати application session і сімейний контекст",
        description:
          "Повертає authenticated User, стан onboarding, власний профіль і єдину активну Family. Стан із кількома ACTIVE memberships повертає конфлікт.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Application session" },
          "401": { $ref: "#/components/responses/AuthenticationRequired" },
          "409": { description: "Невалідний сімейний контекст" },
          "429": { description: "Перевищено rate limit" },
        },
      },
    },
    ...productOpenApiPaths,
    ...recipeOpenApiPaths,
    ...familyOpenApiPaths,
    ...foodOpenApiPaths,
    ...mealPlanOpenApiPaths,
    ...shoppingListOpenApiPaths,
    ...consumptionOpenApiPaths,
    ...cookingOpenApiPaths,
  }),
  components: Object.freeze({
    ...referenceOpenApiDocument.components,
    schemas: Object.freeze({
      ...referenceOpenApiDocument.components.schemas,
      ...productOpenApiSchemas,
      ...recipeOpenApiSchemas,
      ...familyOpenApiSchemas,
      ...foodOpenApiSchemas,
      ...mealPlanOpenApiSchemas,
      ...shoppingListOpenApiSchemas,
      ...consumptionOpenApiSchemas,
      ...cookingOpenApiSchemas,
    }),
  }),
});

export function createApiOpenApiDocument(apiOrigin: string) {
  const isLocal = apiOrigin === "http://127.0.0.1:3002";

  return Object.freeze({
    ...apiOpenApiDocument,
    servers: Object.freeze([
      Object.freeze({
        url: apiOrigin,
        description: isLocal ? "Локальне середовище розробки" : "Поточне середовище",
      }),
    ]),
  });
}
