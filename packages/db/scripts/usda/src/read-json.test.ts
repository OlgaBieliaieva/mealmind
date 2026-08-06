import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { readJsonFile } from "./read-json.js";

test("readJsonFile reads valid JSON", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mealmind-usda-json-"));

  const filePath = path.join(directory, "input.json");

  try {
    await writeFile(
      filePath,
      JSON.stringify({
        schemaVersion: 1,
      }),
      "utf8",
    );

    const result = await readJsonFile<{
      schemaVersion: number;
    }>(filePath);

    assert.deepEqual(result, {
      schemaVersion: 1,
    });
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});

test("readJsonFile rejects invalid JSON", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mealmind-usda-json-"));

  const filePath = path.join(directory, "invalid.json");

  try {
    await writeFile(filePath, "{ invalid json", "utf8");

    await assert.rejects(readJsonFile(filePath), /Failed to parse JSON file/);
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});

test("readJsonFile rejects a missing file", async () => {
  const filePath = path.join(tmpdir(), `missing-usda-${Date.now()}.json`);

  await assert.rejects(readJsonFile(filePath), /Failed to read JSON file/);
});
