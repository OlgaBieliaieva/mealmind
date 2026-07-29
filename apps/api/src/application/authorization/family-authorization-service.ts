import { FamilyAccessDeniedError } from "../errors/authentication-errors.js";

export type FamilyRole = "OWNER" | "MEMBER";

export interface ActiveFamilyMembership {
  readonly membershipId: string;
  readonly familyId: string;
  readonly userId: string;
  readonly role: FamilyRole;
}

export interface FamilyAccessRepository {
  findActiveMembership(userId: string, familyId: string): Promise<ActiveFamilyMembership | null>;
}

export interface AuthorizedFamilyContext {
  readonly membershipId: string;
  readonly familyId: string;
  readonly userId: string;
  readonly role: FamilyRole;
}

export interface FamilyAuthorizationService {
  authorize(
    userId: string,
    familyId: string,
    allowedRoles?: readonly FamilyRole[],
  ): Promise<AuthorizedFamilyContext>;
}

export function createFamilyAuthorizationService(
  repository: FamilyAccessRepository,
): FamilyAuthorizationService {
  const service: FamilyAuthorizationService = {
    async authorize(
      userId: string,
      familyId: string,
      allowedRoles?: readonly FamilyRole[],
    ): Promise<AuthorizedFamilyContext> {
      const membership = await repository.findActiveMembership(userId, familyId);

      if (membership === null) {
        throw new FamilyAccessDeniedError();
      }

      if (allowedRoles !== undefined && !allowedRoles.includes(membership.role)) {
        throw new FamilyAccessDeniedError();
      }

      return Object.freeze({
        membershipId: membership.membershipId,
        familyId: membership.familyId,
        userId: membership.userId,
        role: membership.role,
      });
    },
  };

  return Object.freeze(service);
}
