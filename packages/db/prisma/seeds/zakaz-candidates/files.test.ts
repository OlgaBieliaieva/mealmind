import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadZakazCandidateArtifact, loadZakazCandidateBundle } from "./files.js";
import { writeCandidateFixture } from "./test-fixtures.js";

test("loads checksum-verified artifacts and supports legacy .jsonl file names", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mealmind-zakaz-candidates-"));
  try {
    const manifestPath = await writeCandidateFixture(directory, { jsonlNames: true });
    const bundle = await loadZakazCandidateBundle(manifestPath);
    const candidateArtifact = await loadZakazCandidateArtifact(bundle.artifacts[0]!);

    assert.match(bundle.manifestPath, /zakaz-manifest\.jsonl$/);
    assert.equal(bundle.artifacts.length, 3);
    assert.equal(candidateArtifact.count, 1);
    assert.equal(candidateArtifact.products[0]?.disposition, "CANDIDATE");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
