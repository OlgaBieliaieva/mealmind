import { describe, expect, it, vi } from "vitest";

import type { ApiClient } from "./api-client";
import { buildProductListPath, listProducts } from "./products";

describe("products API contract", () => {
  it("builds stable server-side filter and pagination parameters", () => {
    expect(
      buildProductListPath({
        search: "apple",
        type: "GENERIC",
        status: "ACTIVE",
        page: 2,
        pageSize: 20,
      }),
    ).toBe("/api/v1/admin/products?search=apple&type=GENERIC&status=ACTIVE&page=2&pageSize=20");
  });

  it("delegates product listing to the authenticated API client", async () => {
    const response = { data: { items: [] }, meta: { page: 1, pageSize: 20, total: 0 } };
    const get = vi.fn(async () => response);
    const apiClient = { get } as unknown as ApiClient;

    await expect(listProducts(apiClient, { page: 1, pageSize: 20 })).resolves.toBe(response);
    expect(get).toHaveBeenCalledWith("/api/v1/admin/products?page=1&pageSize=20");
  });
});
