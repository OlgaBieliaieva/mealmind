const LOCAL_DATABASE_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export interface CatalogDatabaseTarget {
  readonly connectionString: string;
  readonly hostname: string;
  readonly databaseName: string;
  readonly isLocal: boolean;
}

export function resolveCatalogDatabaseTarget(
  environment: NodeJS.ProcessEnv,
): CatalogDatabaseTarget {
  const connectionString = environment.DIRECT_URL?.trim();

  if (!connectionString) {
    throw new Error("DIRECT_URL is required for USDA catalog operations.");
  }

  let databaseUrl: URL;

  try {
    databaseUrl = new URL(connectionString);
  } catch {
    throw new Error("DIRECT_URL must be a valid PostgreSQL URL.");
  }

  if (databaseUrl.protocol !== "postgresql:" && databaseUrl.protocol !== "postgres:") {
    throw new Error("DIRECT_URL must use the postgresql: or postgres: protocol.");
  }

  const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\/+/, ""));

  if (!databaseName) {
    throw new Error("DIRECT_URL must include a database name.");
  }

  const isLocal = LOCAL_DATABASE_HOSTS.has(databaseUrl.hostname);

  if (!isLocal) {
    if (environment.USDA_IMPORT_ALLOW_REMOTE !== "true") {
      throw new Error("Remote USDA import requires USDA_IMPORT_ALLOW_REMOTE=true.");
    }

    if (environment.USDA_IMPORT_CONFIRM_DATABASE !== databaseName) {
      throw new Error(
        "Remote USDA import requires USDA_IMPORT_CONFIRM_DATABASE to equal the target database name.",
      );
    }
  }

  return {
    connectionString,
    hostname: databaseUrl.hostname,
    databaseName,
    isLocal,
  };
}

export function assertLocalCleanupTarget(target: CatalogDatabaseTarget): void {
  if (!target.isLocal) {
    throw new Error("USDA catalog cleanup is allowed only for a local PostgreSQL database.");
  }
}
