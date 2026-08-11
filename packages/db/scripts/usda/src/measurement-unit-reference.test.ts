import assert from "node:assert/strict";
import test from "node:test";

import {
  getMeasurementUnitReference,
  USDA_IMPORT_MEASUREMENT_UNITS,
} from "../config/measurement-unit-reference.js";

test("contains every MeasurementUnit required by the USDA import-ready dataset", () => {
  assert.deepEqual([...USDA_IMPORT_MEASUREMENT_UNITS.keys()], ["g", "ml", "l"]);
});

test("resolves grams", () => {
  const unit = getMeasurementUnitReference("g");

  assert.equal(unit.code, "g");

  assert.equal(unit.dimension, "MASS");

  assert.ok(unit.id);
});

test("resolves milliliters", () => {
  const unit = getMeasurementUnitReference("ml");

  assert.equal(unit.code, "ml");

  assert.equal(unit.dimension, "VOLUME");
});

test("resolves liters", () => {
  const unit = getMeasurementUnitReference("l");

  assert.equal(unit.code, "l");

  assert.equal(unit.dimension, "VOLUME");
});

test("USDA import MeasurementUnit references use unique IDs", () => {
  const ids = [...USDA_IMPORT_MEASUREMENT_UNITS.values()].map((unit) => unit.id);

  assert.equal(new Set(ids).size, ids.length);
});
