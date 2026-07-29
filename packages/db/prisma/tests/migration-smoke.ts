import { deployMigrations } from "./helpers/prisma-migrations.js";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnvironment } from "dotenv";
import { Client } from "pg";

import {
  recreateTestDatabase,
  resolveTestDatabaseTarget,
  type TestDatabaseTarget,
} from "./helpers/test-database.js";

const testDirectory = dirname(fileURLToPath(import.meta.url));

const repositoryRoot = resolve(testDirectory, "../../../..");

const EXPECTED_BASELINE = "20260728135246_00_baseline";

loadEnvironment({
  path: resolve(repositoryRoot, ".env"),
});

async function main(): Promise<void> {
  const target = resolveTestDatabaseTarget(process.env);

  console.info(`Recreating local test database ${target.databaseName}...`);

  await recreateTestDatabase(target);

  console.info("Applying Prisma baseline migration...");

  await deployMigrations(target);

  const report = await verifyAppliedBaseline(target);

  console.info("Migration smoke test passed.");
  console.info(`migration=${report.migrationName}`);
  console.info(`publicTables=${report.publicTableCount}`);
}

interface MigrationVerificationReport {
  readonly migrationName: string;
  readonly publicTableCount: number;
}

async function verifyAppliedBaseline(
  target: TestDatabaseTarget,
): Promise<MigrationVerificationReport> {
  const client = new Client({
    connectionString: target.connectionString,
  });

  await client.connect();

  try {
    const migrationResult = await client.query<{
      readonly migration_name: string;
      readonly finished: boolean;
      readonly rolled_back: boolean;
      readonly applied_steps_count: number;
    }>(`
      SELECT
        migration_name,
        finished_at IS NOT NULL AS finished,
        rolled_back_at IS NOT NULL AS rolled_back,
        applied_steps_count
      FROM public._prisma_migrations
      ORDER BY started_at
    `);

    if (migrationResult.rows.length !== 1) {
      throw new Error(`Expected exactly one migration, received ${migrationResult.rows.length}`);
    }

    const migration = migrationResult.rows[0];

    if (!migration) {
      throw new Error("Baseline migration record is missing");
    }

    if (migration.migration_name !== EXPECTED_BASELINE) {
      throw new Error(`Unexpected migration applied: ${migration.migration_name}`);
    }

    if (!migration.finished) {
      throw new Error("Baseline migration is not marked as finished");
    }

    if (migration.rolled_back) {
      throw new Error("Baseline migration is marked as rolled back");
    }

    if (migration.applied_steps_count !== 1) {
      throw new Error("Baseline migration has an unexpected applied step count");
    }

    const tableResult = await client.query<{
      readonly table_count: string;
    }>(`
      SELECT COUNT(*) AS table_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `);

    const publicTableCount = Number(tableResult.rows[0]?.table_count ?? Number.NaN);

    if (!Number.isInteger(publicTableCount)) {
      throw new Error("Unable to determine the number of migrated tables");
    }

    /*
     * _prisma_migrations plus application tables must exist.
     * Exact application table coverage will be verified separately.
     */
    if (publicTableCount <= 1) {
      throw new Error("Baseline migration did not create application tables");
    }

    return {
      migrationName: migration.migration_name,
      publicTableCount,
    };
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown migration smoke test error";

  console.error(`Migration smoke test failed: ${message}`);
  process.exitCode = 1;
});
