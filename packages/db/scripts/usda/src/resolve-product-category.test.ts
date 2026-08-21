import assert from "node:assert/strict";
import test from "node:test";

import { resolveProductCategory } from "./resolve-product-category.js";

function resolve(foodCategoryExternalId: string, normalizedNameEn: string) {
  return resolveProductCategory({
    foodCategoryExternalId,

    normalizedNameEn,

    originalDescription: normalizedNameEn,
  });
}

test("maps USDA beef category directly to beef", () => {
  assert.equal(resolve("13", "Beef, ground").code, "beef");
});

test("maps USDA pork category directly to pork", () => {
  assert.equal(resolve("10", "Pork, belly").code, "pork");
});

test("refines USDA poultry to chicken", () => {
  assert.equal(resolve("5", "Chicken, breast").code, "chicken");
});

test("refines USDA poultry to turkey", () => {
  assert.equal(resolve("5", "Turkey, wing").code, "turkey");
});

test("falls back to poultry for another bird", () => {
  assert.equal(resolve("5", "Quail, total edible").code, "poultry");
});

test("refines fruit to citrus", () => {
  assert.equal(resolve("9", "Lemons").code, "citrus_fruits");
});

test("refines fruit to berries", () => {
  assert.equal(resolve("9", "Blueberries, raw").code, "berries");
});

test("refines fruit to apples and pears", () => {
  assert.equal(resolve("9", "Apples, raw").code, "apples_pears");
});

test("falls back to fruits", () => {
  assert.equal(resolve("9", "Prickly pears").code, "fruits");
});

test("refines dairy to yogurt", () => {
  assert.equal(resolve("1", "Yogurt, plain").code, "yogurt");
});

test("refines dairy to cheese", () => {
  assert.equal(resolve("1", "Cheese, parmesan").code, "cheese");
});

test("refines dairy to milk", () => {
  assert.equal(resolve("1", "Milk, whole").code, "milk");
});

test("refines vegetable to alliums", () => {
  assert.equal(resolve("11", "Onions, raw").code, "alliums");
});

test("refines vegetable to root vegetables", () => {
  assert.equal(resolve("11", "Potatoes, raw").code, "root_vegetables");
});

test("refines beverage to coffee and tea", () => {
  assert.equal(resolve("14", "Beverages, coffee, instant").code, "tea_coffee");
});

test("refines beverage to alcohol", () => {
  assert.equal(resolve("14", "Alcoholic beverage, beer").code, "alcohol");
});

test("refines fish category to shellfish", () => {
  assert.equal(resolve("15", "Mollusks, scallop").code, "shellfish");
});

test("refines grain category to rice", () => {
  assert.equal(resolve("20", "Rice, brown, raw").code, "rice");
});

test("maps restaurant foods", () => {
  assert.equal(resolve("25", "Restaurant, Mexican, refried beans").code, "restaurant_food");
});

test("uses miscellaneous fallback for unmatched USDA category 16 product", () => {
  assert.equal(resolve("16", "Vegetarian fillets").code, "miscellaneous");
});

test("rejects an unsupported USDA category", () => {
  assert.throws(() => resolve("999", "Unknown product"), /Unsupported USDA food category "999"/);
});

test("rejects a missing USDA category", () => {
  assert.throws(
    () =>
      resolveProductCategory({
        foodCategoryExternalId: null,

        normalizedNameEn: "Unknown product",

        originalDescription: "Unknown product",
      }),
    /has no food category external ID/,
  );
});

test("refines USDA lamb and veal category to beef for veal", () => {
  assert.equal(resolve("17", "Veal, Australian, rib, rib roast").code, "beef");
});

test("keeps lamb in lamb and goat category", () => {
  assert.equal(resolve("17", "Lamb, leg, shank half").code, "lamb_goat");
});
