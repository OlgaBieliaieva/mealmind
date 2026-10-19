import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadZakazCandidateBundle } from "./files.js";
import { importZakazCandidates } from "./run.js";
import { writeCandidateFixture } from "./test-fixtures.js";

test("validates all dispositions in dry-run mode without a database", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mealmind-zakaz-dry-run-"));
  try {
    const bundle = await loadZakazCandidateBundle(await writeCandidateFixture(directory));
    const report = await importZakazCandidates({ bundle, dryRun: true, batchSize: 2 });

    assert.equal(report.total, 3);
    assert.equal(report.recordsCreated, 0);
    assert.equal(report.transactionBatches, 3);
    assert.equal(report.batchId, null);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects an identity repeated across disposition artifacts", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mealmind-zakaz-duplicate-"));
  try {
    const bundle = await loadZakazCandidateBundle(
      await writeCandidateFixture(directory, { duplicateIdentity: true }),
    );
    await assert.rejects(
      importZakazCandidates({ bundle, dryRun: true }),
      /Source identity зустрічається у кількох artifacts/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
