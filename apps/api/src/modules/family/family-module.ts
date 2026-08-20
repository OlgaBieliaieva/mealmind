import type { DatabaseClient } from "@mealmind/db";
import type { Router } from "express";
import type {
  AuthenticationService,
  IdentityProvider,
} from "../../application/authentication/authentication-service.js";
import { createAccountInvitationService } from "./application/account-invitation-service.js";
import { createPrismaAccountInvitationRepository } from "./infrastructure/prisma-account-invitation-repository.js";
import { createResendAccountInvitationDelivery } from "./infrastructure/resend-account-invitation-delivery.js";
import { createFamilyService, type FamilyService } from "./application/family-service.js";
import { createPrismaFamilyRepository } from "./infrastructure/prisma-family-repository.js";
import { createFamilyRouter } from "./transport/family-router.js";

export interface FamilyModule {
  readonly router: Router;
  readonly service: FamilyService;
}
export function createFamilyModule(
  database: DatabaseClient,
  authenticationService: AuthenticationService,
  identityProvider?: IdentityProvider,
  invitationConfig?: {
    readonly appOrigin: string;
    readonly ttlHours: number;
    readonly resendFromEmail: string;
    readonly resendApiKey: string;
  },
): FamilyModule {
  const service = createFamilyService(createPrismaFamilyRepository(database));
  const invitationService =
    invitationConfig === undefined
      ? undefined
      : createAccountInvitationService(
          createPrismaAccountInvitationRepository(database),
          createResendAccountInvitationDelivery({
            apiKey: invitationConfig.resendApiKey,
            fromEmail: invitationConfig.resendFromEmail,
          }),
          invitationConfig,
        );
  return Object.freeze({
    service,
    router: createFamilyRouter(service, authenticationService, identityProvider, invitationService),
  });
}
