import assert from "node:assert/strict";
import test from "node:test";

import { normalizePortion } from "./normalize-portion.js";

import type { ExtractedPortion } from "./portion-types.js";

function createPortion(overrides: Partial<ExtractedPortion> = {}): ExtractedPortion {
  return {
    sourceRowId: "1",

    sourceSequence: 1,

    sourceAmount: 1,

    gramWeight: 100,

    sourceMeasurementUnitExternalId: "9999",

    sourceMeasurementUnitName: "undetermined",

    portionDescription: null,

    modifier: "cup",

    sourceDataPoints: null,

    sourceMinYearAcquired: null,

    ...overrides,
  };
}

test("normalizes a legacy cup modifier", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "cup",
      gramWeight: 142,
    }),
  );

  assert.equal(result.decision, "INCLUDE");

  if (result.decision !== "INCLUDE") {
    return;
  }

  assert.equal(result.portion.measurementUnitCode, "cup");

  assert.equal(result.portion.kind, "VOLUME");

  assert.equal(result.portion.labelEn, "cup");
});

test("preserves a qualified cup label", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "cup, chopped",
    }),
  );

  assert.equal(result.decision, "INCLUDE");

  if (result.decision !== "INCLUDE") {
    return;
  }

  assert.equal(result.portion.measurementUnitCode, "cup");

  assert.equal(result.portion.labelEn, "cup, chopped");
});

test("normalizes tbsp alias", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "tbsp",
    }),
  );

  assert.equal(result.decision, "INCLUDE");

  if (result.decision !== "INCLUDE") {
    return;
  }

  assert.equal(result.portion.measurementUnitCode, "tbsp");

  assert.equal(result.portion.kind, "VOLUME");
});

test("normalizes tablespoon alias", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "tablespoon",
    }),
  );

  assert.equal(result.decision, "INCLUDE");

  if (result.decision !== "INCLUDE") {
    return;
  }

  assert.equal(result.portion.measurementUnitCode, "tbsp");
});

test("normalizes teaspoon alias", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "tsp",
    }),
  );

  assert.equal(result.decision, "INCLUDE");

  if (result.decision !== "INCLUDE") {
    return;
  }

  assert.equal(result.portion.measurementUnitCode, "tsp");
});

test("excludes fluid ounces from the localized catalog", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "fl oz",
    }),
  );

  assert.deepEqual(result, {
    decision: "EXCLUDE",

    reasonCodes: ["NON_LOCAL_MEASURE"],
  });
});

test("excludes ounces from the localized catalog", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "oz",

      gramWeight: 28.4,
    }),
  );

  assert.deepEqual(result, {
    decision: "EXCLUDE",

    reasonCodes: ["NON_LOCAL_MEASURE"],
  });
});

test("prefers a structured USDA unit", () => {
  const result = normalizePortion(
    createPortion({
      sourceMeasurementUnitExternalId: "1000",

      sourceMeasurementUnitName: "cup",

      modifier: "chopped",
    }),
  );

  assert.equal(result.decision, "INCLUDE");

  if (result.decision !== "INCLUDE") {
    return;
  }

  assert.equal(result.portion.measurementUnitCode, "cup");

  assert.equal(result.portion.labelEn, "cup, chopped");

  assert.deepEqual(result.portion.reasonCodes, ["NORMALIZED_STRUCTURED_UNIT"]);
});

test("normalizes a slice as product-specific count", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "slice",
      gramWeight: 17,
    }),
  );

  assert.equal(result.decision, "INCLUDE");

  if (result.decision !== "INCLUDE") {
    return;
  }

  assert.equal(result.portion.kind, "COUNT");

  assert.equal(result.portion.measurementUnitCode, null);
});

test("normalizes a medium portion as product-specific count", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "medium",
      gramWeight: 178,
    }),
  );

  assert.equal(result.decision, "INCLUDE");

  if (result.decision !== "INCLUDE") {
    return;
  }

  assert.equal(result.portion.kind, "COUNT");

  assert.equal(result.portion.labelEn, "medium");
});

