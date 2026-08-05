import { describe, expect, it, vi } from "vitest";

import type { ApiClient } from "./api-client";
import { buildReferencePath, createReferenceData, updateReferenceData } from "./reference-data";

describe("admin reference API adapter", () => {
  it("builds an encoded admin path with inactive policy", () => {
    expect(
      buildReferencePath({
        resource: "brands",
        search: "Meal Mind",
        includeInactive: true,
      }),
    ).toBe("/api/v1/admin/reference/brands?search=Meal+Mind&includeInactive=true");
  });

  it("uses generic mutation paths for every reference resource", async () => {
    const apiClient = {
      post: vi.fn(async () => ({ data: { id: "created-id" } })),
      patch: vi.fn(async () => ({ data: { id: "updated-id" } })),
    } as unknown as ApiClient;

    await createReferenceData(apiClient, "recipe-types", {
      code: "test_type",
      nameUa: "Тип",
      nameEn: "Type",
      sortOrder: 10,
    });
    await updateReferenceData(apiClient, "allergens", "reference-id", {
      isActive: false,
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/v1/admin/reference/recipe-types",
      expect.objectContaining({ code: "test_type" }),
    );
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/admin/reference/allergens/reference-id", {
      isActive: false,
    });
  });
});
