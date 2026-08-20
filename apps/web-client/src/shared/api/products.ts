import { getBrowserApiClient } from "./browser-api-client";

export type ProductSearchItemType = "GENERIC" | "BRANDED";

export interface ProductSearchItem {
  readonly id: string;
  readonly name: string;
  readonly type: ProductSearchItemType;
  readonly categoryName: string;
  readonly brandName: string | null;
}

export interface ProductSearchPage {
  readonly items: readonly ProductSearchItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface ProductSearchParameters {
  readonly search: string;
  readonly page: number;
  readonly pageSize?: number;
}

interface ProductSearchResponse {
  readonly data: {
    readonly items: readonly ProductSearchItem[];
  };

  readonly meta: {
    readonly page: number;
    readonly pageSize: number;
    readonly total: number;
  };
}

export async function searchProducts(
  parameters: ProductSearchParameters,
): Promise<ProductSearchPage> {
  const query = new URLSearchParams({
    search: parameters.search,
    page: String(parameters.page),
    pageSize: String(parameters.pageSize ?? 20),
  });

  const response = await getBrowserApiClient().get<ProductSearchResponse>(
    `/api/v1/products/search?${query.toString()}`,
  );

  return {
    items: response.data.items,
    page: response.meta.page,
    pageSize: response.meta.pageSize,
    total: response.meta.total,
  };
}
