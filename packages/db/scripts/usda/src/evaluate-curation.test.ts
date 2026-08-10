import assert from "node:assert/strict";
import test from "node:test";

import { evaluateAutomaticCuration } from "./evaluate-curation.js";
import type { NormalizedProduct } from "./types.js";

function createProduct(overrides: Partial<NormalizedProduct> = {}): NormalizedProduct {
  return {
    fdcId: 100,
    dataset: "FOUNDATION_FOOD",
    dataType: "foundation_food",
    originalDescription: "Apple, raw",
    normalizedNameEn: "Apple",
    preparationMethod: "RAW",
    foodState: "RAW",
    preparationConfidence: "HIGH",
    modifiersEn: [],
    unclassifiedParts: [],
    foodCategoryExternalId: "9",
    publicationDate: "2024-10-31",
    ndbNumber: "09003",
    ...overrides,
  };
}

test("includes a generic food from an included category", () => {
  assert.deepEqual(evaluateAutomaticCuration(createProduct()), {
    decision: "INCLUDE",
    reasonCodes: ["CATEGORY_INCLUDED"],
  });
});

test("excludes a baby food category", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      foodCategoryExternalId: "3",
    }),
  );

  assert.equal(result.decision, "EXCLUDE");

  assert.ok(result.reasonCodes.includes("CATEGORY_EXCLUDED"));
});

test("includes a pure alcoholic product from the general beverages category", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Alcoholic beverage, distilled, whiskey",
      normalizedNameEn: "Alcoholic beverage, distilled, whiskey",
      foodCategoryExternalId: "14",
      foodState: "UNSPECIFIED",
      preparationMethod: "UNSPECIFIED",
      preparationConfidence: "LOW",
      modifiersEn: [],
      unclassifiedParts: [],
    }),
  );

  assert.deepEqual(result, {
    decision: "INCLUDE",
    reasonCodes: ["CATEGORY_INCLUDED"],
  });
});

test("excludes an alcoholic cocktail mix", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Beverages, Whiskey sour mix, bottled",
      normalizedNameEn: "Beverages, Whiskey sour mix",
      foodCategoryExternalId: "14",
      foodState: "UNSPECIFIED",
      preparationMethod: "UNSPECIFIED",
      preparationConfidence: "LOW",
      modifiersEn: [],
      unclassifiedParts: [],
    }),
  );

  assert.equal(result.decision, "EXCLUDE");

  assert.ok(result.reasonCodes.includes("DESCRIPTION_EXCLUDED"));
});

test("includes a product from the Alcoholic Beverages category", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Alcoholic beverage, distilled, vodka",
      normalizedNameEn: "Alcoholic beverage, distilled, vodka",
      foodCategoryExternalId: "28",
      foodState: "UNSPECIFIED",
      preparationMethod: "UNSPECIFIED",
      preparationConfidence: "LOW",
    }),
  );

  assert.equal(result.decision, "INCLUDE");

  assert.ok(result.reasonCodes.includes("CATEGORY_INCLUDED"));
});

test("sends a genuine composite dish to review", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Chicken casserole",
      normalizedNameEn: "Chicken casserole",
      preparationMethod: "UNSPECIFIED",
      foodState: "COOKED",
      preparationConfidence: "MEDIUM",
      foodCategoryExternalId: "5",
    }),
  );

  assert.equal(result.decision, "NEEDS_REVIEW");

  assert.ok(result.reasonCodes.includes("COMPOSITE_DISH"));
});

test("does not treat an ice cream sandwich as a composite dish", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Ice cream sandwich",
      normalizedNameEn: "Ice cream sandwich",
      foodCategoryExternalId: "1",
      preparationMethod: "UNSPECIFIED",
      foodState: "READY_TO_EAT",
      preparationConfidence: "MEDIUM",
    }),
  );

  assert.equal(result.reasonCodes.includes("COMPOSITE_DISH"), false);
});

test("does not treat pizza sauce as a composite dish", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Sauce, pizza, canned, ready-to-serve",
      normalizedNameEn: "Sauce, pizza, ready-to-serve",
      foodCategoryExternalId: "6",
      preparationMethod: "CANNED",
      foodState: "PROCESSED",
      preparationConfidence: "HIGH",
    }),
  );

  assert.equal(result.reasonCodes.includes("COMPOSITE_DISH"), false);
});

