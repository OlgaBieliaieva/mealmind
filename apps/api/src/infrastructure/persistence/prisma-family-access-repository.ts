import type { DatabaseClient } from "@mealmind/db";

import type {
  FamilyAccessRepository,
  FamilyRole,
} from "../../application/authorization/family-authorization-service.js";

function mapFamilyRole(role: string): FamilyRole {
  switch (role) {
    case "OWNER":
    case "MEMBER":
      return role;
    default:
      throw new Error("Unsupported family role");
  }
}

export function createPrismaFamilyAccessRepository(
  database: DatabaseClient,
): FamilyAccessRepository {
  const repository: FamilyAccessRepository = {
    async findActiveMembership(userId: string, familyId: string) {
      const membership = await database.familyMembership.findFirst({
        where: {
          userId,
          familyId,
          status: "ACTIVE",
          endedAt: null,
          family: {
            archivedAt: null,
          },
        },
        select: {
          id: true,
          familyId: true,
          userId: true,
          role: true,
        },
      });

      if (membership === null) {
        return null;
      }

      return Object.freeze({
        membershipId: membership.id,
        familyId: membership.familyId,
        userId: membership.userId,
        role: mapFamilyRole(membership.role),
      });
    },
  };

  return Object.freeze(repository);
}
