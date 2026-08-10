import assert from "node:assert/strict";
import test from "node:test";

import { NUTRIENTS } from "../config/nutrients.js";

import {
  USDA_NUTRIENT_BY_ID,
  USDA_NUTRIENT_ID_SET,
  USDA_NUTRIENT_WHITELIST,
} from "../config/nutrient-whitelist.js";

test("USDA nutrient whitelist contains all configured MealMind nutrients", () => {
  assert.equal(USDA_NUTRIENT_WHITELIST.length, NUTRIENTS.length);

  assert.equal(USDA_NUTRIENT_WHITELIST.length, 36);
});

test("USDA nutrient whitelist contains unique USDA nutrient IDs", () => {
  const values = USDA_NUTRIENT_WHITELIST.map((nutrient) => nutrient.usdaNutrientId);

  assert.equal(new Set(values).size, values.length);
});

test("USDA nutrient whitelist contains unique USDA nutrient numbers", () => {
  const values = USDA_NUTRIENT_WHITELIST.map((nutrient) => nutrient.usdaNutrientNumber);

  assert.equal(new Set(values).size, values.length);
});

test("USDA nutrient whitelist contains unique MealMind nutrient IDs", () => {
  const values = USDA_NUTRIENT_WHITELIST.map((nutrient) => nutrient.nutrientId);

  assert.equal(new Set(values).size, values.length);
});

test("USDA nutrient whitelist contains unique MealMind nutrient codes", () => {
  const values = USDA_NUTRIENT_WHITELIST.map((nutrient) => nutrient.code);

  assert.equal(new Set(values).size, values.length);
});

test("USDA nutrient lookup map contains every whitelist nutrient", () => {
  assert.equal(USDA_NUTRIENT_BY_ID.size, USDA_NUTRIENT_WHITELIST.length);

  for (const nutrient of USDA_NUTRIENT_WHITELIST) {
    assert.deepEqual(USDA_NUTRIENT_BY_ID.get(nutrient.usdaNutrientId), nutrient);
  }
});

test("USDA nutrient ID set contains every whitelist nutrient", () => {
  assert.equal(USDA_NUTRIENT_ID_SET.size, USDA_NUTRIENT_WHITELIST.length);

  for (const nutrient of USDA_NUTRIENT_WHITELIST) {
    assert.equal(USDA_NUTRIENT_ID_SET.has(nutrient.usdaNutrientId), true);
  }
});

test("known USDA nutrient mappings remain stable", () => {
  const energy = USDA_NUTRIENT_BY_ID.get(1008);

  assert.ok(energy);

  assert.equal(energy.code, "energy_kcal");

  assert.equal(energy.usdaNutrientNumber, "208");

  assert.equal(energy.unit, "KCAL");

  const protein = USDA_NUTRIENT_BY_ID.get(1003);

  assert.ok(protein);

  assert.equal(protein.code, "protein");

  assert.equal(protein.usdaNutrientNumber, "203");

  assert.equal(protein.unit, "G");
});
