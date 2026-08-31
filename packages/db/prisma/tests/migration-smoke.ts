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
  "20260825120000_meal_plan_mutations",
  "20260826100000_meal_entry_prepared_state",
  "20260831120000_shopping_list_snapshot_metadata",
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

    const mealPlanMutationResult = await client.query<{ readonly revision_default: string }>(`
      SELECT column_default AS revision_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'meal_entries'
        AND column_name = 'revision'
    `);

    if (!mealPlanMutationResult.rows[0]?.revision_default?.includes("0")) {
      throw new Error("Meal entry revision migration was not applied");
    }

    const ledgerResult = await client.query<{ readonly table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'meal_plan_mutation_requests'
    `);

    if (ledgerResult.rows.length !== 1) {
      throw new Error("Meal plan idempotency ledger was not created");
    }

    const preparedStateResult = await client.query<{ readonly column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'meal_entries'
        AND column_name IN ('prepared_at', 'prepared_by_user_id')
      ORDER BY column_name
    `);

    if (preparedStateResult.rows.length !== 2) {
      throw new Error("Meal entry prepared state migration was not applied");
    }

    const shoppingSnapshotResult = await client.query<{ readonly column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          (table_name = 'shopping_lists' AND column_name = 'generation_warnings')
          OR
          (
            table_name = 'shopping_list_items'
            AND column_name IN (
              'product_name_snapshot',
              'category_code_snapshot',
              'category_name_snapshot',
              'group_category_code_snapshot',
              'group_category_name_snapshot'
            )
          )
        )
      ORDER BY column_name
    `);

    if (shoppingSnapshotResult.rows.length !== 6) {
      throw new Error("Shopping list snapshot metadata migration was not applied");
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
