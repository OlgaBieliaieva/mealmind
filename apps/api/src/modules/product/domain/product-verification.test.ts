import { describe, expect, it } from "vitest";

import type { ProductDetails } from "./product-repository.js";
import { evaluateProductVerification } from "./product-verification.js";

function product(
  overrides: Partial<Parameters<typeof evaluateProductVerification>[0]> = {},
): Parameters<typeof evaluateProductVerification>[0] {
  const nutrient = (nutrientCode: string): ProductDetails["nutrients"][number] => ({
    nutrientId: `${nutrientCode}-id`,
    nutrientCode,
    nutrientName: nutrientCode,
    unit: nutrientCode === "energy_kcal" ? "KCAL" : "G",
    valuePer100g: "1",
    valueType: "ANALYTICAL",
    origin: "PRODUCT",
  });

  return {
    type: "GENERIC",
    nameUa: "Яблуко",
    brandId: null,
    foodState: "RAW",
    nutrients: [
      nutrient("energy_kcal"),
      nutrient("protein"),
      nutrient("total_fat"),
      nutrient("carbohydrate"),
    ],
    packages: [],
    portions: [],
    media: [],
    ...overrides,
  };
}

describe("product verification readiness", () => {
  it("allows a generic product with a specified state and core nutrients", () => {
    expect(evaluateProductVerification(product())).toEqual({
      status: "READY",
      blockingIssues: [],
      warnings: ["MISSING_PRIMARY_IMAGE", "MISSING_DEFAULT_PORTION"],
    });
  });

  it("reports every missing core nutrient and unspecified state", () => {
    expect(
      evaluateProductVerification(product({ nameUa: null, foodState: "UNSPECIFIED", nutrients: [] })),
    ).toMatchObject({
      status: "BLOCKED",
      blockingIssues: [
        "MISSING_UA_NAME",
        "UNSPECIFIED_FOOD_STATE",
        "MISSING_ENERGY",
        "MISSING_PROTEIN",
        "MISSING_TOTAL_FAT",
        "MISSING_CARBOHYDRATE",
      ],
    });
  });

  it("requires an identifiable fixed package for a branded product", () => {
    expect(
      evaluateProductVerification(
        product({
          type: "BRANDED",
          brandId: "brand-id",
          packages: [
            {
              id: "package-id",
              gtin: null,
              kind: "UNSPECIFIED",
              weightG: null,
              volumeMl: null,
              itemCount: null,
            labelUa: null,
            labelEn: null,
              isDefault: true,
              status: "ACTIVE",
            archivedAt: null,
            ingredientStatements: [],
            shelfLifeRules: [],
            },
          ],
        }),
      ),
    ).toMatchObject({
      status: "BLOCKED",
      blockingIssues: ["MISSING_PACKAGE_GTIN", "MISSING_PACKAGE_QUANTITY"],
    });
  });
});
