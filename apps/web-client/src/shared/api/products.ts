import { getBrowserApiClient } from "./browser-api-client";

export type ProductSearchItemType = "GENERIC" | "BRANDED";
export type ProductFoodState = "UNSPECIFIED" | "RAW" | "COOKED" | "PROCESSED" | "READY_TO_EAT";
export type ProductFoodCharacteristicKind =
  "PRESERVATION_STATE" | "COOKING_METHOD" | "PROCESSING_METHOD";

export interface ProductFoodCharacteristic {
  readonly id: string;
  readonly code: string;
  readonly kind: ProductFoodCharacteristicKind;
  readonly nameUa: string;
  readonly nameEn: string;
  readonly source: "MANUAL" | "SOURCE_IMPORT" | "RULE_BASED";
  readonly confidence: "UNSPECIFIED" | "LOW" | "MEDIUM" | "HIGH";
}

export interface ProductSearchItem {
  readonly id: string;
  readonly name: string;
  readonly type: ProductSearchItemType;
  readonly categoryName: string;
  readonly brandName: string | null;
  readonly foodState: ProductFoodState;
  readonly foodCharacteristics: readonly ProductFoodCharacteristic[];
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
