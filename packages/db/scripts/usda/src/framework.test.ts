import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { readCsvRows, readSmallCsvFile } from "./csv.js";
import { USDA_PATHS } from "./paths.js";
import { verifyUsdaFramework } from "./verify-framework.js";

test("USDA paths point to packages/db/scripts/usda", () => {
  assert.equal(path.basename(USDA_PATHS.usdaRoot), "usda");

  assert.equal(path.basename(path.dirname(USDA_PATHS.usdaRoot)), "scripts");

  assert.equal(path.basename(USDA_PATHS.packageRoot), "db");

  assert.equal(USDA_PATHS.rawDataDirectory, path.join(USDA_PATHS.usdaRoot, "data", "raw"));

  assert.equal(USDA_PATHS.workDataDirectory, path.join(USDA_PATHS.usdaRoot, "data", "work"));

  assert.equal(USDA_PATHS.outputDataDirectory, path.join(USDA_PATHS.usdaRoot, "data", "output"));
});

test("framework verification succeeds", async () => {
  const result = await verifyUsdaFramework();

  assert.equal(result.success, true);
  assert.equal(result.frameworkInfo.usdaRoot, USDA_PATHS.usdaRoot);
});

test("CSV reader parses a quoted USDA-style description", async () => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "mealmind-usda-"));

  const csvPath = path.join(temporaryDirectory, "food.csv");

  try {
    await writeFile(
      csvPath,
      [
        "fdc_id,data_type,description",
        '123,foundation_food,"Beans, kidney, red, raw"',
        '456,sr_legacy_food,"Potatoes, boiled, without salt"',
      ].join("\n"),
      "utf8",
    );

    interface FoodTestRow extends Record<string, string> {
      fdc_id: string;
      data_type: string;
      description: string;
    }

    const rows = await readSmallCsvFile<FoodTestRow>(csvPath);

    assert.equal(rows.length, 2);

    assert.deepEqual(rows[0], {
      fdc_id: "123",
      data_type: "foundation_food",
      description: "Beans, kidney, red, raw",
    });

    assert.deepEqual(rows[1], {
      fdc_id: "456",
      data_type: "sr_legacy_food",
      description: "Potatoes, boiled, without salt",
    });
  } finally {
    await rm(temporaryDirectory, {
      recursive: true,
      force: true,
    });
  }
});

test("CSV reader throws for a missing file", async () => {
  const missingPath = path.join(tmpdir(), `missing-usda-${Date.now()}.csv`);

  await assert.rejects(async () => {
    const iterator = readCsvRows(missingPath);
    await iterator.next();
  }, /CSV file does not exist/);
});
