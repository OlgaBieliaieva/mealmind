import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

import type { AuthenticationService } from "../../../application/authentication/authentication-service.js";
import { getAuthenticatedUser } from "../../../http/auth/request-context.js";
import { authenticate } from "../../../http/middleware/authenticate.js";
import { createApiRateLimitOptions } from "../../../http/middleware/rate-limit.js";
import { validateRequest } from "../../../http/validation/validate-request.js";
import type { FamilyService } from "../application/family-service.js";

const empty = z.object({}).strict();
const noBody = z.undefined().optional();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.valueOf()) &&
      parsed.toISOString().slice(0, 10) === value &&
      parsed <= new Date()
    );
  }, "Date must be a valid date that is not in the future");
const profile = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100).optional(),
    birthDate: date.optional(),
    biologicalSex: z.enum(["MALE", "FEMALE", "UNSPECIFIED"]).optional(),
  })
  .strict();
const onboarding = profile
  .extend({
    heightCm: z.number().min(50).max(260).optional(),
    weightKg: z.number().min(15).max(500).optional(),
    activityLevel: z.enum(["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"]).optional(),
    weightGoalType: z.enum(["MAINTAIN", "LOSE", "GAIN"]).optional(),
  })
  .strict();
const profilePatch = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).nullable().optional(),
    birthDate: date.nullable().optional(),
    biologicalSex: z.enum(["MALE", "FEMALE", "UNSPECIFIED"]).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");
const familyPatch = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    timeZone: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("uk-UA", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, "Time zone must be a valid IANA identifier")
      .optional(),
    weekStartsOn: z
      .enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"])
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");
function envelope<T extends z.ZodType>(body: T, params: z.ZodType = empty) {
  return z.object({ params, query: empty, body });
}
const memberParams = z.object({ memberId: z.uuid() }).strict();

export function createFamilyRouter(
  service: FamilyService,
  authenticationService: AuthenticationService,
): Router {
  const router = Router();
  const limiter = rateLimit(createApiRateLimitOptions({ windowMs: 60_000, limit: 30 }));
  const authenticated = authenticate(authenticationService);
  const userId = (request: Parameters<typeof getAuthenticatedUser>[0]) =>
    getAuthenticatedUser(request).userId;
  router.post(
    "/onboarding/complete",
    limiter,
    authenticated,
    validateRequest(envelope(onboarding), async (input, request, response) => {
      response
        .status(200)
        .json({ data: await service.completeOnboarding(userId(request), input.body) });
    }),
  );
  router.get(
    "/family/current",
    limiter,
    authenticated,
    validateRequest(envelope(noBody), async (_input, request, response) => {
      response.status(200).json({ data: await service.readFamily(userId(request)) });
    }),
  );
  router.patch(
    "/family/current",
    limiter,
    authenticated,
    validateRequest(envelope(familyPatch), async (input, request, response) => {
      response.status(200).json({ data: await service.updateFamily(userId(request), input.body) });
    }),
  );
  router.get(
    "/family/members",
    limiter,
    authenticated,
    validateRequest(envelope(noBody), async (_input, request, response) => {
      response.status(200).json({ data: { items: await service.listMembers(userId(request)) } });
    }),
  );
  router.post(
    "/family/members",
    limiter,
    authenticated,
    validateRequest(envelope(profile), async (input, request, response) => {
      response
        .status(201)
        .json({ data: await service.createDependent(userId(request), input.body) });
    }),
  );
  router.patch(
    "/family/members/:memberId",
    limiter,
    authenticated,
    validateRequest(envelope(profilePatch, memberParams), async (input, request, response) => {
      const params = input.params as { memberId: string };
      response.status(200).json({
        data: await service.updateDependent(userId(request), params.memberId, input.body),
      });
    }),
  );
  router.delete(
    "/family/members/:memberId",
    limiter,
    authenticated,
    validateRequest(envelope(noBody, memberParams), async (input, request, response) => {
      const params = input.params as { memberId: string };
      await service.archiveDependent(userId(request), params.memberId);
      response.status(204).send();
    }),
  );
  router.get(
    "/profile/me",
    limiter,
    authenticated,
    validateRequest(envelope(noBody), async (_input, request, response) => {
      response.status(200).json({ data: await service.readOwnProfile(userId(request)) });
    }),
  );
  router.patch(
    "/profile/me",
    limiter,
    authenticated,
    validateRequest(envelope(profilePatch), async (input, request, response) => {
      response
        .status(200)
        .json({ data: await service.updateOwnProfile(userId(request), input.body) });
    }),
  );
  return router;
}
