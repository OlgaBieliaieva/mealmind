import type { RequestHandler } from "express";

import { getAuthenticatedUser } from "../../../http/auth/request-context.js";
import { validateRequest } from "../../../http/validation/validate-request.js";
import type { ProductImportReviewService } from "../application/product-import-review-service.js";
import {
  decideProductImportReviewSchema,
  getProductImportCandidateSchema,
  listProductImportCandidatesSchema,
  reopenProductImportReviewSchema,
  publishProductImportCandidateSchema,
  startProductImportReviewSchema,
  updateProductImportReviewDraftSchema,
} from "./product-import-review-schema.js";

export interface ProductImportReviewController {
  readonly list: RequestHandler;
  readonly get: RequestHandler;
  readonly start: RequestHandler;
  readonly updateDraft: RequestHandler;
  readonly decide: RequestHandler;
  readonly reopen: RequestHandler;
  readonly publish: RequestHandler;
}

export function createProductImportReviewController(
  service: ProductImportReviewService,
): ProductImportReviewController {
  return Object.freeze({
    list: validateRequest(listProductImportCandidatesSchema, async (input, _request, response) => {
      const page = await service.list(input.query);
      response.set("cache-control", "private, no-store");
      response.status(200).json({
        data: { items: page.items },
        meta: { page: page.page, pageSize: page.pageSize, total: page.total },
      });
    }),

    get: validateRequest(getProductImportCandidateSchema, async (input, _request, response) => {
      response.set("cache-control", "private, no-store");
      response.status(200).json({ data: await service.get(input.params.id) });
    }),

    start: validateRequest(startProductImportReviewSchema, async (input, request, response) => {
      response.set("cache-control", "private, no-store");
      response.status(200).json({
        data: await service.start(
          input.params.id,
          input.body,
          getAuthenticatedUser(request).userId,
        ),
      });
    }),

    updateDraft: validateRequest(
      updateProductImportReviewDraftSchema,
      async (input, request, response) => {
        response.set("cache-control", "private, no-store");
        response.status(200).json({
          data: await service.updateDraft(
            input.params.id,
            input.body,
            getAuthenticatedUser(request).userId,
          ),
        });
      },
    ),

    decide: validateRequest(decideProductImportReviewSchema, async (input, request, response) => {
      response.set("cache-control", "private, no-store");
      response.status(200).json({
        data: await service.decide(
          input.params.id,
          input.body,
          getAuthenticatedUser(request).userId,
        ),
      });
    }),

    reopen: validateRequest(reopenProductImportReviewSchema, async (input, request, response) => {
      response.set("cache-control", "private, no-store");
      response.status(200).json({
        data: await service.reopen(
          input.params.id,
          input.body,
          getAuthenticatedUser(request).userId,
        ),
      });
    }),

    publish: validateRequest(
      publishProductImportCandidateSchema,
      async (input, request, response) => {
        response.set("cache-control", "private, no-store");
        response.status(200).json({
          data: await service.publish(
            input.params.id,
            input.body,
            getAuthenticatedUser(request).userId,
          ),
        });
      },
    ),
  });
}
