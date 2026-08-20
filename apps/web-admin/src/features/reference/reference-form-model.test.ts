import { describe, expect, it } from "vitest";

import { REFERENCE_CONFIGS } from "./reference-config";
import {
  initialReferenceValues,
  toReferenceWriteData,
  validateReferenceValues,
} from "./reference-form-model";

describe("reference form model", () => {
  it("normalizes nullable, numeric and country fields for create", () => {
    const config = REFERENCE_CONFIGS.brands;
    const values = {
      ...initialReferenceValues(config),
      name: "  MealMind Foods  ",
      countryCode: "ua",
      websiteUrl: "",
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
    };

    expect(validateReferenceValues(config, values, "create")).toEqual({});
    expect(toReferenceWriteData(config, values, "create")).toMatchObject({
      name: "MealMind Foods",
      countryCode: "UA",
      websiteUrl: null,
      status: "ACTIVE",
    });
  });

  it("keeps seeded codes immutable during edit", () => {
    const config = REFERENCE_CONFIGS["recipe-types"];
    const values = initialReferenceValues(config, {
      id: "type-id",
      code: "breakfast",
      nameUa: "Сніданок",
      nameEn: "Breakfast",
      isActive: true,
      sortOrder: 10,
    });
    values.code = "changed_code";
    values.nameUa = "Ранковий рецепт";

    const payload = toReferenceWriteData(config, values, "edit");
    expect(payload).not.toHaveProperty("code");
    expect(payload).toMatchObject({ nameUa: "Ранковий рецепт", sortOrder: 10 });
  });

  it("returns field-level errors for unsafe identifiers and values", () => {
    const config = REFERENCE_CONFIGS["measurement-units"];
    const values = {
      ...initialReferenceValues(config),
      code: "Invalid Code",
      symbol: "x",
      nameUa: "Одиниця",
      nameEn: "Unit",
      dimension: "MASS",
      factorToBaseUnit: "0",
      sortOrder: "-1",
    };

    expect(validateReferenceValues(config, values, "create")).toMatchObject({
      code: expect.any(String),
      factorToBaseUnit: expect.any(String),
      sortOrder: expect.any(String),
    });
  });
});