test("excludes a package-specific portion", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "package (10 oz)",
    }),
  );

  assert.deepEqual(result, {
    decision: "EXCLUDE",

    reasonCodes: ["PACKAGE_SPECIFIC_MEASURE"],
  });
});

test("excludes a serving-specific portion", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "serving (3 oz)",
    }),
  );

  assert.deepEqual(result, {
    decision: "EXCLUDE",

    reasonCodes: ["SERVING_SPECIFIC_MEASURE"],
  });
});

test("rejects a zero source amount", () => {
  const result = normalizePortion(
    createPortion({
      sourceAmount: 0,

      modifier: "package (10 oz)",
    }),
  );

  assert.deepEqual(result, {
    decision: "EXCLUDE",

    reasonCodes: ["NON_POSITIVE_SOURCE_AMOUNT"],
  });
});

test("rejects a complex yield-based legacy portion", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "piece, cooked, excluding refuse (yield from 1 lb raw meat with refuse)",
    }),
  );

  assert.equal(result.decision, "EXCLUDE");

  if (result.decision !== "EXCLUDE") {
    return;
  }

  assert.deepEqual(result.reasonCodes, ["COMPLEX_LEGACY_MEASURE"]);
});

test("rejects paired cooked weight metadata", () => {
  const result = normalizePortion(
    createPortion({
      sourceMeasurementUnitName: "paired cooked w",

      sourceMeasurementUnitExternalId: "1010",

      modifier: "crumbles",
    }),
  );

  assert.equal(result.decision, "EXCLUDE");
});

test("rejects an unsupported measure", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "unrecognized custom measure",
    }),
  );

  assert.equal(result.decision, "EXCLUDE");

  if (result.decision !== "EXCLUDE") {
    return;
  }

  assert.deepEqual(result.reasonCodes, ["UNSUPPORTED_MEASURE"]);
});

test("rejects a portion with no usable label", () => {
  const result = normalizePortion(
    createPortion({
      modifier: null,

      portionDescription: null,

      sourceMeasurementUnitName: "undetermined",
    }),
  );

  assert.deepEqual(result, {
    decision: "EXCLUDE",

    reasonCodes: ["MISSING_MEASURE_LABEL"],
  });
});

test("excludes NLEA serving", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "NLEA serving",
    }),
  );

  assert.deepEqual(result, {
    decision: "EXCLUDE",

    reasonCodes: ["SERVING_SPECIFIC_MEASURE"],
  });
});

test("excludes ounces from the localized catalog", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "oz",
      gramWeight: 28.35,
    }),
  );

  assert.deepEqual(result, {
    decision: "EXCLUDE",

    reasonCodes: ["NON_LOCAL_MEASURE"],
  });
});

test("excludes pounds from the localized catalog", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "lb",
      gramWeight: 453.6,
    }),
  );

  assert.deepEqual(result, {
    decision: "EXCLUDE",

    reasonCodes: ["NON_LOCAL_MEASURE"],
  });
});

test("normalizes a stalk as a count portion", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "stalk",
      gramWeight: 51,
    }),
  );

  assert.equal(result.decision, "INCLUDE");

  if (result.decision !== "INCLUDE") {
    return;
  }

  assert.equal(result.portion.kind, "COUNT");

  assert.equal(result.portion.measurementUnitCode, null);

  assert.equal(result.portion.labelEn, "stalk");
});

test("normalizes a mushroom as a count portion", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "mushroom",
      gramWeight: 12,
    }),
  );

  assert.equal(result.decision, "INCLUDE");

  if (result.decision !== "INCLUDE") {
    return;
  }

  assert.equal(result.portion.kind, "COUNT");
});

test("rejects yield-based ear instead of treating it as count", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "ear, yields",
    }),
  );

  assert.deepEqual(result, {
    decision: "EXCLUDE",

    reasonCodes: ["COMPLEX_LEGACY_MEASURE"],
  });
});
test("normalizes a clove as a count portion", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "clove",
      gramWeight: 3,
    }),
  );

  assert.equal(result.decision, "INCLUDE");

  if (result.decision !== "INCLUDE") {
    return;
  }

  assert.equal(result.portion.kind, "COUNT");

  assert.equal(result.portion.measurementUnitCode, null);

  assert.equal(result.portion.labelEn, "clove");
});