test("does not treat chicken with rice soup as a composite dish", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Soup, chicken with rice, canned, condensed",
      normalizedNameEn: "Soup, chicken with rice, condensed",
      foodCategoryExternalId: "6",
      preparationMethod: "CANNED",
      foodState: "PROCESSED",
      preparationConfidence: "HIGH",
    }),
  );

  assert.equal(result.reasonCodes.includes("COMPOSITE_DISH"), false);
});

test("sends a missing category to review", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      foodCategoryExternalId: null,
    }),
  );

  assert.equal(result.decision, "NEEDS_REVIEW");

  assert.ok(result.reasonCodes.includes("CATEGORY_MISSING"));
});

test("sends unclassified processing metadata to review", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      unclassifiedParts: ["special cooking preparation"],
    }),
  );

  assert.equal(result.decision, "NEEDS_REVIEW");

  assert.ok(result.reasonCodes.includes("UNCLASSIFIED_PROCESSING"));
});

test("includes a generic dairy product without preparation state", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      fdcId: 173430,
      originalDescription: "Butter, without salt",
      normalizedNameEn: "Butter",
      preparationMethod: "UNSPECIFIED",
      foodState: "UNSPECIFIED",
      preparationConfidence: "LOW",
      modifiersEn: ["without salt"],
      unclassifiedParts: [],
      foodCategoryExternalId: "1",
    }),
  );

  assert.deepEqual(result, {
    decision: "INCLUDE",
    reasonCodes: ["CATEGORY_INCLUDED"],
  });
});

test("includes a generic grain without preparation metadata", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Oats",
      normalizedNameEn: "Oats",
      preparationMethod: "UNSPECIFIED",
      foodState: "UNSPECIFIED",
      preparationConfidence: "LOW",
      foodCategoryExternalId: "20",
    }),
  );

  assert.equal(result.decision, "INCLUDE");
});

test("includes coffee from the beverages category", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Coffee, brewed",
      normalizedNameEn: "Coffee, brewed",
      preparationMethod: "UNSPECIFIED",
      foodState: "UNSPECIFIED",
      preparationConfidence: "LOW",
      foodCategoryExternalId: "14",
    }),
  );

  assert.deepEqual(result, {
    decision: "INCLUDE",
    reasonCodes: ["CATEGORY_INCLUDED"],
  });
});

test("excludes an unmatched beverage from the beverages category", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Beverages, specialty flavored drink, powdered",
      normalizedNameEn: "Beverages, specialty flavored drink, powdered",
      preparationMethod: "UNSPECIFIED",
      foodState: "UNSPECIFIED",
      preparationConfidence: "LOW",
      modifiersEn: [],
      unclassifiedParts: [],
      foodCategoryExternalId: "14",
    }),
  );

  assert.equal(result.decision, "EXCLUDE");

  assert.ok(result.reasonCodes.includes("DESCRIPTION_EXCLUDED"));
});

test("excludes a branded legacy beverage", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Beverages, OVALTINE, chocolate malt powder",
      normalizedNameEn: "Beverages, OVALTINE, chocolate malt powder",
      foodCategoryExternalId: "14",
    }),
  );

  assert.equal(result.decision, "EXCLUDE");
  assert.ok(result.reasonCodes.includes("DESCRIPTION_EXCLUDED"));
});

test("excludes a recipe-derived cocktail", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Alcoholic beverage, daiquiri, prepared-from-recipe",
      normalizedNameEn: "Alcoholic beverage, daiquiri",
      foodCategoryExternalId: "14",
    }),
  );

  assert.equal(result.decision, "EXCLUDE");
});

test("excludes an unmatched specialized beverage", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Beverages, chocolate syrup",
      normalizedNameEn: "Beverages, chocolate syrup",
      foodCategoryExternalId: "14",
    }),
  );

  assert.equal(result.decision, "EXCLUDE");
});

test("excludes a USDA-specific trimmed meat variant", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription:
        'Beef, chuck, blade roast, separable lean only, trimmed to 1/8" fat, choice, cooked, braised',
      normalizedNameEn: "Beef, chuck, blade roast",
      foodCategoryExternalId: "13",
      preparationMethod: "BRAISED",
      foodState: "COOKED",
      preparationConfidence: "HIGH",
      modifiersEn: ["separable lean only"],
    }),
  );

  assert.equal(result.decision, "EXCLUDE");

  assert.ok(result.reasonCodes.includes("OVERLY_SPECIFIC_MEAT_VARIANT"));

  assert.ok(result.reasonCodes.includes("DESCRIPTION_EXCLUDED"));
});

