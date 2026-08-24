import { describe, expect, it, vi } from "vitest";

import type { ApiClient } from "./api-client";
import { buildProductListPath, listProducts, searchProducts } from "./products";

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

  it("encodes a lightweight active product search", async () => {
    const response = { data: { items: [] }, meta: { page: 1, pageSize: 20, total: 0 } };
    const get = vi.fn(async () => response);
    const apiClient = { get } as unknown as ApiClient;

    await expect(searchProducts(apiClient, "яблуко & груша")).resolves.toBe(response);
    expect(get).toHaveBeenCalledWith(
      "/api/v1/products/search?search=%D1%8F%D0%B1%D0%BB%D1%83%D0%BA%D0%BE+%26+%D0%B3%D1%80%D1%83%D1%88%D0%B0&page=1&pageSize=20",
    );
  });
});
