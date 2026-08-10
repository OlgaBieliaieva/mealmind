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

test("recognizes known preparation metadata instead of exposing it for review", () => {
  const result = normalizeDescription("Soup, prepared with water");

  assert.deepEqual(result, {
    normalizedNameEn: "Soup",
    preparationMethod: "UNSPECIFIED",
    foodState: "UNSPECIFIED",
    preparationConfidence: "LOW",
    modifiersEn: ["prepared with water"],
    unclassifiedParts: [],
  });
});

test("keeps truly unknown processing text in the name and exposes it for review", () => {
  const result = normalizeDescription("Vegetable, special cooking preparation");

  assert.deepEqual(result, {
    normalizedNameEn: "Vegetable, special cooking preparation",
    preparationMethod: "UNSPECIFIED",
    foodState: "UNSPECIFIED",
    preparationConfidence: "LOW",
    modifiersEn: [],
    unclassifiedParts: ["special cooking preparation"],
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

test("normalizes a hard-boiled egg", () => {
  assert.deepEqual(normalizeDescription("Egg, whole, cooked, hard-boiled"), {
    normalizedNameEn: "Egg",
    preparationMethod: "BOILED",
    foodState: "COOKED",
    preparationConfidence: "HIGH",
    modifiersEn: ["whole"],
    unclassifiedParts: [],
  });
});

test("normalizes a stir-fried vegetable", () => {
  const result = normalizeDescription("Mushrooms, shiitake, stir-fried");

  assert.equal(result.preparationMethod, "STIR_FRIED");

  assert.equal(result.foodState, "COOKED");

  assert.deepEqual(result.unclassifiedParts, []);
});

test("normalizes dry-roasted nuts", () => {
  const result = normalizeDescription("Nuts, almonds, dry roasted, without salt added");

  assert.equal(result.preparationMethod, "ROASTED");

  assert.equal(result.foodState, "COOKED");

  assert.deepEqual(result.unclassifiedParts, []);
});

test("normalizes freeze-dried herbs", () => {
  const result = normalizeDescription("Parsley, freeze-dried");

  assert.equal(result.preparationMethod, "DRIED");

  assert.equal(result.foodState, "PROCESSED");

  assert.deepEqual(result.unclassifiedParts, []);
});

test("does not classify baking powder as processing metadata", () => {
  const result = normalizeDescription("Leavening agents, baking powder");

  assert.deepEqual(result.unclassifiedParts, []);
});

test("does not classify baking chocolate as processing metadata", () => {
  const result = normalizeDescription("Chocolate, baking, unsweetened");

  assert.deepEqual(result.unclassifiedParts, []);
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

test("recognizes preparation with water as a modifier", () => {
  const result = normalizeDescription("Cereals, oats, instant, prepared with water");

  assert.ok(result.modifiersEn.includes("prepared with water"));

  assert.equal(result.unclassifiedParts.includes("prepared with water"), false);
});

test("recognizes equal-volume water preparation as a modifier", () => {
  const result = normalizeDescription("Soup, tomato, prepared with equal volume water");

  assert.ok(result.modifiersEn.includes("prepared with equal volume water"));

  assert.equal(result.unclassifiedParts.includes("prepared with equal volume water"), false);
});

test("recognizes preparation with whole milk as a modifier", () => {
  const result = normalizeDescription("Pudding, chocolate, prepared with whole milk");

  assert.ok(result.modifiersEn.includes("prepared with whole milk"));

  assert.equal(result.unclassifiedParts.includes("prepared with whole milk"), false);
});

test("recognizes preparation with 2% milk as a modifier", () => {
  const result = normalizeDescription("Pudding, vanilla, prepared with 2% milk");

  assert.ok(result.modifiersEn.includes("prepared with 2% milk"));

  assert.equal(result.unclassifiedParts.includes("prepared with 2% milk"), false);
});

test("recognizes recipe-derived preparation as a modifier", () => {
  const result = normalizeDescription("Cake, chocolate, prepared from recipe");

  assert.ok(result.modifiersEn.includes("prepared from recipe"));

  assert.equal(result.unclassifiedParts.includes("prepared from recipe"), false);
});

test("canonicalizes prepared-from-recipe modifier", () => {
  const result = normalizeDescription("Candies, fudge, prepared-from-recipe");

  assert.ok(result.modifiersEn.includes("prepared from recipe"));

  assert.equal(result.unclassifiedParts.includes("prepared-from-recipe"), false);
});

test("recognizes commercially prepared as known metadata", () => {
  const result = normalizeDescription("Cookies, chocolate chip, commercially prepared");

  assert.ok(result.modifiersEn.includes("commercially prepared"));

  assert.equal(result.unclassifiedParts.includes("commercially prepared"), false);
});

test("canonicalizes home-prepared metadata", () => {
  const result = normalizeDescription("Bread, banana, home prepared");

  assert.ok(result.modifiersEn.includes("home-prepared"));

  assert.equal(result.unclassifiedParts.includes("home prepared"), false);
});

test("does not treat fried rice as generic preparation metadata", () => {
  const result = normalizeDescription("Restaurant, Chinese, fried rice, without meat");

  assert.match(result.normalizedNameEn, /fried rice/i);
});

test("does not treat frozen yogurt as generic preparation metadata", () => {
  const result = normalizeDescription("Frozen yogurts, chocolate");

  assert.match(result.normalizedNameEn, /frozen yogurts/i);
});

test("recognizes USDA contextual cooked annotation", () => {
  const result = normalizeDescription("Caribou, hind quarter, meat, cooked (Alaska Native)");

  assert.equal(result.foodState, "COOKED");

  assert.deepEqual(result.unclassifiedParts, []);

  assert.match(result.normalizedNameEn, /Caribou, hind quarter, meat/i);
});

test("recognizes USDA contextual roasted annotation", () => {
  const result = normalizeDescription("Pinon Nuts, roasted (Navajo)");

  assert.equal(result.preparationMethod, "ROASTED");

  assert.deepEqual(result.unclassifiedParts, []);
});

test("recognizes cooked-roasted as roasted", () => {
  const result = normalizeDescription(
    "Pork loin, fresh, backribs, bone-in, cooked-roasted, lean only",
  );

  assert.equal(result.preparationMethod, "ROASTED");

  assert.equal(result.foodState, "COOKED");

  assert.deepEqual(result.unclassifiedParts, []);
});

test("recognizes tofu coagulant as preparation metadata", () => {
  const result = normalizeDescription("Tofu, raw, firm, prepared with calcium sulfate");

  assert.ok(result.modifiersEn.includes("prepared with calcium sulfate"));

  assert.deepEqual(result.unclassifiedParts, []);
});