test("excludes a meat variant with fat trim expressed in inches", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Beef, chuck, blade roast, trimmed to 1/8 inch fat, cooked, braised",
      normalizedNameEn: "Beef, chuck, blade roast",
      foodCategoryExternalId: "13",
      preparationMethod: "BRAISED",
      foodState: "COOKED",
      preparationConfidence: "HIGH",
    }),
  );

  assert.equal(result.decision, "EXCLUDE");

  assert.ok(result.reasonCodes.includes("OVERLY_SPECIFIC_MEAT_VARIANT"));
});

test("does not exclude a useful generic beef cut", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Beef, tenderloin, steak, raw",
      normalizedNameEn: "Beef, tenderloin, steak",
      foodCategoryExternalId: "13",
      preparationMethod: "RAW",
      foodState: "RAW",
      preparationConfidence: "HIGH",
    }),
  );

  assert.equal(result.decision, "INCLUDE");
});

test("includes a separable lean meat variant", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Beef, round, separable lean only, cooked",
      normalizedNameEn: "Beef, round",
      foodCategoryExternalId: "13",
      preparationMethod: "UNSPECIFIED",
      foodState: "COOKED",
      preparationConfidence: "MEDIUM",
      modifiersEn: ["separable lean only"],
    }),
  );

  assert.deepEqual(result, {
    decision: "INCLUDE",
    reasonCodes: ["CATEGORY_INCLUDED"],
  });
});

test("includes a separable lean and fat meat variant", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Beef, round, separable lean and fat, cooked",
      normalizedNameEn: "Beef, round",
      foodCategoryExternalId: "13",
      preparationMethod: "UNSPECIFIED",
      foodState: "COOKED",
      preparationConfidence: "MEDIUM",
      modifiersEn: ["separable lean and fat"],
    }),
  );

  assert.deepEqual(result, {
    decision: "INCLUDE",
    reasonCodes: ["CATEGORY_INCLUDED"],
  });
});

test("includes beer from the general beverages category", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Alcoholic beverage, beer, regular",
      normalizedNameEn: "Alcoholic beverage, beer, regular",
      foodCategoryExternalId: "14",
      preparationMethod: "UNSPECIFIED",
      foodState: "UNSPECIFIED",
      preparationConfidence: "LOW",
    }),
  );

  assert.deepEqual(result, {
    decision: "INCLUDE",
    reasonCodes: ["CATEGORY_INCLUDED"],
  });
});

test("includes wine from the general beverages category", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Alcoholic beverage, wine, table, red",
      normalizedNameEn: "Alcoholic beverage, wine, table, red",
      foodCategoryExternalId: "14",
      preparationMethod: "UNSPECIFIED",
      foodState: "UNSPECIFIED",
      preparationConfidence: "LOW",
    }),
  );

  assert.deepEqual(result, {
    decision: "INCLUDE",
    reasonCodes: ["CATEGORY_INCLUDED"],
  });
});

test("includes a plant-based milk from the beverages category", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Beverages, almond milk, unsweetened, shelf stable",
      normalizedNameEn: "Beverages, almond milk, unsweetened, shelf stable",
      foodCategoryExternalId: "14",
      preparationMethod: "UNSPECIFIED",
      foodState: "UNSPECIFIED",
      preparationConfidence: "LOW",
    }),
  );

  assert.deepEqual(result, {
    decision: "INCLUDE",
    reasonCodes: ["CATEGORY_INCLUDED"],
  });
});

test("includes a carbonated soft drink from the beverages category", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Beverages, carbonated, cola, regular",
      normalizedNameEn: "Beverages, carbonated, cola, regular",
      foodCategoryExternalId: "14",
      preparationMethod: "UNSPECIFIED",
      foodState: "UNSPECIFIED",
      preparationConfidence: "LOW",
    }),
  );

  assert.deepEqual(result, {
    decision: "INCLUDE",
    reasonCodes: ["CATEGORY_INCLUDED"],
  });
});

test("excludes a meal replacement beverage", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Beverages, ENSURE, nutritional shake, ready-to-drink",
      normalizedNameEn: "Beverages, ENSURE, nutritional shake",
      foodCategoryExternalId: "14",
      preparationMethod: "UNSPECIFIED",
      foodState: "UNSPECIFIED",
      preparationConfidence: "LOW",
    }),
  );

  assert.equal(result.decision, "EXCLUDE");

  assert.ok(result.reasonCodes.includes("DESCRIPTION_EXCLUDED"));
});

