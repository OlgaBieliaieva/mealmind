import { describe, expect, it } from "vitest";

import { createReferenceSchema, updateReferenceSchema } from "./reference-write-schema.js";

function createAuthor(body: Record<string, unknown>) {
  return createReferenceSchema.safeParse({
    params: { resource: "authors" },
    query: {},
    body,
  });
}

describe("reference author write schema", () => {
  it("accepts an expert only with an expertise area", () => {
    expect(
      createAuthor({
        type: "EXPERT",
        expertiseArea: "DIETITIAN",
        slug: "verified-expert",
        displayName: "Перевірений експерт",
        isActive: true,
      }).success,
    ).toBe(true);

    expect(
      createAuthor({
        type: "EXPERT",
        slug: "missing-expertise",
        displayName: "Експерт без спеціалізації",
        isActive: true,
      }).success,
    ).toBe(false);
  });

  it("rejects incompatible and account-linked author shapes", () => {
    expect(
      createAuthor({
        type: "BLOGGER",
        expertiseArea: "CHEF",
        slug: "blogger",
        displayName: "Блогер",
        isActive: true,
      }).success,
    ).toBe(false);

    expect(
      createAuthor({
        type: "USER",
        slug: "user-author",
        displayName: "Користувач",
        isActive: true,
      }).success,
    ).toBe(false);
  });

  it("does not allow changing an author type", () => {
    const result = updateReferenceSchema.safeParse({
      params: {
        resource: "authors",
        id: "d0b29d99-d169-467c-98d3-6d0e05771343",
      },
      query: {},
      body: { type: "BLOGGER" },
    });

    expect(result.success).toBe(false);
  });

  it("accepts safe social links and rejects unsupported protocols", () => {
    expect(
      createAuthor({
        type: "BLOGGER",
        slug: "food-author",
        displayName: "Автор",
        instagramUrl: "https://instagram.com/author",
        websiteUrl: "https://example.com",
        isActive: true,
      }).success,
    ).toBe(true);
    expect(
      createAuthor({
        type: "BLOGGER",
        slug: "unsafe-author",
        displayName: "Автор",
        websiteUrl: "javascript:alert(1)",
        isActive: true,
      }).success,
    ).toBe(false);
  });
});
