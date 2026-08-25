import { describe, expect, it } from "vitest";

import { getCategoryEmoji } from "./category-emoji";

describe("category emoji placeholder", () => {
  it("supports exact categories, subcategories and a stable fallback", () => {
    expect(getCategoryEmoji("fruits")).toBe("🍎");
    expect(getCategoryEmoji("fresh-seafood-products")).toBe("🦐");
    expect(getCategoryEmoji("unknown-category")).toBe("🍽️");
    expect(getCategoryEmoji(null)).toBe("🍽️");
  });
});
