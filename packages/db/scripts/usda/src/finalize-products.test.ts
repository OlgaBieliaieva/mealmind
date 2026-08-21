import assert from "node:assert/strict";
import test from "node:test";

import { finalizeProducts } from "./finalize-products.js";

import { buildImportReady, buildTranslations } from "./test/final-products-fixture.js";

test("finalizes product localization", () => {
  const result = finalizeProducts({
    importReady: buildImportReady(),

    nameTranslations: buildTranslations(),

    translateModifier: (value) => (value === "with salt" ? "із сіллю" : null),

    translatePortion: (portion) => (portion.labelEn === "medium" ? "середній" : null),
  });

  const product = result.products[0];

  assert.ok(product);

  assert.equal(product.nameUa, "Ріпа — після відварювання; із сіллю");

  assert.deepEqual(product.modifiersUa, ["із сіллю"]);

  assert.equal(product.portions[0]?.labelUa, "середній");
});

test("preserves nutrient data", () => {
  const result = finalizeProducts({
    importReady: buildImportReady(),

    nameTranslations: buildTranslations(),

    translateModifier: () => "із сіллю",

    translatePortion: () => "середній",
  });

  assert.equal(result.products[0]?.nutrients[0]?.valuePer100g, 22);
});

test("rejects missing product-name translation", () => {
  assert.throws(
    () =>
      finalizeProducts({
        importReady: buildImportReady(),

        nameTranslations: {
          schemaVersion: 1,

          sourceSchemaVersion: 1,

          statistics: {
            translationItemsTotal: 0,

            translatedItemsTotal: 0,
          },

          translations: [],
        },

        translateModifier: () => "із сіллю",

        translatePortion: () => "середній",
      }),
    /Missing product-name translation/,
  );
});

test("rejects missing modifier translation", () => {
  assert.throws(
    () =>
      finalizeProducts({
        importReady: buildImportReady(),

        nameTranslations: buildTranslations(),

        translateModifier: () => null,

        translatePortion: () => "середній",
      }),
    /Missing Ukrainian translation for modifier/,
  );
});

test("rejects missing portion translation", () => {
  assert.throws(
    () =>
      finalizeProducts({
        importReady: buildImportReady(),

        nameTranslations: buildTranslations(),

        translateModifier: () => "із сіллю",

        translatePortion: () => null,
      }),
    /Missing Ukrainian translation for portion label/,
  );
});

test("finalization is deterministic", () => {
  const options = {
    importReady: buildImportReady(),

    nameTranslations: buildTranslations(),

    translateModifier: () => "із сіллю",

    translatePortion: () => "середній",
  };

  const first = finalizeProducts(options);

  const second = finalizeProducts(options);

  assert.deepEqual(first, second);
});

test("passes full portion to portion translator", () => {
  let receivedLabel: string | null = null;

  let receivedAmount: number | null = null;

  finalizeProducts({
    importReady: buildImportReady(),

    nameTranslations: buildTranslations(),

    translateModifier: () => "із сіллю",

    translatePortion: (portion) => {
      receivedLabel = portion.labelEn;

      receivedAmount = portion.amount;

      return "середній";
    },
  });

  assert.equal(receivedLabel, "medium");

  assert.equal(receivedAmount, 1);
});
