import type { DatabaseClient } from "@mealmind/db";

import type {
  ApplicationRole,
  UserIdentityRepository,
} from "../../application/authentication/authentication-service.js";

function mapApplicationRole(role: string): ApplicationRole {
  switch (role) {
    case "USER":
    case "ADMIN":
      return role;
    default:
      throw new Error("Unsupported application role");
  }
}

export function createPrismaUserIdentityRepository(
  database: DatabaseClient,
): UserIdentityRepository {
  const repository: UserIdentityRepository = {
    async findActiveByExternalSubject(externalSubject: string) {
      const user = await database.user.findFirst({
        where: {
          externalSubject,
          deletedAt: null,
        },
        select: {
          id: true,
          externalSubject: true,
          email: true,
          applicationRole: true,
        },
      });

      if (user === null) {
        return null;
      }

      return Object.freeze({
        id: user.id,
        externalSubject: user.externalSubject,
        email: user.email,
        applicationRole: mapApplicationRole(user.applicationRole),
      });
    },
  };

  return Object.freeze(repository);
}
