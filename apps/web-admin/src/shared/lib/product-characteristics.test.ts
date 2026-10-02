import { describe, expect, it } from "vitest";

import { formatProductCharacteristics } from "./product-characteristics";

describe("formatProductCharacteristics", () => {
  it("formats the general state first and characteristic kinds in the catalog order", () => {
    expect(
      formatProductCharacteristics("COOKED", [
        { kind: "PROCESSING_METHOD", nameUa: "Маринований" },
        { kind: "COOKING_METHOD", nameUa: "Грильований" },
        { kind: "PRESERVATION_STATE", nameUa: "Охолоджений" },
      ]),
    ).toBe("Приготований, Охолоджений, Грильований, Маринований");
  });

  it("omits an unspecified general state", () => {
    expect(
      formatProductCharacteristics("UNSPECIFIED", [
        { kind: "PRESERVATION_STATE", nameUa: "Свіжий" },
      ]),
    ).toBe("Свіжий");
  });
});
