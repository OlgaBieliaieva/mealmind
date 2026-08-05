import { productOpenApiPaths, productOpenApiSchemas } from "./modules/product/product-openapi.js";
import { referenceOpenApiDocument } from "./modules/reference/reference-openapi.js";

export const apiOpenApiDocument = Object.freeze({
  ...referenceOpenApiDocument,
  paths: Object.freeze({
    ...referenceOpenApiDocument.paths,
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
