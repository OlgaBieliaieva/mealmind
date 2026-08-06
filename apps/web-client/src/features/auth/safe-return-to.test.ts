import { describe, expect, it } from "vitest";

import { sanitizeReturnTo } from "./safe-return-to";

describe("sanitizeReturnTo", () => {
  it.each([
    ["/", "/"],
    ["/recipes?page=2#results", "/recipes?page=2#results"],
    ["https://attacker.example", "/"],
    ["//attacker.example/path", "/"],
    ["/\\attacker.example", "/"],
    ["javascript:alert(1)", "/"],
    ["/path\u0000hidden", "/"],
    [undefined, "/"],
  ])("maps %s to a safe application path", (value, expected) => {
    expect(sanitizeReturnTo(value)).toBe(expected);
  });
});
