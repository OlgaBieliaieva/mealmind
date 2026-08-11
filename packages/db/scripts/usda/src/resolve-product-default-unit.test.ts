import assert from "node:assert/strict";
import test from "node:test";

import { resolveUsdaProductDefaultUnit } from "./resolve-product-default-unit.js";

test("uses grams as the default MeasurementUnit for USDA generic products", () => {
  const result = resolveUsdaProductDefaultUnit();

  assert.equal(result.code, "g");

  assert.equal(result.dimension, "MASS");

  assert.ok(result.id);
});
