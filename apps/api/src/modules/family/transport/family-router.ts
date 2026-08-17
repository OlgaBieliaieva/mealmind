import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import type {
  AuthenticationService,
  IdentityProvider,
} from "../../../application/authentication/authentication-service.js";
import { getAuthenticatedUser } from "../../../http/auth/request-context.js";
import { getVerifiedIdentity } from "../../../http/auth/verified-identity-context.js";
import { authenticate } from "../../../http/middleware/authenticate.js";
import { createApiRateLimitOptions } from "../../../http/middleware/rate-limit.js";
import { verifyIdentity } from "../../../http/middleware/verify-identity.js";
import { validateRequest } from "../../../http/validation/validate-request.js";
import { invitationErrors } from "../application/account-invitation-errors.js";
import type { AccountInvitationService } from "../application/account-invitation-service.js";
import type { FamilyService } from "../application/family-service.js";
import {
  accountInvitationInputSchema,
  accountInvitationTokenSchema,
  activityPeriodInputSchema,
  allergiesInputSchema,
  bodyMeasurementInputSchema,
  cuisinePreferencesInputSchema,
  dietaryRestrictionsInputSchema,
  dislikedProductsInputSchema,
  familyPatchSchema,
  mealTypesInputSchema,
  memberParamsSchema,
  noBodySchema,
  nutrientTargetsInputSchema,
  onboardingInputSchema,
  profileInputSchema,
  profilePatchSchema,
  requestEnvelopeSchema,
  weightGoalInputSchema,
} from "./family-schemas.js";

