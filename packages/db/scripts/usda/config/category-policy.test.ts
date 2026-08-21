import assert from "node:assert/strict";
import test from "node:test";

import { USDA_CATEGORY_POLICY } from "../config/category-policy.js";
import { USDA_FOOD_CATEGORIES } from "../config/usda-food-categories.js";

test("category policy covers every known USDA food category", () => {
  const categoryIds = USDA_FOOD_CATEGORIES.map((category) => category.id).sort();

  const policyIds = Object.keys(USDA_CATEGORY_POLICY).sort();

  assert.deepEqual(policyIds, categoryIds);
});

test("USDA food category registry has unique IDs and codes", () => {
  const ids = USDA_FOOD_CATEGORIES.map((category) => category.id);

  const codes = USDA_FOOD_CATEGORIES.map((category) => category.code);

  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(codes).size, codes.length);
});

test("USDA food category registry contains all 28 categories", () => {
  assert.equal(USDA_FOOD_CATEGORIES.length, 28);
});
