import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import type { AuthenticationService } from "../../../application/authentication/authentication-service.js";
import { getAuthenticatedUser } from "../../../http/auth/request-context.js";
import { authenticate } from "../../../http/middleware/authenticate.js";
import { createApiRateLimitOptions } from "../../../http/middleware/rate-limit.js";
import { validateRequest } from "../../../http/validation/validate-request.js";
import type { ConsumptionService } from "../application/consumption-service.js";
import {
  addManualConsumptionSchema,
  confirmPlannedSchema,
  readDashboardSchema,
  readDiarySchema,
  skipPlannedSchema,
  updateConsumptionSchema,
  voidConsumptionSchema,
} from "./consumption-schema.js";

export function createConsumptionRouter(
  service: ConsumptionService,
  authenticationService: AuthenticationService,
): Router {
  const router = Router();
  const auth = authenticate(authenticationService);
  const readLimiter = rateLimit(createApiRateLimitOptions({ windowMs: 60_000, limit: 60 }));
  const writeLimiter = rateLimit(createApiRateLimitOptions({ windowMs: 60_000, limit: 30 }));
  const userId = (request: Parameters<typeof getAuthenticatedUser>[0]) =>
    getAuthenticatedUser(request).userId;
  const noStore = (response: { setHeader(name: string, value: string): void }) =>
    response.setHeader("Cache-Control", "private, no-store");

  router.get(
    "/consumption/diary",
    readLimiter,
    auth,
    validateRequest(readDiarySchema, async (input, request, response) => {
      noStore(response);
      response.status(200).json({ data: await service.readDay(userId(request), input.query.date) });
    }),
  );
  router.get(
    "/consumption/dashboard",
    readLimiter,
    auth,
    validateRequest(readDashboardSchema, async (input, request, response) => {
      noStore(response);
      response
        .status(200)
        .json({ data: await service.readDashboard(userId(request), input.query.dates) });
    }),
  );
  router.post(
    "/consumption/plan/:participantId/confirm",
    writeLimiter,
    auth,
    validateRequest(confirmPlannedSchema, async (input, request, response) => {
      noStore(response);
      response.status(200).json({
        data: await service.confirmPlanned(
          userId(request),
          input.params.participantId,
          input.body.quantityGrams,
        ),
      });
    }),
  );
  router.post(
    "/consumption/plan/:participantId/skip",
    writeLimiter,
    auth,
    validateRequest(skipPlannedSchema, async (input, request, response) => {
      noStore(response);
      response.status(200).json({
        data: await service.skipPlanned(
          userId(request),
          input.params.participantId,
          input.body.date,
        ),
      });
    }),
  );
  router.post(
    "/consumption/plan/:participantId/restore",
    writeLimiter,
    auth,
    validateRequest(skipPlannedSchema, async (input, request, response) => {
      noStore(response);
      response.status(200).json({
        data: await service.restorePlanned(
          userId(request),
          input.params.participantId,
          input.body.date,
        ),
      });
    }),
  );
  router.patch(
    "/consumption/entries/:entryId",
    writeLimiter,
    auth,
    validateRequest(updateConsumptionSchema, async (input, request, response) => {
      noStore(response);
      response.status(200).json({
        data: await service.updateEntry(userId(request), input.params.entryId, input.body),
      });
    }),
  );
  router.post(
    "/consumption/entries/:entryId/void",
    writeLimiter,
    auth,
    validateRequest(voidConsumptionSchema, async (input, request, response) => {
      noStore(response);
      response
        .status(200)
        .json({ data: await service.voidEntry(userId(request), input.params.entryId, input.body) });
    }),
  );
  router.post(
    "/consumption/entries/manual",
    writeLimiter,
    auth,
    validateRequest(addManualConsumptionSchema, async (input, request, response) => {
      noStore(response);
      response.status(201).json({ data: await service.addManual(userId(request), input.body) });
    }),
  );
  return router;
}
