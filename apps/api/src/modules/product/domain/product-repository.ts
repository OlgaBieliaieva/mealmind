import type { ProductVerificationReadiness } from "./product-verification.js";

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

export type ProductFoodCharacteristicKind =
  "PRESERVATION_STATE" | "COOKING_METHOD" | "PROCESSING_METHOD";

export interface ProductFoodCharacteristicRecord {
  readonly id: string;
  readonly code: string;
  readonly kind: ProductFoodCharacteristicKind;
  readonly nameUa: string;
  readonly nameEn: string;
  readonly source: "MANUAL" | "SOURCE_IMPORT" | "RULE_BASED";
  readonly confidence: "UNSPECIFIED" | "LOW" | "MEDIUM" | "HIGH";
}

export const NUTRIENT_VALUE_TYPES = [
  "ANALYTICAL",
  "DERIVED",
  "ESTIMATED",
  "CALCULATED",
  "LABEL",
  "UNKNOWN",
] as const;
export type NutrientValueType = (typeof NUTRIENT_VALUE_TYPES)[number];

export const PRODUCT_SOURCE_PROVIDERS = [
  "USDA",
  "ZAKAZ",
  "MEALMIND_ADMIN",
  "MEALMIND_USER",
] as const;
export type ProductSourceProvider = (typeof PRODUCT_SOURCE_PROVIDERS)[number];

export const PRODUCT_SOURCE_DATASETS = [
  "FOUNDATION_FOOD",
  "SR_LEGACY",
  "ZAKAZ_RETAIL_CATALOG",
  "ADMIN_CATALOG",
  "USER_CATALOG",
] as const;
export type ProductSourceDataset = (typeof PRODUCT_SOURCE_DATASETS)[number];

export interface ProductSourceWrite {
  readonly provider: ProductSourceProvider;
  readonly dataset: ProductSourceDataset;
  readonly sourceRelease: Date;
}

export interface ProductNutrientWrite {
  readonly nutrientId: string;
  readonly valuePer100g: string;
  readonly valueType: NutrientValueType;
}

export interface ProductNutrientRecord extends ProductNutrientWrite {
  readonly nutrientCode: string;
  readonly nutrientName: string;
  readonly unit: string;
  readonly origin: "PRODUCT" | "BASE_PRODUCT";
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
  readonly characteristicIds?: readonly string[] | undefined;
  readonly ediblePortionPercent?: string | null | undefined;
  readonly status: ProductStatus;
  readonly verificationStatus?: "UNVERIFIED" | "VERIFIED" | "REJECTED" | undefined;
  readonly notes?: string | null | undefined;
  readonly nutrients: readonly ProductNutrientWrite[];
  readonly portions: readonly ProductPortionWrite[];
  readonly source: ProductSourceWrite;
}

export interface ProductUpdate {
  readonly nameEn?: string | undefined;
  readonly nameUa?: string | null | undefined;
  readonly gtin?: string | null | undefined;
  readonly categoryId?: string | undefined;
  readonly brandId?: string | undefined;
  readonly defaultMeasurementUnitId?: string | undefined;
  readonly foodState?: ProductFoodState | undefined;
  readonly characteristicIds?: readonly string[] | undefined;
  readonly ediblePortionPercent?: string | null | undefined;
  readonly notes?: string | null | undefined;
  readonly verificationStatus?: "UNVERIFIED" | "VERIFIED" | "REJECTED" | undefined;
  readonly verifiedByUserId?: string | null | undefined;
  readonly verifiedAt?: Date | null | undefined;
  readonly nutrients?: readonly ProductNutrientWrite[] | undefined;
  readonly portions?: readonly ProductPortionWrite[] | undefined;
  readonly packages?: readonly ProductPackageWrite[] | undefined;
  readonly dietaryTags?: readonly ProductDietaryTagWrite[] | undefined;
  readonly allergens?: readonly ProductAllergenWrite[] | undefined;
  readonly attributeActorUserId?: string | undefined;
}

export interface ProductDietaryTagWrite {
  readonly dietaryTagId: string;
  readonly evidenceNote: string | null;
}

export interface ProductAllergenWrite {
  readonly allergenId: string;
  readonly declaration: "CONTAINS" | "MAY_CONTAIN" | "SHARED_FACILITY";
  readonly evidenceNote: string | null;
}

export interface ProductDietaryTagRecord extends ProductDietaryTagWrite {
  readonly code: string;
  readonly nameUa: string;
  readonly status: "PROPOSED" | "VERIFIED" | "STALE";
  readonly method: "MANUAL_REVIEW" | "DETERMINISTIC_RULE" | "SOURCE_EVIDENCE";
  readonly verifiedAt: string | null;
}

