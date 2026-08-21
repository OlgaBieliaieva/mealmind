import assert from "node:assert/strict";
import test from "node:test";

import {
  getAssignableProductCategoryReference,
  getProductCategoryReference,
  PRODUCT_CATEGORY_REFERENCE_BY_CODE,
  PRODUCT_CATEGORY_REFERENCES,
} from "../config/product-category-reference.js";

test("loads MealMind ProductCategory references", () => {
  assert.ok(PRODUCT_CATEGORY_REFERENCES.length > 0);

  assert.equal(PRODUCT_CATEGORY_REFERENCE_BY_CODE.size, PRODUCT_CATEGORY_REFERENCES.length);
});

test("ProductCategory codes are unique", () => {
  const codes = PRODUCT_CATEGORY_REFERENCES.map((category) => category.code);

  assert.equal(new Set(codes).size, codes.length);
});

test("ProductCategory IDs are unique", () => {
  const ids = PRODUCT_CATEGORY_REFERENCES.map((category) => category.id);

  assert.equal(new Set(ids).size, ids.length);
});

test("resolves a ProductCategory by code", () => {
  const category = getProductCategoryReference("berries");

  assert.equal(category.id, "7e182f85-7a6d-4dc0-b311-f2a41a364ae8");

  assert.equal(category.code, "berries");

  assert.equal(category.nameEn, "Berries");

  assert.equal(category.nameUa, "Ягоди");

  assert.equal(category.kind, "INGREDIENT");

  assert.equal(category.isAssignable, true);

  assert.equal(category.isActive, true);
});

test("resolves an assignable active ProductCategory", () => {
  const category = getAssignableProductCategoryReference("chicken");

  assert.equal(category.id, "d889ce24-47e8-45ba-9181-64eef08ff485");

  assert.equal(category.code, "chicken");

  assert.equal(category.isAssignable, true);

  assert.equal(category.isActive, true);
});

test("resolves a broad assignable ProductCategory", () => {
  const category = getAssignableProductCategoryReference("fruits");

  assert.equal(category.code, "fruits");

  assert.equal(category.parentCategoryId, null);
});

test("resolves a USDA extension ProductCategory", () => {
  const category = getAssignableProductCategoryReference("processed_meat");

  assert.equal(category.id, "da29b905-fd7f-45fb-860a-ff658cfc188c");

  assert.equal(category.kind, "PREPARED_FOOD");
});

test("rejects a non-assignable ProductCategory", () => {
  assert.throws(
    () => getAssignableProductCategoryReference("prepared_foods"),
    /ProductCategory "prepared_foods" is not assignable/,
  );
});

test("rejects an unknown ProductCategory code", () => {
  assert.throws(
    () => getProductCategoryReference("__unknown_category__"),
    /Unknown MealMind ProductCategory code "__unknown_category__"/,
  );
});

test("every reference is present in the lookup map", () => {
  for (const category of PRODUCT_CATEGORY_REFERENCES) {
    const mapped = PRODUCT_CATEGORY_REFERENCE_BY_CODE.get(category.code);

    assert.ok(mapped, `Missing lookup entry for ProductCategory "${category.code}".`);

    assert.equal(mapped.id, category.id);
  }
});

test("all category parents reference an existing category", () => {
  const categoryIds = new Set(PRODUCT_CATEGORY_REFERENCES.map((category) => category.id));

  for (const category of PRODUCT_CATEGORY_REFERENCES) {
    if (category.parentCategoryId === null) {
      continue;
    }

    assert.equal(
      categoryIds.has(category.parentCategoryId),
      true,
      `Missing parent for ProductCategory "${category.code}".`,
    );
  }
});

test("all ProductCategory references are active", () => {
  for (const category of PRODUCT_CATEGORY_REFERENCES) {
    assert.equal(
      category.isActive,
      true,
      `ProductCategory "${category.code}" must be active for the USDA reference snapshot.`,
    );
  }
});
