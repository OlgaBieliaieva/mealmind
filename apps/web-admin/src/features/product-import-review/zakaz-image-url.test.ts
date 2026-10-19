import { describe, expect, it } from "vitest";

import { safeZakazImageUrl } from "./zakaz-image-url";

describe("safeZakazImageUrl", () => {
  it("returns a normalized Zakaz CDN image URL", () => {
    expect(safeZakazImageUrl(" HTTPS://IMG2.ZAKAZ.UA/products/Молоко 2.5.jpg ")).toBe(
      "https://img2.zakaz.ua/products/%D0%9C%D0%BE%D0%BB%D0%BE%D0%BA%D0%BE%202.5.jpg",
    );
  });

  it.each([
    "javascript:alert(1)",
    "data:image/svg+xml,<svg onload=alert(1)>",
    "http://img2.zakaz.ua/product.jpg",
    "https://zakaz.ua/product.jpg",
    "https://img2.zakaz.ua.evil.example/product.jpg",
    "https://user:password@img2.zakaz.ua/product.jpg",
    "https://img2.zakaz.ua:8443/product.jpg",
    "https://img2.zakaz.ua/product.jpg?redirect=https://evil.example",
    "https://img2.zakaz.ua/product.jpg#fragment",
    "https://img2.zakaz.ua/%invalid",
  ])("rejects an unsafe image URL: %s", (value) => {
    expect(safeZakazImageUrl(value)).toBeNull();
  });

  it.each([null, undefined, "", "   "])("rejects an empty image URL: %s", (value) => {
    expect(safeZakazImageUrl(value)).toBeNull();
  });
});
