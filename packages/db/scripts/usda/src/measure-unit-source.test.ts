import assert from "node:assert/strict";
import test from "node:test";

import { parseMeasureUnitRow } from "./measure-unit-source.js";

test("parses a valid USDA measure unit", () => {
  const result = parseMeasureUnitRow({
    id: "1000",

    name: "cup",
  });

  assert.deepEqual(result, {
    externalId: "1000",

    name: "cup",
  });
});

test("preserves the USDA undetermined unit", () => {
  const result = parseMeasureUnitRow({
    id: "9999",

    name: "undetermined",
  });

  assert.deepEqual(result, {
    externalId: "9999",

    name: "undetermined",
  });
});

test("trims USDA measure unit values", () => {
  const result = parseMeasureUnitRow({
    id: " 1000 ",

    name: "  tablespoon  ",
  });

  assert.equal(result.externalId, "1000");

  assert.equal(result.name, "tablespoon");
});

test("rejects a missing measure unit ID", () => {
  assert.throws(
    () =>
      parseMeasureUnitRow({
        id: "",

        name: "cup",
      }),
    /Missing measure unit ID/,
  );
});

test("rejects a whitespace-only measure unit ID", () => {
  assert.throws(
    () =>
      parseMeasureUnitRow({
        id: "   ",

        name: "cup",
      }),
    /Missing measure unit ID/,
  );
});

test("rejects a missing measure unit name", () => {
  assert.throws(
    () =>
      parseMeasureUnitRow({
        id: "1000",

        name: "",
      }),
    /Missing measure unit name for ID "1000"/,
  );
});

test("rejects a whitespace-only measure unit name", () => {
  assert.throws(
    () =>
      parseMeasureUnitRow({
        id: "1000",

        name: "   ",
      }),
    /Missing measure unit name for ID "1000"/,
  );
});
