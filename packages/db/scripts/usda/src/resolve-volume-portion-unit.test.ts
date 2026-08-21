import assert from "node:assert/strict";
import test from "node:test";

import { resolveVolumePortionMeasurementUnit } from "./resolve-volume-portion-unit.js";

import type { ImportReadyVolumePortion } from "./portion-volume-conversion.js";

function createPortion(
  overrides: Partial<ImportReadyVolumePortion> = {},
): ImportReadyVolumePortion {
  return {
    amount: 240,

    measurementUnitCode: "ml",

    gramWeight: 150,

    sourceAmount: 1,

    sourceMeasurementUnitCode: "cup",

    labelEn: "cup",

    ...overrides,
  };
}

test("resolves a converted household portion to milliliters", () => {
  const result = resolveVolumePortionMeasurementUnit(createPortion());

  assert.equal(result.code, "ml");

  assert.equal(result.dimension, "VOLUME");
});

test("resolves an existing liter portion", () => {
  const result = resolveVolumePortionMeasurementUnit(
    createPortion({
      amount: 1,

      measurementUnitCode: "l",

      sourceAmount: 1,

      sourceMeasurementUnitCode: "l",
    }),
  );

  assert.equal(result.code, "l");
});