test("includes a generic candy from the sweets category", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Candies, caramels",
      normalizedNameEn: "Candies, caramels",
      foodCategoryExternalId: "19",
      preparationMethod: "UNSPECIFIED",
      foodState: "UNSPECIFIED",
      preparationConfidence: "LOW",
    }),
  );

  assert.deepEqual(result, {
    decision: "INCLUDE",
    reasonCodes: ["CATEGORY_INCLUDED"],
  });
});

test("excludes a branded candy from the sweets category", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Candies, MARS SNACKFOOD US, SNICKERS Bar",
      normalizedNameEn: "Candies, MARS SNACKFOOD US, SNICKERS Bar",
      foodCategoryExternalId: "19",
      preparationMethod: "UNSPECIFIED",
      foodState: "UNSPECIFIED",
      preparationConfidence: "LOW",
      modifiersEn: [],
      unclassifiedParts: [],
    }),
  );

  assert.equal(result.decision, "EXCLUDE");

  assert.ok(result.reasonCodes.includes("DESCRIPTION_EXCLUDED"));
});

test("excludes a recipe-derived candy", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Candies, fudge, chocolate, prepared-from-recipe",
      normalizedNameEn: "Candies, fudge, chocolate",
      foodCategoryExternalId: "19",
      preparationMethod: "UNSPECIFIED",
      foodState: "UNSPECIFIED",
      preparationConfidence: "LOW",
      modifiersEn: ["prepared from recipe"],
      unclassifiedParts: [],
    }),
  );

  assert.equal(result.decision, "EXCLUDE");

  assert.ok(result.reasonCodes.includes("DESCRIPTION_EXCLUDED"));
});

test("includes generic cocoa from the sweets category", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Cocoa, dry powder, unsweetened",
      normalizedNameEn: "Cocoa, dry powder, unsweetened",
      foodCategoryExternalId: "19",
      preparationMethod: "UNSPECIFIED",
      foodState: "UNSPECIFIED",
      preparationConfidence: "LOW",
    }),
  );

  assert.deepEqual(result, {
    decision: "INCLUDE",
    reasonCodes: ["CATEGORY_INCLUDED"],
  });
});

test("excludes a reconstituted canned soup", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Soup, chicken noodle, canned, prepared with equal volume water",
      normalizedNameEn: "Soup, chicken noodle",
      foodCategoryExternalId: "6",
      preparationMethod: "CANNED",
      foodState: "PROCESSED",
      preparationConfidence: "HIGH",
      modifiersEn: ["prepared with equal volume water"],
      unclassifiedParts: [],
    }),
  );

  assert.equal(result.decision, "EXCLUDE");
});

test("excludes a restaurant-specific soup", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Soup, hot and sour, Chinese restaurant",
      normalizedNameEn: "Soup, hot and sour",
      foodCategoryExternalId: "6",
      preparationMethod: "UNSPECIFIED",
      foodState: "UNSPECIFIED",
      preparationConfidence: "LOW",
      modifiersEn: [],
      unclassifiedParts: [],
    }),
  );

  assert.equal(result.decision, "EXCLUDE");
});

test("includes a generic sauce", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Sauce, barbecue",
      normalizedNameEn: "Sauce, barbecue",
      foodCategoryExternalId: "6",
      preparationMethod: "UNSPECIFIED",
      foodState: "UNSPECIFIED",
      preparationConfidence: "LOW",
    }),
  );

  assert.deepEqual(result, {
    decision: "INCLUDE",
    reasonCodes: ["CATEGORY_INCLUDED"],
  });
});

test("includes a generic gravy", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Gravy, beef, canned, ready-to-serve",
      normalizedNameEn: "Gravy, beef, ready-to-serve",
      foodCategoryExternalId: "6",
      preparationMethod: "CANNED",
      foodState: "PROCESSED",
      preparationConfidence: "HIGH",
    }),
  );

  assert.equal(result.decision, "INCLUDE");
});

test("includes a generic broth", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Fish broth",
      normalizedNameEn: "Fish broth",
      foodCategoryExternalId: "6",
      preparationMethod: "UNSPECIFIED",
      foodState: "UNSPECIFIED",
      preparationConfidence: "LOW",
    }),
  );

  assert.equal(result.decision, "INCLUDE");
});

