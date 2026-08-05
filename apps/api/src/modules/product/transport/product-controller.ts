import type { RequestHandler } from "express";

import { getAuthenticatedUser } from "../../../http/auth/request-context.js";
import { validateRequest } from "../../../http/validation/validate-request.js";
import type { ProductService } from "../application/product-service.js";
import {
  changeProductStatusSchema,
  createProductSchema,
  getProductSchema,
  listProductsSchema,
  productMediaActionSchema,
  reserveProductMediaSchema,
  updateProductSchema,
} from "./product-schema.js";

export interface ProductController {
  readonly list: RequestHandler;
  readonly get: RequestHandler;
  readonly create: RequestHandler;
  readonly update: RequestHandler;
  readonly changeStatus: RequestHandler;
  readonly reserveMedia: RequestHandler;
  readonly completeMedia: RequestHandler;
  readonly deleteMedia: RequestHandler;
}

export function createProductController(service: ProductService): ProductController {
  return Object.freeze({
    list: validateRequest(listProductsSchema, async (input, _request, response) => {
      const page = await service.list(input.query);
      response.set("cache-control", "no-store");
      response.status(200).json({
        data: { items: page.items },
        meta: { page: page.page, pageSize: page.pageSize, total: page.total },
      });
    }),

    get: validateRequest(getProductSchema, async (input, _request, response) => {
      response.set("cache-control", "no-store");
      response.status(200).json({ data: await service.get(input.params.id) });
    }),

    create: validateRequest(createProductSchema, async (input, _request, response) => {
      response.set("cache-control", "no-store");
      response.status(201).json({ data: await service.create(input.body) });
    }),

    update: validateRequest(updateProductSchema, async (input, _request, response) => {
      response.set("cache-control", "no-store");
      response.status(200).json({ data: await service.update(input.params.id, input.body) });
    }),

    changeStatus: validateRequest(changeProductStatusSchema, async (input, _request, response) => {
      response.set("cache-control", "no-store");
      response
        .status(200)
        .json({ data: await service.changeStatus(input.params.id, input.body.status) });
    }),

    reserveMedia: validateRequest(reserveProductMediaSchema, async (input, request, response) => {
      const actor = getAuthenticatedUser(request);
      response.set("cache-control", "no-store");
      response.status(201).json({
        data: await service.reserveMedia(input.params.id, input.body, actor.userId),
      });
    }),

    completeMedia: validateRequest(productMediaActionSchema, async (input, _request, response) => {
      response.set("cache-control", "no-store");
      response.status(200).json({
        data: await service.completeMedia(input.params.id, input.params.mediaId),
      });
    }),

    deleteMedia: validateRequest(productMediaActionSchema, async (input, _request, response) => {
      await service.deleteMedia(input.params.id, input.params.mediaId);
      response.status(204).send();
    }),
  });
}
