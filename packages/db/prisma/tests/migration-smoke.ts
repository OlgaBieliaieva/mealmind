import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnvironment } from "dotenv";
import { Client } from "pg";

import { deployMigrations } from "./helpers/prisma-migrations.js";
import {
  recreateTestDatabase,
  resolveTestDatabaseTarget,
  type TestDatabaseTarget,
} from "./helpers/test-database.js";

const testDirectory = dirname(fileURLToPath(import.meta.url));

const repositoryRoot = resolve(testDirectory, "../../../..");

const EXPECTED_MIGRATIONS = [
  "20260728135246_00_baseline",
  "20260812120000_01_family_member_account_invitations",
  "20260813112956_add_nutrient_target_energy_snapshot",
  "20260814073753_replace_meal_settings_with_meal_type_preferences",
] as const;

loadEnvironment({
  path: resolve(repositoryRoot, ".env"),
});

async function main(): Promise<void> {
  const target = resolveTestDatabaseTarget(process.env);

  console.info(`Recreating local test database ${target.databaseName}...`);

  await recreateTestDatabase(target);

  console.info("Applying Prisma migrations...");

  await deployMigrations(target);

  const report = await verifyAppliedMigrations(target);

  console.info("Migration smoke test passed.");
  console.info(`migrations=${report.migrationNames.join(",")}`);
  console.info(`publicTables=${report.publicTableCount}`);
}

interface MigrationVerificationReport {
  readonly migrationNames: readonly string[];
  readonly publicTableCount: number;
}

async function verifyAppliedMigrations(
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

    if (migrationResult.rows.length !== EXPECTED_MIGRATIONS.length) {
      throw new Error(
        `Expected ${EXPECTED_MIGRATIONS.length} migrations, received ${migrationResult.rows.length}`,
      );
    }

    for (const [index, migration] of migrationResult.rows.entries()) {
      if (migration.migration_name !== EXPECTED_MIGRATIONS[index]) {
        throw new Error(
          `Unexpected migration applied at position ${index}: ${migration.migration_name}`,
        );
      }

      if (!migration.finished || migration.rolled_back || migration.applied_steps_count !== 1) {
        throw new Error(`Migration has an invalid applied state: ${migration.migration_name}`);
      }
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
      throw new Error("Applied migrations did not create application tables");
    }

    return {
      migrationNames: migrationResult.rows.map((migration) => migration.migration_name),
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
