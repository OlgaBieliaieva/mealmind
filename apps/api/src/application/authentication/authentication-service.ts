import {
  AccountAccessDeniedError,
  AuthenticationRequiredError,
} from "../errors/authentication-errors.js";

export type ApplicationRole = "USER" | "ADMIN";

export interface VerifiedIdentity {
  readonly subject: string;
  readonly email: string | null;
}

export interface IdentityProvider {
  verifyAccessToken(accessToken: string): Promise<VerifiedIdentity | null>;
}

export interface ApplicationUser {
  readonly id: string;
  readonly externalSubject: string;
  readonly email: string;
  readonly applicationRole: ApplicationRole;
}

export interface UserIdentityRepository {
  findActiveByExternalSubject(externalSubject: string): Promise<ApplicationUser | null>;
}

export interface AuthenticatedUserContext {
  readonly userId: string;
  readonly externalSubject: string;
  readonly email: string;
  readonly applicationRole: ApplicationRole;
}

export interface AuthenticationService {
  authenticateAccessToken(accessToken: string): Promise<AuthenticatedUserContext>;
}

export interface AuthenticationServiceDependencies {
  readonly identityProvider: IdentityProvider;
  readonly userIdentityRepository: UserIdentityRepository;
}

export function createAuthenticationService(
  dependencies: AuthenticationServiceDependencies,
): AuthenticationService {
  const service: AuthenticationService = {
    async authenticateAccessToken(accessToken: string): Promise<AuthenticatedUserContext> {
      const identity = await dependencies.identityProvider.verifyAccessToken(accessToken);

      if (identity === null) {
        throw new AuthenticationRequiredError();
      }

      const user = await dependencies.userIdentityRepository.findActiveByExternalSubject(
        identity.subject,
      );

      if (user === null) {
        throw new AccountAccessDeniedError();
      }

      return Object.freeze({
        userId: user.id,
        externalSubject: user.externalSubject,
        email: user.email,
        applicationRole: user.applicationRole,
      });
    },
  };

  return Object.freeze(service);
}
