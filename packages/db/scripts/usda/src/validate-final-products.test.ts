import assert from "node:assert/strict";
import test from "node:test";

import { finalizeProducts } from "./finalize-products.js";

import { validateFinalProducts } from "./validate-final-products.js";

import { buildImportReady, buildTranslations } from "./test/final-products-fixture.js";

test("validates a complete final dataset", () => {
  const document = finalizeProducts({
    importReady: buildImportReady(),

    nameTranslations: buildTranslations(),

    translateModifier: () => "із сіллю",

    translatePortion: () => "середній",
  });

  const result = validateFinalProducts(document);

  assert.equal(result.productsWithoutNameUa, 0);

  assert.equal(result.productsWithoutEnergy, 0);

  assert.equal(result.invalidModifierTranslations, 0);

  assert.equal(result.invalidPortionTranslations, 0);

  assert.equal(result.invalidNutrientValues, 0);

  assert.equal(result.invalidPortionValues, 0);

  assert.equal(result.statisticsProblems, 0);
});
