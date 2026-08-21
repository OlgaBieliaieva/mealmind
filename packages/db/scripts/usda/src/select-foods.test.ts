import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { selectFoods } from "./select-foods.js";
import { writeJsonFile } from "./write-json.js";

interface FixturePaths {
  readonly directory: string;
  readonly foodFile: string;
  readonly foundationFoodFile: string;
  readonly srLegacyFoodFile: string;
  readonly outputFile: string;
}

async function createFixturePaths(): Promise<FixturePaths> {
  const directory = await mkdtemp(path.join(tmpdir(), "mealmind-usda-select-"));

  return {
    directory,
    foodFile: path.join(directory, "food.csv"),
    foundationFoodFile: path.join(directory, "foundation_food.csv"),
    srLegacyFoodFile: path.join(directory, "sr_legacy_food.csv"),
    outputFile: path.join(directory, "selected-foods.json"),
  };
}

async function writeValidFixtures(paths: FixturePaths): Promise<void> {
  await Promise.all([
    writeFile(
      paths.foodFile,
      [
        "fdc_id,data_type,description,food_category_id,publication_date",
        '300,branded_food,"Ignored branded product",Snacks,2024-01-01',
        '200,sr_legacy_food,"Potatoes, boiled, without salt","Vegetables and Vegetable Products",2019-04-01',
        '100,foundation_food,"Beans, kidney, red, raw","Legumes and Legume Products",2024-10-31',
      ].join("\n"),
      "utf8",
    ),

    writeFile(
      paths.foundationFoodFile,
      ["fdc_id,NDB_number,footnote", '100,16015,"Foundation note"'].join("\n"),
      "utf8",
    ),

    writeFile(paths.srLegacyFoodFile, ["fdc_id,NDB_number", "200,11362"].join("\n"), "utf8"),
  ]);
}

test("selectFoods joins Foundation and SR Legacy records by FDC ID", async () => {
  const paths = await createFixturePaths();

  try {
    await writeValidFixtures(paths);

    const result = await selectFoods({
      foodFile: paths.foodFile,
      foundationFoodFile: paths.foundationFoodFile,
      srLegacyFoodFile: paths.srLegacyFoodFile,
    });

    assert.deepEqual(result, {
      schemaVersion: 1,
      datasets: ["FOUNDATION_FOOD", "SR_LEGACY"],
      statistics: {
        foodRowsRead: 3,
        foundationReferencesRead: 1,
        srLegacyReferencesRead: 1,
        selectedFoundationFoods: 1,
        selectedSrLegacyFoods: 1,
        selectedFoodsTotal: 2,
      },
      foods: [
        {
          fdcId: 100,
          dataset: "FOUNDATION_FOOD",
          dataType: "foundation_food",
          description: "Beans, kidney, red, raw",
          foodCategoryExternalId: "Legumes and Legume Products",
          publicationDate: "2024-10-31",
          ndbNumber: "16015",
        },
        {
          fdcId: 200,
          dataset: "SR_LEGACY",
          dataType: "sr_legacy_food",
          description: "Potatoes, boiled, without salt",
          foodCategoryExternalId: "Vegetables and Vegetable Products",
          publicationDate: "2019-04-01",
          ndbNumber: "11362",
        },
      ],
    });
  } finally {
    await rm(paths.directory, {
      recursive: true,
      force: true,
    });
  }
});

test("selectFoods ignores unsupported food.csv rows", async () => {
  const paths = await createFixturePaths();

  try {
    await writeValidFixtures(paths);

    const result = await selectFoods({
      foodFile: paths.foodFile,
      foundationFoodFile: paths.foundationFoodFile,
      srLegacyFoodFile: paths.srLegacyFoodFile,
    });

    assert.equal(result.statistics.foodRowsRead, 3);
    assert.equal(result.foods.length, 2);

    assert.equal(
      result.foods.some((food) => food.fdcId === 300),
      false,
    );
  } finally {
    await rm(paths.directory, {
      recursive: true,
      force: true,
    });
  }
});

test("selectFoods sorts output deterministically", async () => {
  const paths = await createFixturePaths();

  try {
    await writeFile(
      paths.foodFile,
      [
        "fdc_id,data_type,description,food_category_id,publication_date",
        '30,sr_legacy_food,"Zucchini, raw",Vegetables,2019-04-01',
        '10,foundation_food,"Banana, raw",Fruits,2024-10-31',
        '20,foundation_food,"Apple, raw",Fruits,2024-10-31',
      ].join("\n"),
      "utf8",
    );

    await writeFile(
      paths.foundationFoodFile,
      ["fdc_id,NDB_number,footnote", "10,1001,", "20,1002,"].join("\n"),
      "utf8",
    );

    await writeFile(paths.srLegacyFoodFile, ["fdc_id,NDB_number", "30,1003"].join("\n"), "utf8");

    const result = await selectFoods({
      foodFile: paths.foodFile,
      foundationFoodFile: paths.foundationFoodFile,
      srLegacyFoodFile: paths.srLegacyFoodFile,
    });

    assert.deepEqual(
      result.foods.map((food) => food.fdcId),
      [20, 10, 30],
    );
  } finally {
    await rm(paths.directory, {
      recursive: true,
      force: true,
    });
  }
});

