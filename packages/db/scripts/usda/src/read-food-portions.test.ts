import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";

import os from "node:os";
import path from "node:path";
import test from "node:test";

import { readSelectedFoodPortions } from "./read-food-portions.js";

async function withTemporaryCsv(
  content: string,
  run: (filePath: string) => Promise<void>,
): Promise<void> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "mealmind-usda-portions-"));

  const filePath = path.join(directory, "food_portion.csv");

  try {
    await writeFile(filePath, content, "utf8");

    await run(filePath);
  } finally {
    await rm(directory, {
      recursive: true,

      force: true,
    });
  }
}

const HEADER = [
  "id",
  "fdc_id",
  "seq_num",
  "amount",
  "measure_unit_id",
  "portion_description",
  "modifier",
  "gram_weight",
  "data_points",
  "footnote",
  "min_year_acquired",
].join(",");

test("reads portions only for selected FDC IDs", async () => {
  const csv = [
    HEADER,

    ["1", "100", "1", "1", "1000", '"1 cup"', "cup", "142", "5", "", "2020"].join(","),

    ["2", "200", "1", "1", "1001", '"1 tbsp"', "tablespoon", "14", "4", "", "2020"].join(","),

    ["3", "300", "1", "1", "1002", '"1 slice"', "slice", "30", "", "", ""].join(","),
  ].join("\n");

  await withTemporaryCsv(csv, async (filePath) => {
    const rows = await readSelectedFoodPortions(filePath, new Set([100, 300]));

    assert.equal(rows.length, 2);

    assert.deepEqual(
      rows.map((row) => row.fdcId),
      [100, 300],
    );
  });
});

test("preserves USDA portion metadata", async () => {
  const csv = [
    HEADER,

    ["12345", "100", "2", "0.5", "1000", '"1/2 cup"', "cup", "71.25", "12", "", "2021"].join(","),
  ].join("\n");

  await withTemporaryCsv(csv, async (filePath) => {
    const rows = await readSelectedFoodPortions(filePath, new Set([100]));

    assert.deepEqual(rows, [
      {
        id: "12345",

        fdcId: 100,

        sequenceNumber: 2,

        amount: 0.5,

        measureUnitId: "1000",

        portionDescription: "1/2 cup",

        modifier: "cup",

        gramWeight: 71.25,

        dataPoints: 12,

        minYearAcquired: 2021,
      },
    ]);
  });
});

test("preserves a zero USDA portion amount", async () => {
  const csv = [HEADER, ["1", "100", "1", "0", "9999", "", "cup", "142", "", "", ""].join(",")].join(
    "\n",
  );

  await withTemporaryCsv(csv, async (filePath) => {
    const rows = await readSelectedFoodPortions(filePath, new Set([100]));

    assert.equal(rows.length, 1);

    assert.equal(rows[0]?.amount, 0);

    assert.equal(rows[0]?.measureUnitId, "9999");
  });
});

test("preserves nullable USDA portion metadata", async () => {
  const csv = [HEADER, ["1", "100", "", "1", "", "", "", "100", "", "", ""].join(",")].join("\n");

  await withTemporaryCsv(csv, async (filePath) => {
    const rows = await readSelectedFoodPortions(filePath, new Set([100]));

    const row = rows[0];

    assert.ok(row);

    assert.equal(row.sequenceNumber, null);

    assert.equal(row.measureUnitId, null);

    assert.equal(row.portionDescription, null);

    assert.equal(row.modifier, null);

    assert.equal(row.dataPoints, null);

    assert.equal(row.minYearAcquired, null);
  });
});

test("returns an empty array when no FDC IDs are selected", async () => {
  const csv = [
    HEADER,

    ["1", "100", "1", "1", "1000", '"1 cup"', "cup", "142", "", "", ""].join(","),
  ].join("\n");

  await withTemporaryCsv(csv, async (filePath) => {
    const rows = await readSelectedFoodPortions(filePath, new Set());

    assert.deepEqual(rows, []);
  });
});

test("ignores an invalid FDC ID outside the selected catalog", async () => {
  const csv = [
    HEADER,

    ["1", "not-a-number", "1", "1", "1000", '"1 cup"', "cup", "142", "", "", ""].join(","),
  ].join("\n");

  await withTemporaryCsv(csv, async (filePath) => {
    const rows = await readSelectedFoodPortions(filePath, new Set([100]));

    assert.deepEqual(rows, []);
  });
});

test("strictly validates a selected USDA portion row", async () => {
  const csv = [
    HEADER,

    ["1", "100", "1", "1", "1000", '"1 cup"', "cup", "0", "", "", ""].join(","),
  ].join("\n");

  await withTemporaryCsv(csv, async (filePath) => {
    await assert.rejects(
      () => readSelectedFoodPortions(filePath, new Set([100])),
      /Invalid portion gram weight/,
    );
  });
});

test("rejects a missing food portion CSV file", async () => {
  await assert.rejects(
    () =>
      readSelectedFoodPortions(
        path.join(os.tmpdir(), "missing-mealmind-food-portion.csv"),
        new Set([100]),
      ),
    /CSV file does not exist/,
  );
});
