import assert from "node:assert/strict";
import test from "node:test";

import { translatePortionLabel } from "./translate-portion-label.js";

import type { ImportReadyProductPortion } from "./import-ready-types.js";

function createPortion(
  overrides: Partial<ImportReadyProductPortion> = {},
): ImportReadyProductPortion {
  return {
    amount: 1,

    gramWeight: 100,

    labelEn: "slice",

    labelUa: null,

    kind: "COUNT",

    weightType: "UNKNOWN",

    measurementUnitId: null,

    measurementUnitCode: null,

    source: {
      rowId: "1",

      sequence: 1,

      measurementUnitExternalId: "9999",

      measurementUnitName: "undetermined",

      modifier: "slice",

      portionDescription: null,

      dataPoints: null,
    },

    ...overrides,
  };
}

test("translates simple count portion", () => {
  assert.equal(
    translatePortionLabel(
      createPortion({
        labelEn: "slice",
      }),
    ),
    "скибка",
  );
});

test("ignores USDA dimensions for count portion", () => {
  assert.equal(
    translatePortionLabel(
      createPortion({
        labelEn: 'slice (2-1/2" dia x 1/4" thick)',
      }),
    ),
    "скибка",
  );
});

test("ignores USDA qualifier after comma", () => {
  assert.equal(
    translatePortionLabel(
      createPortion({
        labelEn: "breast, bone removed",
      }),
    ),
    "грудка",
  );
});

test("recognizes product-specific count label with qualifier", () => {
  assert.equal(
    translatePortionLabel(
      createPortion({
        labelEn: "potato medium",
      }),
    ),
    "картоплина",
  );
});

test("translates milliliter portion using normalized amount", () => {
  assert.equal(
    translatePortionLabel(
      createPortion({
        amount: 240,

        labelEn: "cup chopped",

        kind: "VOLUME",

        measurementUnitId: "ml-id",

        measurementUnitCode: "ml",
      }),
    ),
    "240 мл",
  );
});

test("translates liter portion using normalized amount", () => {
  assert.equal(
    translatePortionLabel(
      createPortion({
        amount: 1.5,

        labelEn: "liter",

        kind: "VOLUME",

        measurementUnitId: "l-id",

        measurementUnitCode: "l",
      }),
    ),
    "1.5 л",
  );
});

test("does not preserve cup in localized metric label", () => {
  const result = translatePortionLabel(
    createPortion({
      amount: 240,

      labelEn: "cup, chopped",

      kind: "VOLUME",

      measurementUnitId: "ml-id",

      measurementUnitCode: "ml",
    }),
  );

  assert.equal(result, "240 мл");

  assert.equal(result.includes("cup"), false);
});

test("returns null for unsupported count label", () => {
  assert.equal(
    translatePortionLabel(
      createPortion({
        labelEn: "unknown USDA measure",
      }),
    ),
    null,
  );
});

test("formats decimal metric amounts deterministically", () => {
  assert.equal(
    translatePortionLabel(
      createPortion({
        amount: 14.786666,

        kind: "VOLUME",

        measurementUnitId: "ml-id",

        measurementUnitCode: "ml",
      }),
    ),
    "14.79 мл",
  );
});

test("translates plural count portion through canonical alias", () => {
  assert.equal(
    translatePortionLabel(
      createPortion({
        labelEn: "pieces",
      }),
    ),
    "шматок",
  );
});

test("translates plural slice label", () => {
  assert.equal(
    translatePortionLabel(
      createPortion({
        labelEn: 'slices (1/4" thick)',
      }),
    ),
    "скибка",
  );
});

test("translates standalone medium size", () => {
  assert.equal(
    translatePortionLabel(
      createPortion({
        labelEn: "medium",
      }),
    ),
    "середній розмір",
  );
});

test("ignores USDA dimensions after standalone size", () => {
  assert.equal(
    translatePortionLabel(
      createPortion({
        labelEn: 'large (3" dia)',
      }),
    ),
    "великий розмір",
  );
});

test("translates size-prefixed known count portion", () => {
  assert.equal(
    translatePortionLabel(
      createPortion({
        labelEn: 'small bagel (3" dia)',
      }),
    ),
    "бейгл, малий розмір",
  );
});

test("translates medium slice", () => {
  assert.equal(
    translatePortionLabel(
      createPortion({
        labelEn: 'medium slice (approx 3" x 2" x 1/4")',
      }),
    ),
    "скибка, середній розмір",
  );
});

test("translates extra large standalone size", () => {
  assert.equal(
    translatePortionLabel(
      createPortion({
        labelEn: "extra large",
      }),
    ),
    "дуже великий розмір",
  );
});
