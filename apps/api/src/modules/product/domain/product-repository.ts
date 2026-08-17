export const PRODUCT_TYPES = ["GENERIC", "BRANDED"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_FOOD_STATES = [
  "UNSPECIFIED",
  "RAW",
  "COOKED",
  "PROCESSED",
  "READY_TO_EAT",
] as const;
export type ProductFoodState = (typeof PRODUCT_FOOD_STATES)[number];

export const NUTRIENT_VALUE_TYPES = [
  "ANALYTICAL",
  "DERIVED",
  "ESTIMATED",
  "CALCULATED",
  "LABEL",
  "UNKNOWN",
] as const;
export type NutrientValueType = (typeof NUTRIENT_VALUE_TYPES)[number];

export interface ProductNutrientWrite {
  readonly nutrientId: string;
  readonly valuePer100g: string;
  readonly valueType: NutrientValueType;
}

export interface ProductPortionWrite {
  readonly amount: string;
  readonly gramWeight: string;
  readonly labelEn: string;
  readonly labelUa?: string | null | undefined;
  readonly kind: "MASS" | "VOLUME" | "COUNT" | "HOUSEHOLD" | "PACKAGE" | "SERVING" | "OTHER";
  readonly weightType: "MEASURED" | "CALCULATED" | "ESTIMATED" | "LABEL" | "UNKNOWN";
  readonly measurementUnitId?: string | null | undefined;
  readonly isDefault: boolean;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

export interface ProductWrite {
  readonly type: ProductType;
  readonly nameEn: string;
  readonly nameUa?: string | null | undefined;
  readonly gtin?: string | null | undefined;
  readonly categoryId: string;
  readonly brandId?: string | null | undefined;
  readonly defaultMeasurementUnitId: string;
  readonly baseProductId?: string | null | undefined;
  readonly foodState: ProductFoodState;
  readonly ediblePortionPercent?: string | null | undefined;
  readonly status: ProductStatus;
  readonly notes?: string | null | undefined;
  readonly nutrients: readonly ProductNutrientWrite[];
  readonly portions: readonly ProductPortionWrite[];
}

export interface ProductUpdate {
  readonly nameEn?: string | undefined;
  readonly nameUa?: string | null | undefined;
  readonly gtin?: string | undefined;
  readonly categoryId?: string | undefined;
  readonly brandId?: string | undefined;
  readonly defaultMeasurementUnitId?: string | undefined;
  readonly foodState?: ProductFoodState | undefined;
  readonly ediblePortionPercent?: string | null | undefined;
  readonly notes?: string | null | undefined;
  readonly nutrients?: readonly ProductNutrientWrite[] | undefined;
  readonly portions?: readonly ProductPortionWrite[] | undefined;
}

export interface ProductMediaRecord {
  readonly id: string;
  readonly productId: string;
  readonly kind: ProductMediaKind;
  readonly status: ProductMediaStatus;
  readonly storageObjectPath: string;
  readonly mimeType: string | null;
  readonly byteSize: string | null;
  readonly widthPx: number | null;
  readonly heightPx: number | null;
  readonly checksumSha256: string | null;
  readonly altTextUa: string | null;
  readonly altTextEn: string | null;
  readonly isPrimary: boolean;
  readonly sortOrder: number;
  readonly createdAt: string;
}

export const PRODUCT_MEDIA_KINDS = [
  "PRODUCT",
  "PACKAGING",
  "INGREDIENTS_LABEL",
  "NUTRITION_LABEL",
  "BARCODE",
  "OTHER",
] as const;
export type ProductMediaKind = (typeof PRODUCT_MEDIA_KINDS)[number];
export type ProductMediaStatus = "PENDING" | "ACTIVE" | "FAILED" | "ARCHIVED";

export interface ProductDetails {
  readonly id: string;
  readonly type: ProductType;
  readonly nameEn: string;
  readonly nameUa: string | null;
  readonly gtin: string | null;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly brandId: string | null;
  readonly brandName: string | null;
  readonly defaultMeasurementUnitId: string;
  readonly defaultMeasurementUnitSymbol: string;
  readonly baseProductId: string | null;
  readonly baseProductName: string | null;
  readonly foodState: ProductFoodState;
  readonly ediblePortionPercent: string | null;
  readonly status: ProductStatus;
  readonly verificationStatus: "UNVERIFIED" | "VERIFIED" | "REJECTED";
  readonly notes: string | null;
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly nutrients: readonly (ProductNutrientWrite & {
    readonly nutrientName: string;
    readonly unit: string;
  })[];
  readonly portions: readonly (ProductPortionWrite & { readonly id: string })[];
  readonly media: readonly ProductMediaRecord[];
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
  readonly primaryMedia: ProductMediaRecord | null;
}

export interface ProductListQuery {
  readonly search?: string | undefined;
  readonly type?: ProductType | undefined;
  readonly status?: ProductStatus | undefined;
  readonly categoryId?: string | undefined;
  readonly brandId?: string | undefined;
  readonly page: number;
  readonly pageSize: number;
}

export interface ProductPage {
  readonly items: readonly ProductSummary[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface ProductSearchQuery {
  readonly search: string;
  readonly page: number;
  readonly pageSize: number;
}

export interface ProductSearchItem {
  readonly id: string;
  readonly name: string;
  readonly type: ProductType;
  readonly categoryName: string;
  readonly brandName: string | null;
}

export interface ProductSearchPage {
  readonly items: readonly ProductSearchItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface CreatePendingMediaInput {
  readonly id: string;
  readonly productId: string;
  readonly kind: ProductMediaKind;
  readonly storageObjectPath: string;
  readonly mimeType: string;
  readonly byteSize: number;
  readonly altTextUa?: string | null | undefined;
  readonly altTextEn?: string | null | undefined;
  readonly isPrimary: boolean;
  readonly uploadedByUserId: string;
}

export interface ActivateMediaInput {
  readonly widthPx: number;
  readonly heightPx: number;
  readonly checksumSha256: string;
}

export interface ProductRepository {
  list(query: ProductListQuery): Promise<ProductPage>;
  searchActive(query: ProductSearchQuery): Promise<ProductSearchPage>;
  findById(id: string): Promise<ProductDetails | null>;
  create(data: ProductWrite): Promise<ProductDetails>;
  update(id: string, data: ProductUpdate): Promise<ProductDetails | null>;
  updateStatus(id: string, status: ProductStatus): Promise<ProductDetails | null>;
  createPendingMedia(data: CreatePendingMediaInput): Promise<ProductMediaRecord>;
  findMedia(id: string): Promise<ProductMediaRecord | null>;
  activateMedia(id: string, data: ActivateMediaInput): Promise<ProductMediaRecord | null>;
  markMediaFailed(id: string): Promise<void>;
  archiveMedia(id: string): Promise<void>;
  listStaleMedia(olderThan: Date): Promise<readonly ProductMediaRecord[]>;
}
