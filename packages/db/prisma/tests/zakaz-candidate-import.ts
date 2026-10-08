import assert from "node:assert/strict";
import { config as loadEnvironment } from "dotenv";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createDatabaseClient } from "../../src/client.js";
import { loadZakazCandidateBundle } from "../seeds/zakaz-candidates/files.js";
import { importZakazCandidates } from "../seeds/zakaz-candidates/run.js";
import { writeCandidateFixture } from "../seeds/zakaz-candidates/test-fixtures.js";
import { deployMigrations } from "./helpers/prisma-migrations.js";
import { recreateTestDatabase, resolveTestDatabaseTarget } from "./helpers/test-database.js";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, "../../../..");

loadEnvironment({ path: resolve(repositoryRoot, ".env") });

async function main(): Promise<void> {
  const target = resolveTestDatabaseTarget(process.env);
  console.info(`Recreating isolated Zakaz candidate test database ${target.databaseName}...`);
  await recreateTestDatabase(target);
  await deployMigrations(target);

  const directory = await mkdtemp(join(tmpdir(), "mealmind-zakaz-candidate-db-"));
  const database = createDatabaseClient({
    connectionString: target.connectionString,
    log: ["error"],
  });

  try {
    const bundle = await loadZakazCandidateBundle(await writeCandidateFixture(directory));
    const first = await importZakazCandidates({ database, bundle, batchSize: 2 });

    assert.equal(first.skipped, false);
    assert.equal(first.recordsCreated, 3);
    assert.equal(first.eventsCreated, 3);
    assert.ok(first.batchId);

    const batch = await database.productImportBatch.findUniqueOrThrow({
      where: { id: first.batchId! },
    });
    assert.equal(batch.status, "COMPLETED");
    assert.equal(batch.totalCount, 3);
    assert.ok(batch.completedAt instanceof Date);

    const statuses = await database.productImportCandidate.groupBy({
      by: ["status"],
      where: { batchId: batch.id },
      _count: { _all: true },
    });
    assert.deepEqual(Object.fromEntries(statuses.map((item) => [item.status, item._count._all])), {
      PENDING: 2,
      REJECTED: 1,
    });
    assert.equal(
      await database.productImportCandidateEvent.count({
        where: { candidate: { batchId: batch.id }, action: "IMPORTED" },
      }),
      3,
    );

    await database.productImportBatch.update({
      where: { id: batch.id },
      data: {
        status: "FAILED",
        completedAt: null,
        failedAt: new Date(),
        failureMessage: "simulated interrupted finalization",
      },
    });

    const resumed = await importZakazCandidates({ database, bundle, batchSize: 1 });
    assert.equal(resumed.skipped, false);
    assert.equal(resumed.recordsCreated, 0);
    assert.equal(resumed.recordsUpdated, 3);
    assert.equal(resumed.eventsCreated, 0);

    const second = await importZakazCandidates({ database, bundle, batchSize: 1 });
    assert.equal(second.skipped, true);
    assert.equal(second.recordsCreated, 0);
    assert.equal(await database.productImportBatch.count(), 1);
    assert.equal(await database.productImportCandidate.count(), 3);
    assert.equal(await database.productImportCandidateEvent.count(), 3);

    const event = await database.productImportCandidateEvent.findFirstOrThrow();
    await assert.rejects(
      database.productImportCandidateEvent.update({
        where: { id: event.id },
        data: { comment: "must fail" },
      }),
      /append-only/,
    );
    await assert.rejects(
      database.productImportCandidateEvent.delete({ where: { id: event.id } }),
      /append-only/,
    );

    console.info("Zakaz candidate import integration test passed.");
  } finally {
    await database.$disconnect();
    await rm(directory, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown Zakaz candidate test error";
  console.error(`Zakaz candidate import integration test failed: ${message}`);
  process.exitCode = 1;
});
