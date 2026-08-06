import { describe, expect, it } from "vitest";

import { sanitizeReturnTo } from "./safe-return-to";

describe("admin sanitizeReturnTo", () => {
  it.each([
    ["/products?page=2", "/products?page=2"],
    ["https://attacker.example", "/"],
    ["//attacker.example", "/"],
    ["/\\attacker.example", "/"],
    ["data:text/html,unsafe", "/"],
    [null, "/"],
  ])("rejects unsafe return target %s", (value, expected) => {
    expect(sanitizeReturnTo(value)).toBe(expected);
  });
});
