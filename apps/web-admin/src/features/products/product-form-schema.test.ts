import { describe, expect, it } from "vitest";

import {
  EMPTY_PRODUCT_FORM,
  mapProductFormToCreate,
  mapProductFormToUpdate,
  productFormSchema,
} from "./product-form-schema";

const categoryId = "24b79ffc-e6af-440c-ae38-8cd37c22be1c";
const unitId = "34b79ffc-e6af-440c-ae38-8cd37c22be1c";
const brandId = "44b79ffc-e6af-440c-ae38-8cd37c22be1c";
const baseProductId = "54b79ffc-e6af-440c-ae38-8cd37c22be1c";

describe("product form schema and mapper", () => {
  it("maps a valid generic form without branded-only fields", () => {
    const values = {
      ...EMPTY_PRODUCT_FORM,
      nameEn: "Apple",
      nameUa: "Яблуко",
      categoryId,
      defaultMeasurementUnitId: unitId,
      ediblePortionPercent: "95",
    };

    expect(productFormSchema.safeParse(values).success).toBe(true);
    expect(mapProductFormToCreate(values)).toEqual(
      expect.objectContaining({
        type: "GENERIC",
        nameEn: "Apple",
        nameUa: "Яблуко",
        ediblePortionPercent: "95",
      }),
    );
    expect(mapProductFormToCreate(values)).not.toHaveProperty("brandId");
  });

  it("requires brand, GTIN and generic base for a branded product", () => {
    const result = productFormSchema.safeParse({
      ...EMPTY_PRODUCT_FORM,
      type: "BRANDED",
      nameEn: "Brand Apple",
      categoryId,
      defaultMeasurementUnitId: unitId,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(["brandId", "baseProductId", "gtin"]),
      );
    }
  });

  it("keeps immutable type/base fields out of the update payload", () => {
    const update = mapProductFormToUpdate({
      ...EMPTY_PRODUCT_FORM,
      type: "BRANDED",
      nameEn: "Brand Apple",
      categoryId,
      defaultMeasurementUnitId: unitId,
      brandId,
      baseProductId,
      gtin: "12345678",
    });

    expect(update).not.toHaveProperty("type");
    expect(update).not.toHaveProperty("baseProductId");
    expect(update).toMatchObject({ brandId, gtin: "12345678" });
  });
});
