import { Prisma } from "@mealmind/db";
import { describe, expect, it } from "vitest";

import { mergeEffectiveProductNutrients } from "./effective-product-nutrients.js";

describe("effective product nutrients", () => {
  it("uses own values before missing values inherited from the base product", () => {
    const result = mergeEffectiveProductNutrients(
      [{ id: "branded", baseProductId: "generic" }],
      [
        {
          productId: "generic",
          nutrientId: "protein",
          valuePer100g: new Prisma.Decimal(3),
          valueType: "ANALYTICAL",
          nutrient: { id: "protein", code: "protein", nameUa: "Білки", group: "MACRONUTRIENT", unit: "G", sortOrder: 20 },
        },
        {
          productId: "generic",
          nutrientId: "fat",
          valuePer100g: new Prisma.Decimal(2),
          valueType: "ANALYTICAL",
          nutrient: { id: "fat", code: "total_fat", nameUa: "Жири", group: "MACRONUTRIENT", unit: "G", sortOrder: 30 },
        },
        {
          productId: "branded",
          nutrientId: "protein",
          valuePer100g: new Prisma.Decimal(4),
          valueType: "LABEL",
          nutrient: { id: "protein", code: "protein", nameUa: "Білки", group: "MACRONUTRIENT", unit: "G", sortOrder: 20 },
        },
      ],
    );

    expect(result).toEqual([
      expect.objectContaining({
        productId: "branded",
        nutrientId: "protein",
        valueType: "LABEL",
        origin: "PRODUCT",
      }),
      expect.objectContaining({
        productId: "branded",
        nutrientId: "fat",
        valueType: "ESTIMATED",
        origin: "BASE_PRODUCT",
      }),
    ]);
  });

  it("does not inherit nutrients for a product without a base", () => {
    expect(
      mergeEffectiveProductNutrients(
        [{ id: "generic", baseProductId: null }],
        [
          {
            productId: "other",
            nutrientId: "protein",
            valuePer100g: new Prisma.Decimal(3),
            valueType: "ANALYTICAL",
            nutrient: { id: "protein", code: "protein", nameUa: "Білки", group: "MACRONUTRIENT", unit: "G", sortOrder: 20 },
          },
        ],
      ),
    ).toEqual([]);
  });
});
