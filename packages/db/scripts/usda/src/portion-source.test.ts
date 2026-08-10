import assert from "node:assert/strict";
import test from "node:test";

import { parseFoodPortionRow } from "./portion-source.js";

test("parses a valid USDA food portion row", () => {
  const result = parseFoodPortionRow({
    id: "12345",
    fdc_id: "100",
    seq_num: "2",
    amount: "1",
    measure_unit_id: "1000",
    portion_description: "1 cup",
    modifier: "cup",
    gram_weight: "142.5",
    data_points: "12",
    footnote: "",
    min_year_acquired: "2021",
  });

  assert.deepEqual(result, {
    id: "12345",

    fdcId: 100,

    sequenceNumber: 2,

    amount: 1,

    measureUnitId: "1000",

    portionDescription: "1 cup",

    modifier: "cup",

    gramWeight: 142.5,

    dataPoints: 12,

    minYearAcquired: 2021,
  });
});

test("trims string values", () => {
  const result = parseFoodPortionRow({
    id: " 12345 ",
    fdc_id: " 100 ",
    seq_num: " 2 ",
    amount: " 1 ",
    measure_unit_id: " 9999 ",
    portion_description: "  1 medium  ",
    modifier: "  medium  ",
    gram_weight: " 182 ",
    data_points: " 5 ",
    min_year_acquired: " 2022 ",
  });

  assert.equal(result.id, "12345");

  assert.equal(result.fdcId, 100);

  assert.equal(result.measureUnitId, "9999");

  assert.equal(result.portionDescription, "1 medium");

  assert.equal(result.modifier, "medium");
});

test("allows an explicit zero portion amount", () => {
  const result = parseFoodPortionRow({
    id: "1",
    fdc_id: "100",
    seq_num: "1",
    amount: "0",
    measure_unit_id: "9999",
    portion_description: "",
    modifier: "cup",
    gram_weight: "142",
    data_points: "",
    min_year_acquired: "",
  });

  assert.equal(result.amount, 0);

  assert.equal(result.gramWeight, 142);

  assert.equal(result.measureUnitId, "9999");
});

test("converts empty optional values to null", () => {
  const result = parseFoodPortionRow({
    id: "1",
    fdc_id: "100",
    seq_num: "",
    amount: "1",
    measure_unit_id: "",
    portion_description: "",
    modifier: "",
    gram_weight: "100",
    data_points: "",
    min_year_acquired: "",
  });

  assert.equal(result.sequenceNumber, null);

  assert.equal(result.measureUnitId, null);

  assert.equal(result.portionDescription, null);

  assert.equal(result.modifier, null);

  assert.equal(result.dataPoints, null);

  assert.equal(result.minYearAcquired, null);
});

test("preserves decimal amount and gram weight", () => {
  const result = parseFoodPortionRow({
    id: "1",
    fdc_id: "100",
    seq_num: "1",
    amount: "0.5",
    measure_unit_id: "1001",
    portion_description: "1/2 cup",
    modifier: "cup",
    gram_weight: "113.25",
    data_points: "",
    min_year_acquired: "",
  });

  assert.equal(result.amount, 0.5);

  assert.equal(result.gramWeight, 113.25);
});

test("rejects a missing source row ID", () => {
  assert.throws(
    () =>
      parseFoodPortionRow({
        id: "",
        fdc_id: "100",
        amount: "1",
        gram_weight: "100",
      }),
    /Missing portion source row ID/,
  );
});

test("rejects a missing FDC ID", () => {
  assert.throws(
    () =>
      parseFoodPortionRow({
        id: "1",
        fdc_id: "",
        amount: "1",
        gram_weight: "100",
      }),
    /Invalid fdc_id/,
  );
});

test("rejects a zero FDC ID", () => {
  assert.throws(
    () =>
      parseFoodPortionRow({
        id: "1",
        fdc_id: "0",
        amount: "1",
        gram_weight: "100",
      }),
    /Invalid fdc_id/,
  );
});

test("rejects a negative FDC ID", () => {
  assert.throws(
    () =>
      parseFoodPortionRow({
        id: "1",
        fdc_id: "-1",
        amount: "1",
        gram_weight: "100",
      }),
    /Invalid fdc_id/,
  );
});

test("rejects a fractional FDC ID", () => {
  assert.throws(
    () =>
      parseFoodPortionRow({
        id: "1",
        fdc_id: "100.5",
        amount: "1",
        gram_weight: "100",
      }),
    /Invalid fdc_id/,
  );
});

test("rejects a missing portion amount", () => {
  assert.throws(
    () =>
      parseFoodPortionRow({
        id: "1",
        fdc_id: "100",
        amount: "",
        gram_weight: "100",
      }),
    /Invalid portion amount/,
  );
});

test("rejects a negative portion amount", () => {
  assert.throws(
    () =>
      parseFoodPortionRow({
        id: "1",
        fdc_id: "100",
        amount: "-1",
        gram_weight: "100",
      }),
    /Invalid portion amount/,
  );
});

test("rejects a non-numeric portion amount", () => {
  assert.throws(
    () =>
      parseFoodPortionRow({
        id: "1",
        fdc_id: "100",
        amount: "abc",
        gram_weight: "100",
      }),
    /Invalid portion amount/,
  );
});

test("rejects a missing gram weight", () => {
  assert.throws(
    () =>
      parseFoodPortionRow({
        id: "1",
        fdc_id: "100",
        amount: "1",
        gram_weight: "",
      }),
    /Invalid portion gram weight/,
  );
});

test("rejects a zero gram weight", () => {
  assert.throws(
    () =>
      parseFoodPortionRow({
        id: "1",
        fdc_id: "100",
        amount: "1",
        gram_weight: "0",
      }),
    /Invalid portion gram weight/,
  );
});

test("rejects a negative gram weight", () => {
  assert.throws(
    () =>
      parseFoodPortionRow({
        id: "1",
        fdc_id: "100",
        amount: "1",
        gram_weight: "-10",
      }),
    /Invalid portion gram weight/,
  );
});

test("rejects a negative sequence number", () => {
  assert.throws(
    () =>
      parseFoodPortionRow({
        id: "1",
        fdc_id: "100",
        seq_num: "-1",
        amount: "1",
        gram_weight: "100",
      }),
    /Invalid integer value/,
  );
});

test("rejects a fractional sequence number", () => {
  assert.throws(
    () =>
      parseFoodPortionRow({
        id: "1",
        fdc_id: "100",
        seq_num: "1.5",
        amount: "1",
        gram_weight: "100",
      }),
    /Invalid integer value/,
  );
});

test("preserves zero data points", () => {
  const result = parseFoodPortionRow({
    id: "1",
    fdc_id: "100",
    amount: "1",
    gram_weight: "100",
    data_points: "0",
  });

  assert.equal(result.dataPoints, 0);
});

test("rejects negative data points", () => {
  assert.throws(
    () =>
      parseFoodPortionRow({
        id: "1",
        fdc_id: "100",
        amount: "1",
        gram_weight: "100",
        data_points: "-1",
      }),
    /Invalid integer value/,
  );
});