test("includes a generic chicken noodle soup", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Soup, chicken noodle, canned, condensed",
      normalizedNameEn: "Soup, chicken noodle, condensed",
      foodCategoryExternalId: "6",
      preparationMethod: "CANNED",
      foodState: "PROCESSED",
      preparationConfidence: "HIGH",
    }),
  );

  assert.deepEqual(result, {
    decision: "INCLUDE",
    reasonCodes: ["CATEGORY_INCLUDED"],
  });
});

test("includes generic minestrone soup", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Soup, minestrone, canned, chunky, ready-to-serve",
      normalizedNameEn: "Soup, minestrone, chunky, ready-to-serve",
      foodCategoryExternalId: "6",
      preparationMethod: "CANNED",
      foodState: "PROCESSED",
      preparationConfidence: "HIGH",
    }),
  );

  assert.deepEqual(result, {
    decision: "INCLUDE",
    reasonCodes: ["CATEGORY_INCLUDED"],
  });
});

test("excludes a reconstituted soup", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Soup, chicken noodle, canned, prepared with equal volume water",
      normalizedNameEn: "Soup, chicken noodle",
      foodCategoryExternalId: "6",
      preparationMethod: "CANNED",
      foodState: "PROCESSED",
      preparationConfidence: "HIGH",
      modifiersEn: ["prepared with equal volume water"],
      unclassifiedParts: [],
    }),
  );

  assert.equal(result.decision, "EXCLUDE");

  assert.ok(result.reasonCodes.includes("DESCRIPTION_EXCLUDED"));
});

test("excludes a branded soup", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "CAMPBELL'S, Chicken Noodle Soup, condensed",
      normalizedNameEn: "CAMPBELL'S, Chicken Noodle Soup, condensed",
      foodCategoryExternalId: "6",
      preparationMethod: "UNSPECIFIED",
      foodState: "UNSPECIFIED",
      preparationConfidence: "LOW",
      modifiersEn: [],
      unclassifiedParts: [],
    }),
  );

  assert.equal(result.decision, "EXCLUDE");

  assert.ok(result.reasonCodes.includes("DESCRIPTION_EXCLUDED"));
});

test("includes a generic sausage product", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Sausage, Italian, pork, mild, raw",
      normalizedNameEn: "Sausage, Italian, pork, mild",
      foodCategoryExternalId: "7",
      preparationMethod: "RAW",
      foodState: "RAW",
      preparationConfidence: "HIGH",
    }),
  );

  assert.deepEqual(result, {
    decision: "INCLUDE",
    reasonCodes: ["CATEGORY_INCLUDED"],
  });
});

test("includes a generic deli meat", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Turkey breast, sliced, prepackaged",
      normalizedNameEn: "Turkey breast, sliced, prepackaged",
      foodCategoryExternalId: "7",
      preparationMethod: "UNSPECIFIED",
      foodState: "UNSPECIFIED",
      preparationConfidence: "LOW",
    }),
  );

  assert.equal(result.decision, "INCLUDE");
});

test("excludes an Oscar Mayer product", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Oscar Mayer, Bologna (beef)",
      normalizedNameEn: "Oscar Mayer, Bologna (beef)",
      foodCategoryExternalId: "7",
      preparationMethod: "UNSPECIFIED",
      foodState: "UNSPECIFIED",
      preparationConfidence: "LOW",
    }),
  );

  assert.equal(result.decision, "EXCLUDE");
});

test("excludes luncheon meat that explicitly references Spam", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Luncheon meat, pork with ham, minced, canned, includes Spam (Hormel)",
      normalizedNameEn: "Luncheon meat, pork with ham, minced",
      foodCategoryExternalId: "7",
      preparationMethod: "CANNED",
      foodState: "PROCESSED",
      preparationConfidence: "HIGH",
    }),
  );

  assert.equal(result.decision, "EXCLUDE");
});

test("excludes a composite sandwich spread", () => {
  const result = evaluateAutomaticCuration(
    createProduct({
      originalDescription: "Poultry salad sandwich spread",
      normalizedNameEn: "Poultry salad sandwich spread",
      foodCategoryExternalId: "7",
      preparationMethod: "UNSPECIFIED",
      foodState: "UNSPECIFIED",
      preparationConfidence: "LOW",
      modifiersEn: [],
      unclassifiedParts: [],
    }),
  );

  assert.equal(result.decision, "EXCLUDE");

  assert.ok(result.reasonCodes.includes("DESCRIPTION_EXCLUDED"));
});
