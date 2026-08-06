import assert from "node:assert/strict";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

import { createDatabaseClient } from "@mealmind/db";

import { AccountEmailConflictError } from "../application/account-errors.js";
import { createPrismaAccountRepository } from "./prisma-account-repository.js";

try {
  loadEnvFile(resolve(process.cwd(), "../../.env"));
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
}

const connectionString = requireSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL);
const database = createDatabaseClient({ connectionString, log: ["error"] });
const repository = createPrismaAccountRepository(database);
const marker = crypto.randomUUID();
const email = `account-${marker}@example.test`;
const externalSubject = crypto.randomUUID();

try {
  const created = await repository.bootstrap(externalSubject, email);
  assert.ok(created);
  assert.equal(created.applicationRole, "USER");

  const repeated = await repository.bootstrap(externalSubject, email);
  assert.equal(repeated?.id, created.id);
  assert.equal(await database.user.count({ where: { externalSubject } }), 1);

  await assert.rejects(repository.bootstrap(crypto.randomUUID(), email), AccountEmailConflictError);

  await database.user.update({
    where: { externalSubject },
    data: { deletedAt: new Date() },
  });
  assert.equal(await repository.bootstrap(externalSubject, email), null);

  console.info("Account repository PostgreSQL integration test passed.");
} finally {
  await database.user.deleteMany({ where: { email } });
  await database.$disconnect();
}

function requireSafeTestDatabaseUrl(rawValue: string | undefined): string {
  if (rawValue === undefined) throw new Error("TEST_DATABASE_URL is required");
  const url = new URL(rawValue);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ""));

  if (
    !new Set(["127.0.0.1", "localhost", "::1"]).has(url.hostname) ||
    url.port !== "54322" ||
    databaseName !== "mealmind_test" ||
    url.searchParams.has("schema")
  ) {
    throw new Error("Account repository test may use only local mealmind_test on port 54322");
  }

  return url.toString();
}
