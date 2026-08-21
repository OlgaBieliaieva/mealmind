import assert from "node:assert/strict";
import test from "node:test";

import { buildProductNameTranslationMap } from "./product-name-translation-resolver.js";

test("builds translation map", () => {
  const result = buildProductNameTranslationMap({
    schemaVersion: 1,

    sourceSchemaVersion: 1,

    statistics: {
      translationItemsTotal: 1,

      translatedItemsTotal: 1,
    },

    translations: [
      {
        key: "Turnips::root_vegetables::RAW::RAW::",

        nameUa: "Ріпа",
      },
    ],
  });

  assert.equal(result.get("Turnips::root_vegetables::RAW::RAW::"), "Ріпа");
});

test("rejects duplicate keys", () => {
  assert.throws(
    () =>
      buildProductNameTranslationMap({
        schemaVersion: 1,

        sourceSchemaVersion: 1,

        statistics: {
          translationItemsTotal: 2,

          translatedItemsTotal: 2,
        },

        translations: [
          {
            key: "same",

            nameUa: "Один",
          },
          {
            key: "same",

            nameUa: "Два",
          },
        ],
      }),
    /Duplicate product-name translation key/,
  );
});

test("rejects empty Ukrainian name", () => {
  assert.throws(
    () =>
      buildProductNameTranslationMap({
        schemaVersion: 1,

        sourceSchemaVersion: 1,

        statistics: {
          translationItemsTotal: 1,

          translatedItemsTotal: 1,
        },

        translations: [
          {
            key: "test",

            nameUa: " ",
          },
        ],
      }),
    /empty Ukrainian name/,
  );
});
