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
const characteristicId = "64b79ffc-e6af-440c-ae38-8cd37c22be1c";

describe("product form schema and mapper", () => {
  it("maps a valid generic form without branded-only fields", () => {
    const values = {
      ...EMPTY_PRODUCT_FORM,
      nameEn: "Apple",
      nameUa: "Яблуко",
      categoryId,
      defaultMeasurementUnitId: unitId,
      ediblePortionPercent: "95",
      characteristicIds: [characteristicId],
    };

    expect(productFormSchema.safeParse(values).success).toBe(true);
    expect(mapProductFormToCreate(values)).toEqual(
      expect.objectContaining({
        type: "GENERIC",
        nameEn: "Apple",
        nameUa: "Яблуко",
        ediblePortionPercent: "95",
        verificationStatus: "UNVERIFIED",
        characteristicIds: [characteristicId],
      }),
    );
    expect(mapProductFormToCreate(values)).not.toHaveProperty("brandId");
  });

  it("requires only a brand among branded-specific fields", () => {
    const result = productFormSchema.safeParse({
      ...EMPTY_PRODUCT_FORM,
      type: "BRANDED",
      nameEn: "Brand Apple",
      categoryId,
      defaultMeasurementUnitId: unitId,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toContain("brandId");
    }
  });

  it("maps optional base product and GTIN to null", () => {
    const values = {
      ...EMPTY_PRODUCT_FORM,
      type: "BRANDED" as const,
      nameEn: "Brand Apple",
      categoryId,
      defaultMeasurementUnitId: unitId,
      brandId,
    };

    expect(productFormSchema.safeParse(values).success).toBe(true);
    expect(mapProductFormToCreate(values)).toMatchObject({
      type: "BRANDED",
      brandId,
      baseProductId: null,
      gtin: null,
    });
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
      verificationStatus: "VERIFIED",
    });

    expect(update).not.toHaveProperty("type");
    expect(update).not.toHaveProperty("baseProductId");
    expect(update).not.toHaveProperty("gtin");
    expect(update).toMatchObject({ brandId, verificationStatus: "VERIFIED", packages: [] });
  });

  it("maps canonical package fields into the branded update payload", () => {
    const update = mapProductFormToUpdate({
      ...EMPTY_PRODUCT_FORM,
      type: "BRANDED",
      nameEn: "Brand Apple",
      categoryId,
      defaultMeasurementUnitId: unitId,
      brandId,
      packages: [
        {
          id: "74b79ffc-e6af-440c-ae38-8cd37c22be1c",
          gtin: "4821234567890",
          kind: "FIXED_MASS",
          weightG: "120",
          volumeMl: "",
          itemCount: "",
          labelUa: "120 г",
          labelEn: "",
          isDefault: true,
          status: "ACTIVE",
        },
      ],
    });

    expect(update.packages).toEqual([
      expect.objectContaining({
        gtin: "4821234567890",
        kind: "FIXED_MASS",
        weightG: "120",
        volumeMl: null,
        itemCount: null,
        isDefault: true,
      }),
    ]);
  });
});
