import { Client } from "pg";

const EXPECTED_DATABASE_NAME = "mealmind_test";
const EXPECTED_PORT = "54322";

const ALLOWED_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export interface TestDatabaseTarget {
  readonly connectionString: string;
  readonly databaseName: typeof EXPECTED_DATABASE_NAME;
  readonly maintenanceConnectionString: string;
}

export function resolveTestDatabaseTarget(environment: NodeJS.ProcessEnv): TestDatabaseTarget {
  const rawConnectionString = environment.TEST_DATABASE_URL?.trim();

  if (!rawConnectionString) {
    throw new Error("TEST_DATABASE_URL is required for database smoke tests");
  }

  let databaseUrl: URL;

  try {
    databaseUrl = new URL(rawConnectionString);
  } catch {
    throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL URL");
  }

  if (databaseUrl.protocol !== "postgresql:" && databaseUrl.protocol !== "postgres:") {
    throw new Error("TEST_DATABASE_URL must use the postgresql: or postgres: protocol");
  }

  if (!ALLOWED_HOSTS.has(databaseUrl.hostname)) {
    throw new Error("TEST_DATABASE_URL must target a local PostgreSQL host");
  }

  if (databaseUrl.port !== EXPECTED_PORT) {
    throw new Error(`TEST_DATABASE_URL must use local Supabase port ${EXPECTED_PORT}`);
  }

  const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\/+/, ""));

  if (databaseName !== EXPECTED_DATABASE_NAME) {
    throw new Error(`Database tests may only recreate ${EXPECTED_DATABASE_NAME}`);
  }

  if (databaseUrl.searchParams.has("schema")) {
    throw new Error("TEST_DATABASE_URL must reference a separate database, not a schema");
  }

  const maintenanceUrl = new URL(databaseUrl);
  maintenanceUrl.pathname = "/postgres";
  maintenanceUrl.hash = "";

  return {
    connectionString: databaseUrl.toString(),
    databaseName: EXPECTED_DATABASE_NAME,
    maintenanceConnectionString: maintenanceUrl.toString(),
  };
}

export async function recreateTestDatabase(target: TestDatabaseTarget): Promise<void> {
  const maintenanceClient = new Client({
    connectionString: target.maintenanceConnectionString,
  });

  await maintenanceClient.connect();

  try {
    await maintenanceClient.query(
      `
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1
          AND pid <> pg_backend_pid()
      `,
      [target.databaseName],
    );

    /*
     * Identifier is intentionally hardcoded. PostgreSQL parameters cannot be
     * used for database identifiers.
     */
    await maintenanceClient.query('DROP DATABASE IF EXISTS "mealmind_test"');

    await maintenanceClient.query(`
      CREATE DATABASE "mealmind_test"
      WITH
        TEMPLATE template0
        ENCODING 'UTF8'
    `);
  } finally {
    await maintenanceClient.end();
  }

  await verifyEmptyTestDatabase(target);
}

async function verifyEmptyTestDatabase(target: TestDatabaseTarget): Promise<void> {
  const testClient = new Client({
    connectionString: target.connectionString,
  });

  await testClient.connect();

  try {
    const databaseResult = await testClient.query<{
      readonly database_name: string;
      readonly encoding: string;
    }>(`
      SELECT
        current_database() AS database_name,
        pg_encoding_to_char(encoding) AS encoding
      FROM pg_database
      WHERE datname = current_database()
    `);

    const database = databaseResult.rows[0];

    if (database?.database_name !== EXPECTED_DATABASE_NAME) {
      throw new Error("Test database verification returned an unexpected database");
    }

    if (database.encoding !== "UTF8") {
      throw new Error("Test database must use UTF8 encoding");
    }

    const tableResult = await testClient.query<{
      readonly table_count: string;
    }>(`
      SELECT COUNT(*) AS table_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `);

    const tableCount = Number(tableResult.rows[0]?.table_count ?? Number.NaN);

    if (tableCount !== 0) {
      throw new Error(`Fresh test database contains ${tableCount} public tables`);
    }
  } finally {
    await testClient.end();
  }
}
