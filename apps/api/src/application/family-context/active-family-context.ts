import type { DatabaseClient } from "@mealmind/db";

import { InvalidFamilyContextError } from "../../modules/family/application/family-errors.js";

export interface ActiveFamilyContext {
  readonly id: string;
  readonly name: string;
  readonly timeZone: string;
  readonly weekStartsOn:
    "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  readonly role: "OWNER" | "MEMBER";
}

export interface ActiveFamilyContextResolver {
  resolve(userId: string): Promise<ActiveFamilyContext>;
}

export function createActiveFamilyContextResolver(
  database: DatabaseClient,
): ActiveFamilyContextResolver {
  const resolver: ActiveFamilyContextResolver = {
    async resolve(userId) {
      const memberships = await database.familyMembership.findMany({
        where: {
          userId,
          status: "ACTIVE",
          family: { archivedAt: null },
        },
        select: {
          role: true,
          family: {
            select: {
              id: true,
              name: true,
              timeZone: true,
              weekStartsOn: true,
            },
          },
        },
        take: 2,
      });

      if (memberships.length !== 1) {
        throw new InvalidFamilyContextError();
      }

      const membership = memberships[0];

      if (!membership) {
        throw new InvalidFamilyContextError();
      }

      return Object.freeze({
        ...membership.family,
        role: membership.role,
      });
    },
  };

  return Object.freeze(resolver);
}
