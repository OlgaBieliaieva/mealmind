import assert from "node:assert/strict";
import test from "node:test";

import { normalizeDescription } from "./normalize-description.js";

test("normalizes a raw food", () => {
  assert.deepEqual(normalizeDescription("Apple, raw"), {
    normalizedNameEn: "Apple",
    preparationMethod: "RAW",
    foodState: "RAW",
    preparationConfidence: "HIGH",
    modifiersEn: [],
    unclassifiedParts: [],
  });
});

test("normalizes a boiled food with a salt modifier", () => {
  assert.deepEqual(
    normalizeDescription("Beans, kidney, red, mature seeds, cooked, boiled, without salt"),
    {
      normalizedNameEn: "Beans, kidney, red, mature seeds",
      preparationMethod: "BOILED",
      foodState: "COOKED",
      preparationConfidence: "HIGH",
      modifiersEn: ["without salt"],
      unclassifiedParts: [],
    },
  );
});

test("normalizes roasted chicken and extracts meat-only modifier", () => {
  assert.deepEqual(
    normalizeDescription("Chicken, broilers or fryers, breast, meat only, cooked, roasted"),
    {
      normalizedNameEn: "Chicken, broilers or fryers, breast",
      preparationMethod: "ROASTED",
      foodState: "COOKED",
      preparationConfidence: "HIGH",
      modifiersEn: ["meat only"],
      unclassifiedParts: [],
    },
  );
});

test("prefers deep-fried over generic fried", () => {
  assert.deepEqual(normalizeDescription("Potatoes, deep-fried"), {
    normalizedNameEn: "Potatoes",
    preparationMethod: "DEEP_FRIED",
    foodState: "COOKED",
    preparationConfidence: "HIGH",
    modifiersEn: [],
    unclassifiedParts: [],
  });
});

test("handles a generic cooked marker without inventing a method", () => {
  assert.deepEqual(normalizeDescription("Rice, white, long-grain, cooked"), {
    normalizedNameEn: "Rice, white, long-grain",
    preparationMethod: "UNSPECIFIED",
    foodState: "COOKED",
    preparationConfidence: "MEDIUM",
    modifiersEn: [],
    unclassifiedParts: [],
  });
});

test("handles ready-to-eat without inventing a preparation method", () => {
  assert.deepEqual(normalizeDescription("Cereal, ready-to-eat"), {
    normalizedNameEn: "Cereal",
    preparationMethod: "UNSPECIFIED",
    foodState: "READY_TO_EAT",
    preparationConfidence: "MEDIUM",
    modifiersEn: [],
    unclassifiedParts: [],
  });
});

test("normalizes canned food and drained-solids modifier", () => {
  assert.deepEqual(normalizeDescription("Beans, green, canned, drained solids"), {
    normalizedNameEn: "Beans, green",
    preparationMethod: "CANNED",
    foodState: "PROCESSED",
    preparationConfidence: "HIGH",
    modifiersEn: ["drained solids"],
    unclassifiedParts: [],
  });
});

test("does not classify poultry class fryers as a processing method", () => {
  assert.deepEqual(normalizeDescription("Chicken, broilers or fryers, breast, raw"), {
    normalizedNameEn: "Chicken, broilers or fryers, breast",
    preparationMethod: "RAW",
    foodState: "RAW",
    preparationConfidence: "HIGH",
    modifiersEn: [],
    unclassifiedParts: [],
  });
});

test("keeps unknown processing text in the name and exposes it for review", () => {
  assert.deepEqual(normalizeDescription("Soup, prepared with water"), {
    normalizedNameEn: "Soup, prepared with water",
    preparationMethod: "UNSPECIFIED",
    foodState: "UNSPECIFIED",
    preparationConfidence: "LOW",
    modifiersEn: [],
    unclassifiedParts: ["prepared with water"],
  });
});

test("normalizes whitespace and punctuation", () => {
  assert.deepEqual(normalizeDescription("  Potatoes ,  cooked , boiled. , without salt  "), {
    normalizedNameEn: "Potatoes",
    preparationMethod: "BOILED",
    foodState: "COOKED",
    preparationConfidence: "HIGH",
    modifiersEn: ["without salt"],
    unclassifiedParts: [],
  });
});

test("marks conflicting explicit preparation methods as medium confidence", () => {
  assert.deepEqual(normalizeDescription("Vegetables, boiled, roasted"), {
    normalizedNameEn: "Vegetables",
    preparationMethod: "BOILED",
    foodState: "COOKED",
    preparationConfidence: "MEDIUM",
    modifiersEn: [],
    unclassifiedParts: [],
  });
});

test("rejects an empty description", () => {
  assert.throws(() => normalizeDescription("   "), /must not be empty/);
});

test("does not remove words embedded inside a product name", () => {
  assert.deepEqual(normalizeDescription("Roasted red pepper sauce"), {
    normalizedNameEn: "Roasted red pepper sauce",
    preparationMethod: "UNSPECIFIED",
    foodState: "UNSPECIFIED",
    preparationConfidence: "LOW",
    modifiersEn: [],
    unclassifiedParts: ["Roasted red pepper sauce"],
  });
});
