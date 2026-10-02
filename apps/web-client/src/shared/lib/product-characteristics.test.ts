import { describe, expect, it } from "vitest";

import {
  formatProductCharacteristicNames,
  formatProductCharacteristics,
} from "./product-characteristics";

describe("product characteristic subtitle", () => {
  it("formats the general state and kinds in the required order", () => {
    expect(
      formatProductCharacteristics("RAW", [
        { kind: "PROCESSING_METHOD", name: "Ферментований" },
        { kind: "COOKING_METHOD", name: "Варений" },
        { kind: "PRESERVATION_STATE", name: "Заморожений" },
      ]),
    ).toBe("Сирий, Заморожений, Варений, Ферментований");
  });

  it("uses already ordered search names and omits UNSPECIFIED", () => {
    expect(formatProductCharacteristicNames("UNSPECIFIED", ["Свіжий", "Сушений"])).toBe(
      "Свіжий, Сушений",
    );
  });
});
