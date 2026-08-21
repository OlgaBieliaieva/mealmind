import assert from "node:assert/strict";
import test from "node:test";

import { buildProductNameTranslationKey } from "./product-name-translation-key.js";

test("builds a deterministic product-name translation key", () => {
  assert.equal(
    buildProductNameTranslationKey({
      nameEn: "Turnips",

      categoryCode: "root_vegetables",

      preparationMethod: "BOILED",

      foodState: "COOKED",

      modifiersEn: ["with salt", "drained"],
    }),

    "Turnips::root_vegetables::BOILED::COOKED::drained|with salt",
  );
});

test("modifier order does not affect translation key", () => {
  const first = buildProductNameTranslationKey({
    nameEn: "Turnips",

    categoryCode: "root_vegetables",

    preparationMethod: "BOILED",

    foodState: "COOKED",

    modifiersEn: ["with salt", "drained"],
  });

  const second = buildProductNameTranslationKey({
    nameEn: "Turnips",

    categoryCode: "root_vegetables",

    preparationMethod: "BOILED",

    foodState: "COOKED",

    modifiersEn: ["drained", "with salt"],
  });

  assert.equal(first, second);
});

test("builds a key without modifiers", () => {
  assert.equal(
    buildProductNameTranslationKey({
      nameEn: "Abiyuch",

      categoryCode: "fruits",

      preparationMethod: "RAW",

      foodState: "RAW",

      modifiersEn: [],
    }),

    "Abiyuch::fruits::RAW::RAW::",
  );
});