test("normalizes a bulb as a count portion", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "bulb",
      gramWeight: 234,
    }),
  );

  assert.equal(result.decision, "INCLUDE");

  if (result.decision !== "INCLUDE") {
    return;
  }

  assert.equal(result.portion.kind, "COUNT");

  assert.equal(result.portion.measurementUnitCode, null);
});

test("normalizes a scoop as a count portion", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "scoop",
      gramWeight: 66,
    }),
  );

  assert.equal(result.decision, "INCLUDE");

  if (result.decision !== "INCLUDE") {
    return;
  }

  assert.equal(result.portion.kind, "COUNT");
});
test("excludes a count portion containing an embedded ounce measure", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "slice (1 oz)",
      gramWeight: 28.35,
    }),
  );

  assert.deepEqual(result, {
    decision: "EXCLUDE",

    reasonCodes: ["NON_LOCAL_MEASURE"],
  });
});

test("excludes a count portion containing an embedded pound measure", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "roast (3 to 5 lb roast)",
      gramWeight: 1500,
    }),
  );

  assert.deepEqual(result, {
    decision: "EXCLUDE",

    reasonCodes: ["NON_LOCAL_MEASURE"],
  });
});

test("excludes a count portion containing an embedded NLEA serving", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "piece (1 NLEA serving)",
      gramWeight: 30,
    }),
  );

  assert.deepEqual(result, {
    decision: "EXCLUDE",

    reasonCodes: ["SERVING_SPECIFIC_MEASURE"],
  });
});

test("excludes a count portion containing embedded serving semantics", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "cake 1 serving",
      gramWeight: 80,
    }),
  );

  assert.deepEqual(result, {
    decision: "EXCLUDE",

    reasonCodes: ["SERVING_SPECIFIC_MEASURE"],
  });
});

test("excludes a count portion containing embedded package semantics", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "slice 12 oz pkg",
      gramWeight: 30,
    }),
  );

  assert.deepEqual(result, {
    decision: "EXCLUDE",

    reasonCodes: ["PACKAGE_SPECIFIC_MEASURE"],
  });
});

test("excludes package semantics that do not occur at the start of the label", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "small box",
      gramWeight: 50,
    }),
  );

  assert.deepEqual(result, {
    decision: "EXCLUDE",

    reasonCodes: ["PACKAGE_SPECIFIC_MEASURE"],
  });
});

test("checks structured USDA measurement unit for localization policy", () => {
  const result = normalizePortion(
    createPortion({
      sourceMeasurementUnitExternalId: "1001",

      sourceMeasurementUnitName: "oz",

      modifier: "chopped",

      gramWeight: 28.35,
    }),
  );

  assert.deepEqual(result, {
    decision: "EXCLUDE",

    reasonCodes: ["NON_LOCAL_MEASURE"],
  });
});

test("keeps a clean qualified count portion", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "slice, thin",

      gramWeight: 15,
    }),
  );

  assert.equal(result.decision, "INCLUDE");

  if (result.decision !== "INCLUDE") {
    return;
  }

  assert.equal(result.portion.kind, "COUNT");

  assert.equal(result.portion.measurementUnitCode, null);

  assert.equal(result.portion.labelEn, "slice, thin");
});

test("keeps a clean qualified canonical unit", () => {
  const result = normalizePortion(
    createPortion({
      modifier: "cup, shredded",

      gramWeight: 90,
    }),
  );

  assert.equal(result.decision, "INCLUDE");

  if (result.decision !== "INCLUDE") {
    return;
  }

  assert.equal(result.portion.kind, "VOLUME");

  assert.equal(result.portion.measurementUnitCode, "cup");

  assert.equal(result.portion.labelEn, "cup, shredded");
});
