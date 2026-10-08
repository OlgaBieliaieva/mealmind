import type { ProductImportCandidateDetails } from "./product-import-review-repository.js";

export type ProductImportResolutionMode = "CREATE_NEW_PRODUCT" | "ADD_PACKAGE_TO_EXISTING_PRODUCT";

export interface ProductImportPublicationDraft {
  readonly mode: ProductImportResolutionMode;
  readonly targetProductId: string | null;
  readonly nameEn: string;
  readonly nameUa: string | null;
  readonly categoryId: string | null;
  readonly brandId: string | null;
  readonly defaultMeasurementUnitId: string | null;
  readonly baseProductId: string | null;
  readonly description: string | null;
  readonly gtin: string | null;
  readonly package: {
    readonly kind:
      "UNSPECIFIED" | "FIXED_MASS" | "FIXED_VOLUME" | "FIXED_MASS_AND_VOLUME" | "FIXED_COUNT";
    readonly weightG: number | null;
    readonly volumeMl: number | null;
    readonly itemCount: number | null;
  };
  readonly ingredients: readonly string[];
  readonly nutrients: readonly {
    readonly code: "energy_kcal" | "protein" | "total_fat" | "carbohydrate";
    readonly valuePer100g: number;
  }[];
  readonly shelfLife: {
    readonly raw: string | null;
    readonly durationValue: number | null;
    readonly durationUnit: "HOURS" | "DAYS" | "MONTHS" | "YEARS" | null;
  };
  readonly temperatureRange: {
    readonly raw: string | null;
    readonly minC: number | null;
    readonly maxC: number | null;
  };
  readonly webUrl: string | null;
  readonly sourceImageUrl: string | null;
  readonly rawProducerName: string | null;
  readonly inStock: boolean | null;
}

export interface PublishProductImportCandidateInput {
  readonly candidate: ProductImportCandidateDetails;
  readonly publication: ProductImportPublicationDraft;
  readonly expectedUpdatedAt: string;
  readonly actorUserId: string;
}

export interface ProductImportPublisher {
  publish(input: PublishProductImportCandidateInput): Promise<boolean>;
}
