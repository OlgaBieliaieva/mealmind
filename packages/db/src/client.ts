import { PrismaPg } from "@prisma/adapter-pg";

import { Prisma, PrismaClient } from "./generated/prisma/client.ts";

export interface CreateDatabaseClientOptions {
  readonly connectionString: string;
  readonly log?: readonly Prisma.LogLevel[];
}

export function createDatabaseClient(options: CreateDatabaseClientOptions): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: options.connectionString,
  });

  return new PrismaClient({
    adapter,
    log: options.log ? [...options.log] : ["error"],
  });
}

export type DatabaseClient = ReturnType<typeof createDatabaseClient>;
