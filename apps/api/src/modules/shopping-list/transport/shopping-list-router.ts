import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import type { AuthenticationService } from "../../../application/authentication/authentication-service.js";
import { getAuthenticatedUser } from "../../../http/auth/request-context.js";
import { authenticate } from "../../../http/middleware/authenticate.js";
import { createApiRateLimitOptions } from "../../../http/middleware/rate-limit.js";
import { validateRequest } from "../../../http/validation/validate-request.js";
import type { ShoppingListService } from "../application/shopping-list-service.js";
import {
  addCatalogShoppingItemSchema,
  addCustomShoppingItemSchema,
  generateShoppingListSchema,
  listMutationSchema,
  listShoppingListsSchema,
  readShoppingListSchema,
  setShoppingItemStatusSchema,
  setShoppingListStatusSchema,
  updateShoppingItemSchema,
} from "./shopping-list-schema.js";

export function createShoppingListRouter(
  service: ShoppingListService,
  authenticationService: AuthenticationService,
): Router {
  const router = Router();
  const auth = authenticate(authenticationService);
  const readLimiter = rateLimit(createApiRateLimitOptions({ windowMs: 60_000, limit: 60 }));
  const writeLimiter = rateLimit(createApiRateLimitOptions({ windowMs: 60_000, limit: 30 }));
  const userId = (request: Parameters<typeof getAuthenticatedUser>[0]) =>
    getAuthenticatedUser(request).userId;
  const send = (response: { setHeader(name: string, value: string): void }) =>
    response.setHeader("Cache-Control", "private, no-store");

  router.get(
    "/shopping-lists",
    readLimiter,
    auth,
    validateRequest(listShoppingListsSchema, async (_input, request, response) => {
      send(response);
      response.status(200).json({ data: await service.list(userId(request)) });
    }),
  );
  router.post(
    "/shopping-lists",
    writeLimiter,
    auth,
    validateRequest(generateShoppingListSchema, async (input, request, response) => {
      send(response);
      response.status(201).json({ data: await service.generate(userId(request), input.body) });
    }),
  );
  router.get(
    "/shopping-lists/:listId",
    readLimiter,
    auth,
    validateRequest(readShoppingListSchema, async (input, request, response) => {
      send(response);
      response.status(200).json({
        data: await service.read(userId(request), input.params.listId),
      });
    }),
  );
  router.post(
    "/shopping-lists/:listId/regenerate",
    writeLimiter,
    auth,
    validateRequest(listMutationSchema, async (input, request, response) => {
      send(response);
      response.status(201).json({
        data: await service.regenerate(
          userId(request),
          input.params.listId,
          input.body.expectedRevision,
        ),
      });
    }),
  );
  router.patch(
    "/shopping-lists/:listId/status",
    writeLimiter,
    auth,
    validateRequest(setShoppingListStatusSchema, async (input, request, response) => {
      send(response);
      response.status(200).json({
        data: await service.setStatus(
          userId(request),
          input.params.listId,
          input.body.expectedRevision,
          input.body.status,
        ),
      });
    }),
  );
  router.patch(
    "/shopping-lists/:listId/items/:itemId",
    writeLimiter,
    auth,
    validateRequest(updateShoppingItemSchema, async (input, request, response) => {
      send(response);
      response.status(200).json({
        data: await service.updateItem(
          userId(request),
          input.params.listId,
          input.params.itemId,
          input.body,
        ),
      });
    }),
  );
  router.patch(
    "/shopping-lists/:listId/items/:itemId/status",
    writeLimiter,
    auth,
    validateRequest(setShoppingItemStatusSchema, async (input, request, response) => {
      send(response);
      response.status(200).json({
        data: await service.setItemStatus(
          userId(request),
          input.params.listId,
          input.params.itemId,
          input.body.expectedRevision,
          input.body.status,
        ),
      });
    }),
  );
  router.post(
    "/shopping-lists/:listId/items/catalog",
    writeLimiter,
    auth,
    validateRequest(addCatalogShoppingItemSchema, async (input, request, response) => {
      send(response);
      response.status(201).json({
        data: await service.addCatalogItem(userId(request), input.params.listId, input.body),
      });
    }),
  );
  router.post(
    "/shopping-lists/:listId/items/custom",
    writeLimiter,
    auth,
    validateRequest(addCustomShoppingItemSchema, async (input, request, response) => {
      send(response);
      response.status(201).json({
        data: await service.addCustomItem(userId(request), input.params.listId, input.body),
      });
    }),
  );

  return router;
}
