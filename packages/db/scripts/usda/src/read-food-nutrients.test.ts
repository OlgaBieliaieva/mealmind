import assert from "node:assert/strict";
import test from "node:test";

import { mkdtemp, rm, writeFile } from "node:fs/promises";

import { tmpdir } from "node:os";
import { join } from "node:path";

import { readSelectedFoodNutrients } from "./read-food-nutrients.js";

async function withTemporaryCsv(
  content: string,
  callback: (filePath: string) => Promise<void>,
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "mealmind-usda-nutrients-"));

  const filePath = join(directory, "food_nutrient.csv");

  try {
    await writeFile(filePath, content, "utf8");

    await callback(filePath);
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
}

test("reads only nutrients for selected FDC IDs", async () => {
  await withTemporaryCsv(
    [
      "id,fdc_id,nutrient_id,amount,data_points,derivation_id",
      "1,100,1003,12.5,3,49",
      "2,200,1003,8.2,2,49",
    ].join("\n"),
    async (filePath) => {
      const result = await readSelectedFoodNutrients(filePath, new Set([100]));

      assert.equal(result.length, 1);

      assert.equal(result[0]?.fdcId, 100);

      assert.equal(result[0]?.nutrientId, 1003);
    },
  );
});

test("reads only MealMind-whitelisted nutrient IDs", async () => {
  await withTemporaryCsv(
    [
      "id,fdc_id,nutrient_id,amount,data_points,derivation_id",
      "1,100,1003,12.5,3,49",
      "2,100,9999,42,1,49",
    ].join("\n"),
    async (filePath) => {
      const result = await readSelectedFoodNutrients(filePath, new Set([100]));

      assert.equal(result.length, 1);

      assert.equal(result[0]?.nutrientId, 1003);
    },
  );
});

test("reads multiple whitelisted nutrients for the same product", async () => {
  await withTemporaryCsv(
    [
      "id,fdc_id,nutrient_id,amount,data_points,derivation_id",
      "1,100,1003,12.5,3,49",
      "2,100,1004,5.2,4,49",
      "3,100,1008,100,2,49",
    ].join("\n"),
    async (filePath) => {
      const result = await readSelectedFoodNutrients(filePath, new Set([100]));

      assert.equal(result.length, 3);

      assert.deepEqual(
        result.map((row) => row.nutrientId),
        [1003, 1004, 1008],
      );
    },
  );
});

test("preserves an explicit zero nutrient value", async () => {
  await withTemporaryCsv(
    ["id,fdc_id,nutrient_id,amount,data_points,derivation_id", "1,100,1003,0,,"].join("\n"),
    async (filePath) => {
      const result = await readSelectedFoodNutrients(filePath, new Set([100]));

      assert.equal(result.length, 1);

      assert.equal(result[0]?.amount, 0);

      assert.equal(result[0]?.dataPoints, null);

      assert.equal(result[0]?.derivationId, null);
    },
  );
});

test("returns an empty array when no FDC IDs are selected", async () => {
  await withTemporaryCsv(
    ["id,fdc_id,nutrient_id,amount,data_points,derivation_id", "1,100,1003,12.5,3,49"].join("\n"),
    async (filePath) => {
      const result = await readSelectedFoodNutrients(filePath, new Set());

      assert.deepEqual(result, []);
    },
  );
});

test("returns an empty array when selected products have no whitelisted nutrients", async () => {
  await withTemporaryCsv(
    ["id,fdc_id,nutrient_id,amount,data_points,derivation_id", "1,100,9999,12.5,3,49"].join("\n"),
    async (filePath) => {
      const result = await readSelectedFoodNutrients(filePath, new Set([100]));

      assert.deepEqual(result, []);
    },
  );
});

test("rejects an invalid relevant USDA nutrient row", async () => {
  const csv = [
    "id,fdc_id,nutrient_id,amount,data_points,derivation_id",
    "1,100,1003,not-a-number,5,49",
  ].join("\n");

  await withTemporaryCsv(csv, async (filePath) => {
    await assert.rejects(
      () => readSelectedFoodNutrients(filePath, new Set([100])),
      /Invalid nutrient amount/,
    );
  });
});

test("ignores invalid nutrient data for products outside the curated catalog", async () => {
  await withTemporaryCsv(
    [
      "id,fdc_id,nutrient_id,amount,data_points,derivation_id",
      "1,999,1003,-1,3,49",
      "2,100,1003,12.5,3,49",
    ].join("\n"),
    async (filePath) => {
      const result = await readSelectedFoodNutrients(filePath, new Set([100]));

      assert.equal(result.length, 1);

      assert.equal(result[0]?.fdcId, 100);

      assert.equal(result[0]?.amount, 12.5);
    },
  );
});

test("ignores invalid values for nutrients outside the MealMind whitelist", async () => {
  await withTemporaryCsv(
    [
      "id,fdc_id,nutrient_id,amount,data_points,derivation_id",
      "1,100,9999,-5,3,49",
      "2,100,1003,12.5,3,49",
    ].join("\n"),
    async (filePath) => {
      const result = await readSelectedFoodNutrients(filePath, new Set([100]));

      assert.equal(result.length, 1);

      assert.equal(result[0]?.nutrientId, 1003);
    },
  );
});

test("rejects a missing CSV file", async () => {
  await assert.rejects(
    () =>
      readSelectedFoodNutrients(
        join(tmpdir(), `missing-food-nutrient-${Date.now()}.csv`),
        new Set([100]),
      ),
    /CSV file does not exist/,
  );
});

test("reads USDA Atwater General energy source", async () => {
  const csv = [
    "id,fdc_id,nutrient_id,amount,data_points,derivation_id",
    "1,100,2047,123.5,,49",
  ].join("\n");

  await withTemporaryCsv(csv, async (filePath) => {
    const rows = await readSelectedFoodNutrients(filePath, new Set([100]));

    assert.equal(rows.length, 1);

    assert.equal(rows[0]?.nutrientId, 2047);

    assert.equal(rows[0]?.amount, 123.5);
  });
});

test("reads USDA Atwater General energy source", async () => {
  const csv = [
    "id,fdc_id,nutrient_id,amount,data_points,derivation_id",
    "1,100,2048,123.5,,49",
  ].join("\n");

  await withTemporaryCsv(csv, async (filePath) => {
    const rows = await readSelectedFoodNutrients(filePath, new Set([100]));

    assert.equal(rows.length, 1);

    assert.equal(rows[0]?.nutrientId, 2048);

    assert.equal(rows[0]?.amount, 123.5);
  });
});
