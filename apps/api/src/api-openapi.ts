import { productOpenApiPaths, productOpenApiSchemas } from "./modules/product/product-openapi.js";
import { referenceOpenApiDocument } from "./modules/reference/reference-openapi.js";

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
    ...productOpenApiPaths,
  }),
  components: Object.freeze({
    ...referenceOpenApiDocument.components,
    schemas: Object.freeze({
      ...referenceOpenApiDocument.components.schemas,
      ...productOpenApiSchemas,
    }),
  }),
});