test("selectFoods rejects an invalid FDC ID", async () => {
  const paths = await createFixturePaths();

  try {
    await writeFile(
      paths.foodFile,
      [
        "fdc_id,data_type,description,food_category_id,publication_date",
        '100,foundation_food,"Apple, raw",Fruits,2024-10-31',
      ].join("\n"),
      "utf8",
    );

    await writeFile(
      paths.foundationFoodFile,
      ["fdc_id,NDB_number,footnote", "not-a-number,1001,"].join("\n"),
      "utf8",
    );

    await writeFile(paths.srLegacyFoodFile, "fdc_id,NDB_number\n", "utf8");

    await assert.rejects(
      selectFoods({
        foodFile: paths.foodFile,
        foundationFoodFile: paths.foundationFoodFile,
        srLegacyFoodFile: paths.srLegacyFoodFile,
      }),
      /Invalid fdc_id in foundation_food\.csv/,
    );
  } finally {
    await rm(paths.directory, {
      recursive: true,
      force: true,
    });
  }
});

test("selectFoods rejects an FDC ID assigned to both datasets", async () => {
  const paths = await createFixturePaths();

  try {
    await writeFile(
      paths.foodFile,
      [
        "fdc_id,data_type,description,food_category_id,publication_date",
        '100,foundation_food,"Apple, raw",Fruits,2024-10-31',
      ].join("\n"),
      "utf8",
    );

    await writeFile(
      paths.foundationFoodFile,
      ["fdc_id,NDB_number,footnote", "100,1001,"].join("\n"),
      "utf8",
    );

    await writeFile(paths.srLegacyFoodFile, ["fdc_id,NDB_number", "100,1001"].join("\n"), "utf8");

    await assert.rejects(
      selectFoods({
        foodFile: paths.foodFile,
        foundationFoodFile: paths.foundationFoodFile,
        srLegacyFoodFile: paths.srLegacyFoodFile,
      }),
      /belongs to multiple USDA datasets/,
    );
  } finally {
    await rm(paths.directory, {
      recursive: true,
      force: true,
    });
  }
});

test("selectFoods rejects a supported reference missing from food.csv", async () => {
  const paths = await createFixturePaths();

  try {
    await writeFile(
      paths.foodFile,
      [
        "fdc_id,data_type,description,food_category_id,publication_date",
        '100,foundation_food,"Apple, raw",Fruits,2024-10-31',
      ].join("\n"),
      "utf8",
    );

    await writeFile(
      paths.foundationFoodFile,
      ["fdc_id,NDB_number,footnote", "999,1001,"].join("\n"),
      "utf8",
    );

    await writeFile(paths.srLegacyFoodFile, "fdc_id,NDB_number\n", "utf8");

    await assert.rejects(
      selectFoods({
        foodFile: paths.foodFile,
        foundationFoodFile: paths.foundationFoodFile,
        srLegacyFoodFile: paths.srLegacyFoodFile,
      }),
      /supported USDA references were not found in food\.csv/,
    );
  } finally {
    await rm(paths.directory, {
      recursive: true,
      force: true,
    });
  }
});

test("selectFoods rejects an empty selected description", async () => {
  const paths = await createFixturePaths();

  try {
    await writeFile(
      paths.foodFile,
      [
        "fdc_id,data_type,description,food_category_id,publication_date",
        "100,foundation_food,,Fruits,2024-10-31",
      ].join("\n"),
      "utf8",
    );

    await writeFile(
      paths.foundationFoodFile,
      ["fdc_id,NDB_number,footnote", "100,1001,"].join("\n"),
      "utf8",
    );

    await writeFile(paths.srLegacyFoodFile, "fdc_id,NDB_number\n", "utf8");

    await assert.rejects(
      selectFoods({
        foodFile: paths.foodFile,
        foundationFoodFile: paths.foundationFoodFile,
        srLegacyFoodFile: paths.srLegacyFoodFile,
      }),
      /has an empty description/,
    );
  } finally {
    await rm(paths.directory, {
      recursive: true,
      force: true,
    });
  }
});

test("writeJsonFile writes deterministic formatted JSON", async () => {
  const paths = await createFixturePaths();

  try {
    const value = {
      schemaVersion: 1,
      foods: [
        {
          fdcId: 100,
          description: "Apple, raw",
        },
      ],
    };

    await writeJsonFile(paths.outputFile, value);

    const firstOutput = await readFile(paths.outputFile, "utf8");

    await writeJsonFile(paths.outputFile, value);

    const secondOutput = await readFile(paths.outputFile, "utf8");

    assert.equal(firstOutput, secondOutput);

    assert.equal(firstOutput, `${JSON.stringify(value, null, 2)}\n`);
  } finally {
    await rm(paths.directory, {
      recursive: true,
      force: true,
    });
  }
});
