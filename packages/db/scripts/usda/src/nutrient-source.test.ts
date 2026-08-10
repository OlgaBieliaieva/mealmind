import assert from "node:assert/strict";
import test from "node:test";

import { parseFoodNutrientRow } from "./nutrient-source.js";

test("parses a valid USDA food nutrient row", () => {
  const result = parseFoodNutrientRow({
    id: "12345",
    fdc_id: "100",
    nutrient_id: "1003",
    amount: "12.34",
    data_points: "5",
    derivation_id: "49",
  });

  assert.deepEqual(result, {
    id: "12345",
    fdcId: 100,
    nutrientId: 1003,
    amount: 12.34,
    dataPoints: 5,
    derivationId: "49",
  });
});

test("trims source identifiers and derivation ID", () => {
  const result = parseFoodNutrientRow({
    id: " 12345 ",
    fdc_id: "100",
    nutrient_id: "1003",
    amount: "12.34",
    data_points: "5",
    derivation_id: " 49 ",
  });

  assert.equal(result.id, "12345");

  assert.equal(result.derivationId, "49");
});

test("converts missing optional metadata to null", () => {
  const result = parseFoodNutrientRow({
    id: "12345",
    fdc_id: "100",
    nutrient_id: "1003",
    amount: "12.34",
  });

  assert.equal(result.dataPoints, null);

  assert.equal(result.derivationId, null);
});

test("converts empty optional metadata to null", () => {
  const result = parseFoodNutrientRow({
    id: "12345",
    fdc_id: "100",
    nutrient_id: "1003",
    amount: "12.34",
    data_points: " ",
    derivation_id: " ",
  });

  assert.equal(result.dataPoints, null);

  assert.equal(result.derivationId, null);
});

test("preserves an explicit zero nutrient amount", () => {
  const result = parseFoodNutrientRow({
    id: "12345",
    fdc_id: "100",
    nutrient_id: "1003",
    amount: "0",
  });

  assert.equal(result.amount, 0);
});

test("preserves zero data points", () => {
  const result = parseFoodNutrientRow({
    id: "12345",
    fdc_id: "100",
    nutrient_id: "1003",
    amount: "12",
    data_points: "0",
  });

  assert.equal(result.dataPoints, 0);
});

test("rejects a missing food nutrient source row ID", () => {
  assert.throws(
    () =>
      parseFoodNutrientRow({
        id: "",
        fdc_id: "100",
        nutrient_id: "1003",
        amount: "12",
      }),
    /Missing food_nutrient\.id/,
  );
});

test("rejects a missing FDC ID", () => {
  assert.throws(
    () =>
      parseFoodNutrientRow({
        id: "1",
        fdc_id: "",
        nutrient_id: "1003",
        amount: "12",
      }),
    /Invalid fdc_id/,
  );
});

test("rejects a zero FDC ID", () => {
  assert.throws(
    () =>
      parseFoodNutrientRow({
        id: "1",
        fdc_id: "0",
        nutrient_id: "1003",
        amount: "12",
      }),
    /Invalid fdc_id/,
  );
});

test("rejects a negative FDC ID", () => {
  assert.throws(
    () =>
      parseFoodNutrientRow({
        id: "1",
        fdc_id: "-1",
        nutrient_id: "1003",
        amount: "12",
      }),
    /Invalid fdc_id/,
  );
});

test("rejects a non-integer FDC ID", () => {
  assert.throws(
    () =>
      parseFoodNutrientRow({
        id: "1",
        fdc_id: "100.5",
        nutrient_id: "1003",
        amount: "12",
      }),
    /Invalid fdc_id/,
  );
});

test("rejects an invalid nutrient ID", () => {
  assert.throws(
    () =>
      parseFoodNutrientRow({
        id: "1",
        fdc_id: "100",
        nutrient_id: "0",
        amount: "12",
      }),
    /Invalid nutrient_id/,
  );
});

test("rejects a missing nutrient amount", () => {
  assert.throws(
    () =>
      parseFoodNutrientRow({
        id: "1",
        fdc_id: "100",
        nutrient_id: "1003",
        amount: "",
      }),
    /Missing nutrient amount/,
  );
});

test("preserves a negative USDA nutrient amount at source parsing level", () => {
  const result = parseFoodNutrientRow({
    id: "1",
    fdc_id: "100",
    nutrient_id: "1005",
    amount: "-0.47505",
  });

  assert.equal(result.amount, -0.47505);
});

test("rejects a non-numeric nutrient amount", () => {
  assert.throws(
    () =>
      parseFoodNutrientRow({
        id: "1",
        fdc_id: "100",
        nutrient_id: "1003",
        amount: "invalid",
      }),
    /Invalid nutrient amount/,
  );
});

test("rejects a negative data points value", () => {
  assert.throws(
    () =>
      parseFoodNutrientRow({
        id: "1",
        fdc_id: "100",
        nutrient_id: "1003",
        amount: "12",
        data_points: "-1",
      }),
    /Invalid data_points/,
  );
});

test("rejects a fractional data points value", () => {
  assert.throws(
    () =>
      parseFoodNutrientRow({
        id: "1",
        fdc_id: "100",
        nutrient_id: "1003",
        amount: "12",
        data_points: "1.5",
      }),
    /Invalid data_points/,
  );
});
