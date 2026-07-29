import { config as loadEnvironment } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createDatabaseClient } from "../../../src/client.js";

import { seedReferenceData } from "./run.js";

const seedDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(seedDirectory, "../../../../..");

loadEnvironment({
  path: resolve(repositoryRoot, ".env"),
});

async function main(): Promise<void> {
  const connectionString = readDirectDatabaseUrl();

  const database = createDatabaseClient({
    connectionString,
    log: ["error"],
  });

  try {
    const report = await seedReferenceData(database);

    console.info("MealMind reference seed completed.");

    for (const section of report.sections) {
      console.info(
        [
          section.entity,
          `created=${section.created}`,
          `updated=${section.updated}`,
          `unchanged=${section.unchanged}`,
        ].join(" "),
      );
    }

    console.info(
      [
        `total=${report.total}`,
        `created=${report.created}`,
        `updated=${report.updated}`,
        `unchanged=${report.unchanged}`,
      ].join(" "),
    );
  } finally {
    await database.$disconnect();
  }
}

function readDirectDatabaseUrl(): string {
  const value = process.env.DIRECT_URL?.trim();

  if (!value) {
    throw new Error("DIRECT_URL is required to run the reference seed");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error("DIRECT_URL must be a valid PostgreSQL URL");
  }

  if (parsedUrl.protocol !== "postgresql:" && parsedUrl.protocol !== "postgres:") {
    throw new Error("DIRECT_URL must use the postgresql: or postgres: protocol");
  }

  return value;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown reference seed error";

  console.error(`Reference seed failed: ${message}`);
  process.exitCode = 1;
});
