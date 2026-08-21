import { config as loadEnvironment } from "dotenv";
import { resolve } from "node:path";

import { createDatabaseClient } from "../../../src/client.js";

import { loadUsdaCatalog } from "./files.js";
import { databasePackageDirectory } from "./paths.js";
import { cleanupLocalUsdaCatalog, importUsdaCatalog } from "./run.js";
import { assertLocalCleanupTarget, resolveCatalogDatabaseTarget } from "./target.js";

const CLEANUP_CONFIRMATION = "--confirm-delete-usda-catalog";

type CatalogCommand =
  | { readonly kind: "import"; readonly dryRun: boolean; readonly batchSize?: number }
  | { readonly kind: "cleanup"; readonly confirmed: boolean };

loadEnvironment({
  path: resolve(databasePackageDirectory, "../..", ".env"),
});

async function main(): Promise<void> {
  const command = parseCommand(process.argv.slice(2));
  const target = resolveCatalogDatabaseTarget(process.env);
  const database = createDatabaseClient({
    connectionString: target.connectionString,
    log: ["error"],
  });

  console.info(
    `USDA catalog target: host=${target.hostname} database=${target.databaseName} local=${target.isLocal}`,
  );

  try {
    if (command.kind === "cleanup") {
      assertLocalCleanupTarget(target);

      if (!command.confirmed) {
        throw new Error(
          `Cleanup requires explicit confirmation: npm run db:cleanup:usda:local -- ${CLEANUP_CONFIRMATION}`,
        );
      }

      const report = await cleanupLocalUsdaCatalog(database);

      console.info(`USDA catalog cleanup completed. productsDeleted=${report.productsDeleted}`);
      return;
    }

    const catalog = await loadUsdaCatalog();

    console.info(`USDA catalog input: ${catalog.sourceFilePath}`);
    console.info(`USDA source release: ${catalog.manifest.sourceRelease}`);

    const report = await importUsdaCatalog({
      database,
      manifest: catalog.manifest,
      document: catalog.document,
      dryRun: command.dryRun,
      ...(command.batchSize === undefined ? {} : { batchSize: command.batchSize }),
    });

    console.info(
      command.dryRun ? "USDA catalog dry run completed." : "USDA catalog import completed.",
    );
    console.info(
      [
        `products=${report.productsTotal}`,
        `created=${report.productsCreated}`,
        `updated=${report.productsUpdated}`,
        `nutrients=${report.nutrientValues}`,
        `portions=${report.portions}`,
        `batches=${report.batches}`,
      ].join(" "),
    );
  } finally {
    await database.$disconnect();
  }
}

function parseCommand(arguments_: readonly string[]): CatalogCommand {
  const command = arguments_[0];

  if (command === "cleanup") {
    const unsupported = arguments_.slice(1).filter((argument) => argument !== CLEANUP_CONFIRMATION);

    if (unsupported.length > 0) {
      throw new Error(`Unsupported cleanup argument: ${unsupported[0]}`);
    }

    return {
      kind: "cleanup",
      confirmed: arguments_.includes(CLEANUP_CONFIRMATION),
    };
  }

  if (command !== "import") {
    throw new Error("Expected USDA catalog command: import or cleanup.");
  }

  let dryRun = false;
  let batchSize: number | undefined;

  for (let index = 1; index < arguments_.length; index += 1) {
    const argument = arguments_[index];

    if (argument === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (argument === "--batch-size") {
      const value = arguments_[index + 1];

      if (!value) {
        throw new Error("--batch-size requires a value.");
      }

      batchSize = Number(value);
      index += 1;
      continue;
    }

    throw new Error(`Unsupported import argument: ${argument}`);
  }

  return {
    kind: "import",
    dryRun,
    ...(batchSize === undefined ? {} : { batchSize }),
  };
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown USDA catalog error";

  console.error(`USDA catalog operation failed: ${message}`);
  process.exitCode = 1;
});
