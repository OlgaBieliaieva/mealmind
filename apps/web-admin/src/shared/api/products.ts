import type { ApiClient } from "./api-client";

export type ProductType = "GENERIC" | "BRANDED";
export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type ProductFoodState = "UNSPECIFIED" | "RAW" | "COOKED" | "PROCESSED" | "READY_TO_EAT";
export type ProductMediaKind =
  "PRODUCT" | "PACKAGING" | "INGREDIENTS_LABEL" | "NUTRITION_LABEL" | "BARCODE" | "OTHER";

export interface ProductNutrientWrite {
  readonly nutrientId: string;
  readonly valuePer100g: string;
  readonly valueType: string;
}

export interface ProductPortionWrite {
  readonly amount: string;
  readonly gramWeight: string;
  readonly labelEn: string;
  readonly labelUa?: string | null;
  readonly kind: string;
  readonly weightType: string;
  readonly measurementUnitId?: string | null;
  readonly isDefault: boolean;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

export interface ProductMedia {
  readonly id: string;
  readonly productId: string;
  readonly kind: ProductMediaKind;
  readonly status: "PENDING" | "ACTIVE" | "FAILED" | "ARCHIVED";
  readonly mimeType: string | null;
  readonly byteSize: string | null;
  readonly widthPx: number | null;
  readonly heightPx: number | null;
  readonly altTextUa: string | null;
  readonly altTextEn: string | null;
  readonly isPrimary: boolean;
  readonly url: string | null;
  readonly thumbnailUrl: string | null;
}

export interface ProductSummary {
  readonly id: string;
  readonly type: ProductType;
  readonly nameEn: string;
  readonly nameUa: string | null;
  readonly gtin: string | null;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly brandId: string | null;
  readonly brandName: string | null;
  readonly status: ProductStatus;
  readonly updatedAt: string;
  readonly primaryMedia: ProductMedia | null;
}

export interface ProductDetails extends Omit<ProductSummary, "primaryMedia"> {
  readonly defaultMeasurementUnitId: string;
  readonly defaultMeasurementUnitSymbol: string;
  readonly baseProductId: string | null;
  readonly baseProductName: string | null;
  readonly foodState: ProductFoodState;
  readonly ediblePortionPercent: string | null;
  readonly verificationStatus: "UNVERIFIED" | "VERIFIED" | "REJECTED";
  readonly notes: string | null;
  readonly archivedAt: string | null;
  readonly nutrients: readonly (ProductNutrientWrite & {
    readonly nutrientName: string;
    readonly unit: string;
  })[];
  readonly portions: readonly (ProductPortionWrite & { readonly id: string })[];
  readonly media: readonly ProductMedia[];
}

export interface ProductWrite {
  readonly type: ProductType;
  readonly nameEn: string;
  readonly nameUa?: string | null;
  readonly gtin?: string | null;
  readonly categoryId?: string;
  readonly brandId?: string | null;
  readonly defaultMeasurementUnitId?: string;
  readonly baseProductId?: string | null;
  readonly foodState?: ProductFoodState;
  readonly ediblePortionPercent?: string | null;
  readonly notes?: string | null;
  readonly nutrients?: readonly ProductNutrientWrite[];
  readonly portions?: readonly ProductPortionWrite[];
}

export type ProductUpdate = Omit<Partial<ProductWrite>, "type" | "baseProductId">;

export interface ProductListParameters {
  readonly search?: string;
  readonly type?: ProductType;
  readonly status?: ProductStatus;
  readonly categoryId?: string;
  readonly brandId?: string;
  readonly page?: number;
  readonly pageSize?: number;
}

interface ProductResponse<T> {
  readonly data: T;
}

export interface ProductPageResponse {
  readonly data: { readonly items: readonly ProductSummary[] };
  readonly meta: { readonly page: number; readonly pageSize: number; readonly total: number };
}

export function buildProductListPath(parameters: ProductListParameters): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return `/api/v1/admin/products${query.size === 0 ? "" : `?${query.toString()}`}`;
}

export function listProducts(apiClient: ApiClient, parameters: ProductListParameters) {
  return apiClient.get<ProductPageResponse>(buildProductListPath(parameters));
}

export function getProduct(apiClient: ApiClient, id: string) {
  return apiClient.get<ProductResponse<ProductDetails>>(
    `/api/v1/admin/products/${encodeURIComponent(id)}`,
  );
}

export function createProduct(apiClient: ApiClient, data: ProductWrite) {
  return apiClient.post<ProductResponse<ProductDetails>>("/api/v1/admin/products", data);
}

export function updateProduct(apiClient: ApiClient, id: string, data: ProductUpdate) {
  return apiClient.patch<ProductResponse<ProductDetails>>(
    `/api/v1/admin/products/${encodeURIComponent(id)}`,
    data,
  );
}

export function changeProductStatus(apiClient: ApiClient, id: string, status: ProductStatus) {
  return apiClient.patch<ProductResponse<ProductDetails>>(
    `/api/v1/admin/products/${encodeURIComponent(id)}/status`,
    { status },
  );
}

export function reserveProductMedia(
  apiClient: ApiClient,
  id: string,
  data: {
    readonly kind: ProductMediaKind;
    readonly mimeType: "image/jpeg" | "image/png" | "image/webp";
    readonly byteSize: number;
    readonly altTextUa?: string;
    readonly isPrimary: boolean;
  },
) {
  return apiClient.post<
    ProductResponse<{
      readonly media: { readonly id: string; readonly storageObjectPath: string };
      readonly uploadUrl: string;
      readonly token: string;
    }>
  >(`/api/v1/admin/products/${encodeURIComponent(id)}/media/uploads`, data);
}

export function completeProductMedia(apiClient: ApiClient, productId: string, mediaId: string) {
  return apiClient.post<ProductResponse<ProductMedia>>(
    `/api/v1/admin/products/${encodeURIComponent(productId)}/media/${encodeURIComponent(mediaId)}/complete`,
    {},
  );
}

export function deleteProductMedia(apiClient: ApiClient, productId: string, mediaId: string) {
  return apiClient.delete<void>(
    `/api/v1/admin/products/${encodeURIComponent(productId)}/media/${encodeURIComponent(mediaId)}`,
  );
}
