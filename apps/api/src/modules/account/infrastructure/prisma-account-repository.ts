import { Prisma, type DatabaseClient } from "@mealmind/db";

import { AccountEmailConflictError } from "../application/account-errors.js";
import type { Account, AccountRepository, AccountRole } from "../domain/account-repository.js";

const accountSelect = {
  id: true,
  externalSubject: true,
  email: true,
  applicationRole: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

type AccountRow = Prisma.UserGetPayload<{ select: typeof accountSelect }>;

export function createPrismaAccountRepository(database: DatabaseClient): AccountRepository {
  const repository: AccountRepository = {
    async bootstrap(externalSubject, email) {
      const existing = await database.user.findUnique({
        where: { externalSubject },
        select: accountSelect,
      });

      if (existing !== null) {
        return existing.deletedAt === null ? mapAccount(existing) : null;
      }

      try {
        const created = await database.user.create({
          data: { externalSubject, email },
          select: accountSelect,
        });

        return mapAccount(created);
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }

        const racedAccount = await database.user.findUnique({
          where: { externalSubject },
          select: accountSelect,
        });

        if (racedAccount !== null) {
          return racedAccount.deletedAt === null ? mapAccount(racedAccount) : null;
        }

        throw new AccountEmailConflictError();
      }
    },
  };

  return Object.freeze(repository);
}

function mapAccount(row: AccountRow): Account {
  return Object.freeze({
    id: row.id,
    externalSubject: row.externalSubject,
    email: row.email,
    applicationRole: mapRole(row.applicationRole),
  });
}

function mapRole(role: string): AccountRole {
  if (role === "USER" || role === "ADMIN") {
    return role;
  }

  throw new Error("Unsupported application role");
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