export function createFamilyRouter(
  service: FamilyService,
  authenticationService: AuthenticationService,
  identityProvider?: IdentityProvider,
  invitationService?: AccountInvitationService,
): Router {
  const router = Router();

  const limiter = rateLimit(
    createApiRateLimitOptions({
      windowMs: 60_000,
      limit: 30,
    }),
  );

  const authenticated = authenticate(authenticationService);

  const userId = (request: Parameters<typeof getAuthenticatedUser>[0]) =>
    getAuthenticatedUser(request).userId;

  router.post(
    "/onboarding/complete",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(onboardingInputSchema),
      async (input, request, response) => {
        response.status(200).json({
          data: await service.completeOnboarding(userId(request), input.body),
        });
      },
    ),
  );

  router.get(
    "/family/current",
    limiter,
    authenticated,
    validateRequest(requestEnvelopeSchema(noBodySchema), async (_input, request, response) => {
      response.status(200).json({
        data: await service.readFamily(userId(request)),
      });
    }),
  );

  router.patch(
    "/family/current",
    limiter,
    authenticated,
    validateRequest(requestEnvelopeSchema(familyPatchSchema), async (input, request, response) => {
      response.status(200).json({
        data: await service.updateFamily(userId(request), input.body),
      });
    }),
  );

  if (identityProvider !== undefined && invitationService !== undefined) {
    const invitationLimiter = rateLimit(
      createApiRateLimitOptions({
        windowMs: 60_000,
        limit: 10,
      }),
    );

    router.post(
      "/family/members/:memberId/account-invitation",
      invitationLimiter,
      authenticated,
      validateRequest(
        requestEnvelopeSchema(accountInvitationInputSchema, memberParamsSchema),
        async (input, request, response) => {
          const actorUserId = userId(request);

          const data = await invitationService.create(
            actorUserId,
            input.params.memberId,
            input.body.recipientEmail,
          );

          request.logger?.info(
            {
              actorUserId,
              targetFamilyMemberId: input.params.memberId,
              action: "FAMILY_ACCOUNT_INVITATION_CREATED",
            },
            "Family security action completed",
          );

          response.status(201).json({
            data,
          });
        },
      ),
    );

    router.get(
      "/family/members/:memberId/account-invitation",
      invitationLimiter,
      authenticated,
      validateRequest(
        requestEnvelopeSchema(noBodySchema, memberParamsSchema),
        async (input, request, response) => {
          response.status(200).json({
            data: await invitationService.read(userId(request), input.params.memberId),
          });
        },
      ),
    );

    router.post(
      "/family/members/:memberId/account-invitation/resend",
      invitationLimiter,
      authenticated,
      validateRequest(
        requestEnvelopeSchema(noBodySchema, memberParamsSchema),
        async (input, request, response) => {
          const actorUserId = userId(request);

          const data = await invitationService.resend(actorUserId, input.params.memberId);

          request.logger?.info(
            {
              actorUserId,
              targetFamilyMemberId: input.params.memberId,
              action: "FAMILY_ACCOUNT_INVITATION_RESENT",
            },
            "Family security action completed",
          );

          response.status(200).json({
            data,
          });
        },
      ),
    );

    router.delete(
      "/family/members/:memberId/account-invitation",
      invitationLimiter,
      authenticated,
      validateRequest(
        requestEnvelopeSchema(noBodySchema, memberParamsSchema),
        async (input, request, response) => {
          const actorUserId = userId(request);

          await invitationService.revoke(actorUserId, input.params.memberId);

          request.logger?.info(
            {
              actorUserId,
              targetFamilyMemberId: input.params.memberId,
              action: "FAMILY_ACCOUNT_INVITATION_REVOKED",
            },
            "Family security action completed",
          );

          response.status(204).send();
        },
      ),
    );

    router.post(
      "/account-invitations/inspect",
      invitationLimiter,
      validateRequest(
        requestEnvelopeSchema(accountInvitationTokenSchema),
        async (input, _request, response) => {
          response.status(200).json({
            data: await invitationService.inspect(input.body.token),
          });
        },
      ),
    );

    router.post(
      "/account-invitations/claim",
      invitationLimiter,
      verifyIdentity(identityProvider),
      authenticated,
      validateRequest(
        requestEnvelopeSchema(accountInvitationTokenSchema),
        async (input, request, response) => {
          const identity = getVerifiedIdentity(request);

          if (!identity.emailVerified || identity.email === null) {
            throw invitationErrors.emailUnverified();
          }

          const actorUserId = userId(request);

          await invitationService.claim(input.body.token, actorUserId, identity.email);

          request.logger?.info(
            {
              actorUserId,
              action: "FAMILY_ACCOUNT_INVITATION_CLAIMED",
            },
            "Family security action completed",
          );

          response.status(200).json({
            data: await service.readSession(actorUserId),
          });
        },
      ),
    );
  }

  router.get(
    "/family/members",
    limiter,
    authenticated,
    validateRequest(requestEnvelopeSchema(noBodySchema), async (_input, request, response) => {
      response.status(200).json({
        data: {
          items: await service.listMembers(userId(request)),
        },
      });
    }),
  );

  router.post(
    "/family/members",
    limiter,
    authenticated,
    validateRequest(requestEnvelopeSchema(profileInputSchema), async (input, request, response) => {
      response.status(201).json({
        data: await service.createDependent(userId(request), input.body),
      });
    }),
  );

  router.patch(
    "/family/members/:memberId",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(profilePatchSchema, memberParamsSchema),
      async (input, request, response) => {
        const actorUserId = userId(request);

        const data = await service.updateDependent(actorUserId, input.params.memberId, input.body);

        request.logger?.info(
          {
            actorUserId,
            targetPersonProfileId: data.profileId,
            action: "FAMILY_MEMBER_PROFILE_UPDATED",
          },
          "Family profile action completed",
        );

        response.status(200).json({
          data,
        });
      },
    ),
  );

  router.delete(
    "/family/members/:memberId",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(noBodySchema, memberParamsSchema),
      async (input, request, response) => {
        await service.archiveDependent(userId(request), input.params.memberId);

        response.status(204).send();
      },
    ),
  );

  router.get(
    "/family/members/:memberId/profile",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(noBodySchema, memberParamsSchema),
      async (input, request, response) => {
        response.status(200).json({
          data: await service.readManagedProfile(userId(request), input.params.memberId),
        });
      },
    ),
  );

  router.patch(
    "/family/members/:memberId/profile",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(profilePatchSchema, memberParamsSchema),
      async (input, request, response) => {
        const actorUserId = userId(request);
        const data = await service.updateManagedProfile(
          actorUserId,
          input.params.memberId,
          input.body,
        );

        request.logger?.info(
          {
            actorUserId,
            targetFamilyMemberId: input.params.memberId,
            targetPersonProfileId: data.id,
            action: "MANAGED_PROFILE_UPDATED",
          },
          "Family profile action completed",
        );

        response.status(200).json({ data });
      },
    ),
  );

  router.put(
    "/family/members/:memberId/profile/meal-types",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(mealTypesInputSchema, memberParamsSchema),
      async (input, request, response) => {
        const actorUserId = userId(request);
        const data = await service.replaceManagedMealTypes(
          actorUserId,
          input.params.memberId,
          input.body,
        );
        response.status(200).json({ data });
      },
    ),
  );

  router.put(
    "/family/members/:memberId/profile/cuisines",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(cuisinePreferencesInputSchema, memberParamsSchema),
      async (input, request, response) => {
        const data = await service.replaceManagedCuisinePreferences(
          userId(request),
          input.params.memberId,
          input.body,
        );
        response.status(200).json({ data });
      },
    ),
  );

  router.put(
    "/family/members/:memberId/profile/disliked-products",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(dislikedProductsInputSchema, memberParamsSchema),
      async (input, request, response) => {
        const data = await service.replaceManagedDislikedProducts(
          userId(request),
          input.params.memberId,
          input.body,
        );
        response.status(200).json({ data });
      },
    ),
  );

  router.put(
    "/family/members/:memberId/profile/dietary-restrictions",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(dietaryRestrictionsInputSchema, memberParamsSchema),
      async (input, request, response) => {
        const data = await service.replaceManagedDietaryRestrictions(
          userId(request),
          input.params.memberId,
          input.body,
        );
        response.status(200).json({ data });
      },
    ),
  );

  router.put(
    "/family/members/:memberId/profile/allergies",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(allergiesInputSchema, memberParamsSchema),
      async (input, request, response) => {
        const data = await service.replaceManagedAllergies(
          userId(request),
          input.params.memberId,
          input.body,
        );
        response.status(200).json({ data });
      },
    ),
  );

  router.post(
    "/family/members/:memberId/profile/body-measurements",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(bodyMeasurementInputSchema, memberParamsSchema),
      async (input, request, response) => {
        const data = await service.appendManagedBodyMeasurement(
          userId(request),
          input.params.memberId,
          input.body,
        );
        response.status(201).json({ data });
      },
    ),
  );

  router.post(
    "/family/members/:memberId/profile/activity-periods",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(activityPeriodInputSchema, memberParamsSchema),
      async (input, request, response) => {
        const data = await service.appendManagedActivityPeriod(
          userId(request),
          input.params.memberId,
          input.body,
        );
        response.status(201).json({ data });
      },
    ),
  );

  router.post(
    "/family/members/:memberId/profile/weight-goals",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(weightGoalInputSchema, memberParamsSchema),
      async (input, request, response) => {
        const data = await service.replaceManagedWeightGoal(
          userId(request),
          input.params.memberId,
          input.body,
        );
        response.status(201).json({ data });
      },
    ),
  );

  router.post(
    "/family/members/:memberId/profile/weight-goals/current/complete",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(noBodySchema, memberParamsSchema),
      async (input, request, response) => {
        const data = await service.completeManagedWeightGoal(
          userId(request),
          input.params.memberId,
        );
        response.status(200).json({ data });
      },
    ),
  );

  router.post(
    "/family/members/:memberId/profile/weight-goals/current/cancel",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(noBodySchema, memberParamsSchema),
      async (input, request, response) => {
        const data = await service.cancelManagedWeightGoal(userId(request), input.params.memberId);
        response.status(200).json({ data });
      },
    ),
  );

  router.put(
    "/family/members/:memberId/profile/nutrient-targets",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(nutrientTargetsInputSchema, memberParamsSchema),
      async (input, request, response) => {
        const data = await service.replaceManagedNutrientTargets(
          userId(request),
          input.params.memberId,
          input.body,
        );
        response.status(200).json({ data });
      },
    ),
  );

  router.post(
    "/family/members/:memberId/profile/nutrient-targets/calculate",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(noBodySchema, memberParamsSchema),
      async (input, request, response) => {
        const data = await service.recalculateManagedNutrientTargets(
          userId(request),
          input.params.memberId,
        );
        response.status(200).json({ data });
      },
    ),
  );

  router.get(
    "/profile/me",
    limiter,
    authenticated,
    validateRequest(requestEnvelopeSchema(noBodySchema), async (_input, request, response) => {
      response.status(200).json({
        data: await service.readOwnProfile(userId(request)),
      });
    }),
  );

  router.patch(
    "/profile/me",
    limiter,
    authenticated,
    validateRequest(requestEnvelopeSchema(profilePatchSchema), async (input, request, response) => {
      response.status(200).json({
        data: await service.updateOwnProfile(userId(request), input.body),
      });
    }),
  );

  router.put(
    "/profile/me/meal-types",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(mealTypesInputSchema),
      async (input, request, response) => {
        const actorUserId = userId(request);

        const data = await service.replaceOwnMealTypes(actorUserId, input.body);

        request.logger?.info(
          {
            actorUserId,
            targetPersonProfileId: data.id,
            action: "OWN_PROFILE_MEAL_TYPES_UPDATED",
          },
          "Profile action completed",
        );

        response.status(200).json({
          data,
        });
      },
    ),
  );

  router.put(
    "/profile/me/cuisines",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(cuisinePreferencesInputSchema),
      async (input, request, response) => {
        const actorUserId = userId(request);

        const data = await service.replaceOwnCuisinePreferences(actorUserId, input.body);

        request.logger?.info(
          {
            actorUserId,
            targetPersonProfileId: data.id,
            action: "OWN_PROFILE_CUISINE_PREFERENCES_UPDATED",
          },
          "Profile action completed",
        );

        response.status(200).json({
          data,
        });
      },
    ),
  );

  router.put(
    "/profile/me/disliked-products",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(dislikedProductsInputSchema),
      async (input, request, response) => {
        const actorUserId = userId(request);

        const data = await service.replaceOwnDislikedProducts(actorUserId, input.body);

        request.logger?.info(
          {
            actorUserId,
            targetPersonProfileId: data.id,
            action: "OWN_PROFILE_DISLIKED_PRODUCTS_UPDATED",
          },
          "Profile action completed",
        );

        response.status(200).json({
          data,
        });
      },
    ),
  );

  router.put(
    "/profile/me/dietary-restrictions",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(dietaryRestrictionsInputSchema),
      async (input, request, response) => {
        const actorUserId = userId(request);

        const data = await service.replaceOwnDietaryRestrictions(actorUserId, input.body);

        request.logger?.info(
          {
            actorUserId,
            targetPersonProfileId: data.id,
            action: "OWN_PROFILE_DIETARY_RESTRICTIONS_UPDATED",
          },
          "Profile action completed",
        );

        response.status(200).json({
          data,
        });
      },
    ),
  );

  router.put(
    "/profile/me/allergies",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(allergiesInputSchema),
      async (input, request, response) => {
        const actorUserId = userId(request);

        const data = await service.replaceOwnAllergies(actorUserId, input.body);

        request.logger?.info(
          {
            actorUserId,
            targetPersonProfileId: data.id,
            action: "OWN_PROFILE_ALLERGIES_UPDATED",
          },
          "Profile action completed",
        );

        response.status(200).json({
          data,
        });
      },
    ),
  );

  router.post(
    "/profile/me/body-measurements",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(bodyMeasurementInputSchema),
      async (input, request, response) => {
        const actorUserId = userId(request);

        const data = await service.appendOwnBodyMeasurement(actorUserId, input.body);

        request.logger?.info(
          {
            actorUserId,
            targetPersonProfileId: data.id,
            action: "OWN_PROFILE_BODY_MEASUREMENT_ADDED",
          },
          "Profile action completed",
        );

        response.status(201).json({
          data,
        });
      },
    ),
  );

  router.post(
    "/profile/me/activity-periods",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(activityPeriodInputSchema),
      async (input, request, response) => {
        const actorUserId = userId(request);

        const data = await service.appendOwnActivityPeriod(actorUserId, input.body);

        request.logger?.info(
          {
            actorUserId,
            targetPersonProfileId: data.id,
            action: "OWN_PROFILE_ACTIVITY_PERIOD_ADDED",
          },
          "Profile action completed",
        );

        response.status(201).json({
          data,
        });
      },
    ),
  );

  router.post(
    "/profile/me/weight-goals",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(weightGoalInputSchema),
      async (input, request, response) => {
        const actorUserId = userId(request);

        const data = await service.replaceOwnWeightGoal(actorUserId, input.body);

        request.logger?.info(
          {
            actorUserId,
            targetPersonProfileId: data.id,
            action: "OWN_PROFILE_WEIGHT_GOAL_REPLACED",
          },
          "Profile action completed",
        );

        response.status(201).json({
          data,
        });
      },
    ),
  );

  router.post(
    "/profile/me/weight-goals/current/complete",
    limiter,
    authenticated,
    validateRequest(requestEnvelopeSchema(noBodySchema), async (_input, request, response) => {
      const actorUserId = userId(request);

      const data = await service.completeOwnWeightGoal(actorUserId);

      request.logger?.info(
        {
          actorUserId,
          targetPersonProfileId: data.id,
          action: "OWN_PROFILE_WEIGHT_GOAL_COMPLETED",
        },
        "Profile action completed",
      );

      response.status(200).json({
        data,
      });
    }),
  );

  router.post(
    "/profile/me/weight-goals/current/cancel",
    limiter,
    authenticated,
    validateRequest(requestEnvelopeSchema(noBodySchema), async (_input, request, response) => {
      const actorUserId = userId(request);

      const data = await service.cancelOwnWeightGoal(actorUserId);

      request.logger?.info(
        {
          actorUserId,
          targetPersonProfileId: data.id,
          action: "OWN_PROFILE_WEIGHT_GOAL_CANCELLED",
        },
        "Profile action completed",
      );

      response.status(200).json({
        data,
      });
    }),
  );

  router.put(
    "/profile/me/nutrient-targets",
    limiter,
    authenticated,
    validateRequest(
      requestEnvelopeSchema(nutrientTargetsInputSchema),
      async (input, request, response) => {
        const actorUserId = userId(request);

        const data = await service.replaceOwnNutrientTargets(actorUserId, input.body);

        request.logger?.info(
          {
            actorUserId,
            targetPersonProfileId: data.id,
            action: "OWN_PROFILE_NUTRIENT_TARGETS_REPLACED",
          },
          "Profile action completed",
        );

        response.status(200).json({
          data,
        });
      },
    ),
  );

  router.post(
    "/profile/me/nutrient-targets/calculate",
    limiter,
    authenticated,
    validateRequest(requestEnvelopeSchema(noBodySchema), async (_input, request, response) => {
      const actorUserId = userId(request);

      const data = await service.recalculateOwnNutrientTargets(actorUserId);

      request.logger?.info(
        {
          actorUserId,

          targetPersonProfileId: data.id,

          action: "OWN_PROFILE_NUTRIENT_TARGETS_RECALCULATED",
        },
        "Profile action completed",
      );

      response.status(200).json({
        data,
      });
    }),
  );

  return router;
}