export interface ProductAllergenRecord extends ProductAllergenWrite {
  readonly code: string;
  readonly nameUa: string;
  readonly status: "PROPOSED" | "VERIFIED" | "STALE";
  readonly method: "MANUAL_REVIEW" | "DETERMINISTIC_RULE" | "SOURCE_EVIDENCE";
  readonly verifiedAt: string | null;
}

export interface ProductPackageWrite {
  readonly id?: string | undefined;
  readonly gtin: string | null;
  readonly kind: ProductPackageRecord["kind"];
  readonly weightG: string | null;
  readonly volumeMl: string | null;
  readonly itemCount: number | null;
  readonly labelUa: string | null;
  readonly labelEn: string | null;
  readonly isDefault: boolean;
  readonly status: ProductPackageRecord["status"];
  readonly ingredientStatements?: readonly ProductIngredientStatementWrite[] | undefined;
  readonly shelfLifeRules?: readonly ProductShelfLifeRuleWrite[] | undefined;
}

export interface ProductIngredientStatementWrite {
  readonly locale: string;
  readonly statement: string;
}

export interface ProductShelfLifeRuleWrite {
  readonly rawShelfLife: string | null;
  readonly rawTemperatureRange: string | null;
  readonly durationValue: string | null;
  readonly durationUnit: "HOURS" | "DAYS" | "MONTHS" | "YEARS" | null;
  readonly minTemperatureC: string | null;
  readonly maxTemperatureC: string | null;
  readonly sortOrder: number;
}

export interface ProductPackageRecord {
  readonly id: string;
  readonly gtin: string | null;
  readonly kind:
    | "UNSPECIFIED"
    | "FIXED_MASS"
    | "FIXED_VOLUME"
    | "FIXED_MASS_AND_VOLUME"
    | "FIXED_COUNT";
  readonly weightG: string | null;
  readonly volumeMl: string | null;
  readonly itemCount: number | null;
  readonly labelUa: string | null;
  readonly labelEn: string | null;
  readonly isDefault: boolean;
  readonly status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  readonly archivedAt: string | null;
  readonly ingredientStatements: readonly (ProductIngredientStatementWrite & {
    readonly id: string;
    readonly isPrimary: boolean;
    readonly source: "MANUAL" | "SOURCE";
  })[];
  readonly shelfLifeRules: readonly (ProductShelfLifeRuleWrite & {
    readonly id: string;
    readonly source: "MANUAL" | "SOURCE";
  })[];
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
  readonly sourceProvider: ProductSourceProvider | null;
  readonly sourceDataset: ProductSourceDataset | null;
  readonly foodState: ProductFoodState;
  readonly foodCharacteristics: readonly ProductFoodCharacteristicRecord[];
  readonly ediblePortionPercent: string | null;
  readonly status: ProductStatus;
  readonly verificationStatus: "UNVERIFIED" | "VERIFIED" | "REJECTED";
  readonly verifiedByUserId: string | null;
  readonly verifiedAt: string | null;
  readonly notes: string | null;
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly nutrients: readonly ProductNutrientRecord[];
  readonly ownNutrients: readonly ProductNutrientRecord[];
  readonly portions: readonly (ProductPortionWrite & { readonly id: string })[];
  readonly packages: readonly ProductPackageRecord[];
  readonly dietaryTags: readonly ProductDietaryTagRecord[];
  readonly allergens: readonly ProductAllergenRecord[];
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
  readonly sourceProvider: ProductSourceProvider | null;
  readonly sourceDataset: ProductSourceDataset | null;
  readonly foodState: ProductFoodState;
  readonly foodCharacteristics: readonly ProductFoodCharacteristicRecord[];
  readonly status: ProductStatus;
  readonly verificationStatus: "UNVERIFIED" | "VERIFIED" | "REJECTED";
  readonly verifiedByUserId: string | null;
  readonly verifiedAt: string | null;
  readonly verificationReadiness: ProductVerificationReadiness;
  readonly updatedAt: string;
  readonly primaryMedia: ProductMediaRecord | null;
}

export interface ProductListQuery {
  readonly search?: string | undefined;
  readonly type?: ProductType | undefined;
  readonly status?: ProductStatus | undefined;
  readonly verificationStatus?: "UNVERIFIED" | "VERIFIED" | "REJECTED" | undefined;
  readonly foodState?: ProductFoodState | undefined;
  readonly sourceProvider?: ProductSourceProvider | "UNASSIGNED" | undefined;
  readonly createdFrom?: string | undefined;
  readonly includeArchived?: boolean | undefined;
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
  readonly foodState: ProductFoodState;
  readonly foodCharacteristics: readonly ProductFoodCharacteristicRecord[];
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
  findNutrientCodes(ids: readonly string[]): Promise<ReadonlyMap<string, string>>;
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
