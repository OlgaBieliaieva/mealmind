import { productOpenApiPaths, productOpenApiSchemas } from "./modules/product/product-openapi.js";
import { familyOpenApiPaths, familyOpenApiSchemas } from "./modules/family/family-openapi.js";
import { referenceOpenApiDocument } from "./modules/reference/reference-openapi.js";
import { recipeOpenApiPaths, recipeOpenApiSchemas } from "./modules/recipe/recipe-openapi.js";

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
  }),
  components: Object.freeze({
    ...referenceOpenApiDocument.components,
    schemas: Object.freeze({
      ...referenceOpenApiDocument.components.schemas,
      ...productOpenApiSchemas,
      ...recipeOpenApiSchemas,
      ...familyOpenApiSchemas,
    }),
  }),
});
