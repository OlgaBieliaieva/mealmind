import assert from "node:assert/strict";
import test from "node:test";

import { convertVolumePortionToMetric } from "./portion-volume-conversion.js";

import type { NormalizedProductPortion } from "./portion-normalization-types.js";

function createPortion(
  overrides: Partial<NormalizedProductPortion> = {},
): NormalizedProductPortion {
  return {
    sourceRowId: "1",

    sourceSequence: 1,

    amount: 1,

    gramWeight: 100,

    labelEn: "cup",

    kind: "VOLUME",

    weightType: "UNKNOWN",

    measurementUnitCode: "cup",

    sourceMeasurementUnitExternalId: "9999",

    sourceMeasurementUnitName: "undetermined",

    sourceModifier: "cup",

    sourcePortionDescription: null,

    sourceDataPoints: null,

    reasonCodes: ["NORMALIZED_MODIFIER_UNIT"],

    ...overrides,
  };
}

test("converts one USDA cup to 240 ml", () => {
  const result = convertVolumePortionToMetric(
    createPortion({
      amount: 1,

      gramWeight: 150,

      measurementUnitCode: "cup",
    }),
  );

  assert.equal(result.amount, 240);

  assert.equal(result.measurementUnitCode, "ml");
});

test("converts a fractional cup to milliliters", () => {
  const result = convertVolumePortionToMetric(
    createPortion({
      amount: 0.5,

      measurementUnitCode: "cup",
    }),
  );

  assert.equal(result.amount, 120);
});

test("converts tablespoons to milliliters", () => {
  const result = convertVolumePortionToMetric(
    createPortion({
      amount: 2,

      measurementUnitCode: "tbsp",
    }),
  );

  assert.equal(result.amount, 30);

  assert.equal(result.measurementUnitCode, "ml");
});

test("converts teaspoons to milliliters", () => {
  const result = convertVolumePortionToMetric(
    createPortion({
      amount: 3,

      measurementUnitCode: "tsp",
    }),
  );

  assert.equal(result.amount, 15);
});

test("preserves an existing milliliter portion", () => {
  const result = convertVolumePortionToMetric(
    createPortion({
      amount: 250,

      measurementUnitCode: "ml",
    }),
  );

  assert.equal(result.amount, 250);

  assert.equal(result.measurementUnitCode, "ml");
});

test("preserves an existing liter portion", () => {
  const result = convertVolumePortionToMetric(
    createPortion({
      amount: 1,

      measurementUnitCode: "l",
    }),
  );

  assert.equal(result.amount, 1);

  assert.equal(result.measurementUnitCode, "l");
});

test("never changes USDA gram weight", () => {
  const result = convertVolumePortionToMetric(
    createPortion({
      amount: 1,

      gramWeight: 173.25,

      measurementUnitCode: "cup",
    }),
  );

  assert.equal(result.amount, 240);

  assert.equal(result.gramWeight, 173.25);
});

test("preserves original household measure provenance", () => {
  const result = convertVolumePortionToMetric(
    createPortion({
      amount: 0.25,

      gramWeight: 25,

      labelEn: "cup, chopped",

      measurementUnitCode: "cup",
    }),
  );

  assert.equal(result.amount, 60);

  assert.equal(result.sourceAmount, 0.25);

  assert.equal(result.sourceMeasurementUnitCode, "cup");

  assert.equal(result.labelEn, "cup, chopped");
});

test("rejects a count portion", () => {
  assert.throws(
    () =>
      convertVolumePortionToMetric(
        createPortion({
          kind: "COUNT",

          measurementUnitCode: null,

          labelEn: "slice",
        }),
      ),
    /Cannot convert non-volume portion/,
  );
});
