import { config as loadEnvironment } from "dotenv";
import { resolve } from "node:path";

import { createDatabaseClient } from "../../../src/client.js";

import { loadZakazCandidateBundle } from "./files.js";
import { databasePackageDirectory, defaultZakazCandidateManifestPath } from "./paths.js";
import { importZakazCandidates } from "./run.js";
import { resolveZakazImportDatabaseTarget } from "./target.js";

interface ZakazCandidateCommand {
  readonly dryRun: boolean;
  readonly manifestPath: string;
  readonly batchSize?: number;
}

loadEnvironment({ path: resolve(databasePackageDirectory, "../..", ".env") });

async function main(): Promise<void> {
  const command = parseCommand(process.argv.slice(2));
  const bundle = await loadZakazCandidateBundle(command.manifestPath);

  console.info(`Zakaz candidate manifest: ${bundle.manifestPath}`);
  console.info(`Zakaz candidate manifest checksum: ${bundle.manifestChecksum}`);

  if (command.dryRun) {
    const report = await importZakazCandidates({
      bundle,
      dryRun: true,
      ...(command.batchSize === undefined ? {} : { batchSize: command.batchSize }),
    });
    printReport(report);
    return;
  }

  const target = resolveZakazImportDatabaseTarget(process.env);
  const database = createDatabaseClient({ connectionString: target.connectionString, log: ["error"] });
  console.info(
    `Zakaz candidate target: host=${target.hostname} database=${target.databaseName} local=${target.isLocal}`,
  );

  try {
    const report = await importZakazCandidates({
      database,
      bundle,
      ...(command.batchSize === undefined ? {} : { batchSize: command.batchSize }),
    });
    printReport(report);
  } finally {
    await database.$disconnect();
  }
}

export function parseCommand(arguments_: readonly string[]): ZakazCandidateCommand {
  let dryRun = false;
  let manifestPath = defaultZakazCandidateManifestPath;
  let batchSize: number | undefined;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];

    if (argument === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (argument === "--manifest") {
      manifestPath = resolve(requireValue(arguments_, ++index, argument));
      continue;
    }
    if (argument === "--batch-size") {
      batchSize = Number(requireValue(arguments_, ++index, argument));
      continue;
    }
    throw new Error(`Невідомий аргумент Zakaz candidate import: ${argument}`);
  }

  return {
    dryRun,
    manifestPath,
    ...(batchSize === undefined ? {} : { batchSize }),
  };
}

function printReport(report: Awaited<ReturnType<typeof importZakazCandidates>>): void {
  console.info(
    report.dryRun
      ? "Zakaz candidate dry run completed."
      : report.skipped
        ? "Zakaz candidate import already completed for this manifest."
        : "Zakaz candidate import completed.",
  );
  console.info(
    [
      `total=${report.total}`,
      `candidates=${report.candidates}`,
      `reviewRequired=${report.reviewRequired}`,
      `rejected=${report.rejected}`,
      `created=${report.recordsCreated}`,
      `updated=${report.recordsUpdated}`,
      `events=${report.eventsCreated}`,
      `transactionBatches=${report.transactionBatches}`,
    ].join(" "),
  );
}

function requireValue(arguments_: readonly string[], index: number, option: string): string {
  const value = arguments_[index];
  if (!value) throw new Error(`${option} потребує значення`);
  return value;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown Zakaz candidate import error";
  console.error(`Zakaz candidate import failed: ${message}`);
  process.exitCode = 1;
});
