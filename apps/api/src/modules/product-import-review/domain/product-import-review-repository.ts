export const PRODUCT_IMPORT_CANDIDATE_DISPOSITIONS = [
  "CANDIDATE",
  "REVIEW_REQUIRED",
  "REJECTED",
] as const;
export type ProductImportCandidateDisposition =
  (typeof PRODUCT_IMPORT_CANDIDATE_DISPOSITIONS)[number];

export const PRODUCT_IMPORT_CANDIDATE_STATUSES = [
  "PENDING",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "DEFERRED",
  "PUBLISHED",
] as const;
export type ProductImportCandidateStatus = (typeof PRODUCT_IMPORT_CANDIDATE_STATUSES)[number];

export const PRODUCT_IMPORT_PACKAGE_KINDS = [
  "UNSPECIFIED",
  "FIXED_MASS",
  "FIXED_VOLUME",
  "FIXED_COUNT",
  "FIXED_MASS_AND_VOLUME",
] as const;
export type ProductImportPackageKind = (typeof PRODUCT_IMPORT_PACKAGE_KINDS)[number];

export const PRODUCT_IMPORT_REVIEW_DECISIONS = ["APPROVE", "REJECT", "DEFER"] as const;
export type ProductImportReviewDecision = (typeof PRODUCT_IMPORT_REVIEW_DECISIONS)[number];

export type JsonValue =
  string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type JsonObject = { readonly [key: string]: JsonValue };

export interface ProductImportCandidateListQuery {
  readonly search?: string | undefined;
  readonly brandName?: string | undefined;
  readonly packageKind?: ProductImportPackageKind | undefined;
  readonly batchId?: string | undefined;
  readonly disposition?: ProductImportCandidateDisposition | undefined;
  readonly status?: ProductImportCandidateStatus | undefined;
  readonly matchStatus?: string | undefined;
  readonly reasonCode?: string | undefined;
  readonly reviewedByUserId?: string | undefined;
  readonly page: number;
  readonly pageSize: number;
}

export interface ProductImportCandidateSummary {
  readonly id: string;
  readonly batchId: string;
  readonly storeExternalId: string;
  readonly sourceSku: string;
  readonly disposition: ProductImportCandidateDisposition;
  readonly status: ProductImportCandidateStatus;
  readonly reasonCodes: readonly string[];
  readonly matchStatus: string;
  readonly normalizedGtin: string | null;
  readonly title: string | null;
  readonly brandName: string | null;
  readonly packageKind: ProductImportPackageKind | null;
  readonly packageWeightG: number | null;
  readonly packageVolumeMl: number | null;
  readonly packageItemCount: number | null;
  readonly sourceImageUrl: string | null;
  readonly reviewedByUserId: string | null;
  readonly reviewedByEmail: string | null;
  readonly reviewedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProductImportCandidatePage {
  readonly items: readonly ProductImportCandidateSummary[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface ProductImportCandidateEvent {
  readonly id: string;
  readonly action:
    | "IMPORTED"
    | "REVIEW_STARTED"
    | "UPDATED"
    | "APPROVED"
    | "REJECTED"
    | "DEFERRED"
    | "REOPENED"
    | "PUBLISHED";
  readonly actorUserId: string | null;
  readonly actorEmail: string | null;
  readonly fromStatus: ProductImportCandidateStatus | null;
  readonly toStatus: ProductImportCandidateStatus;
  readonly changeSet: JsonValue | null;
  readonly comment: string | null;
  readonly createdAt: string;
}

export interface ProductImportCandidateDetails extends ProductImportCandidateSummary {
  readonly classificationDecision: string | null;
  readonly sourceFingerprint: string | null;
  readonly sourceCategoryIds: JsonValue;
  readonly sourceDraft: JsonObject;
  readonly reviewDraft: JsonObject;
  readonly fieldProvenance: JsonValue;
  readonly sourceSnapshots: JsonValue;
  readonly batch: {
    readonly provider: string;
    readonly dataset: string;
    readonly generatedAt: string;
    readonly sourceLocale: string;
    readonly localizedLocale: string;
  };
  readonly events: readonly ProductImportCandidateEvent[];
  readonly publishedProductId: string | null;
  readonly publishedPackageId: string | null;
}

export interface ProductImportCatalogMatch {
  readonly productId: string;
  readonly packageId: string | null;
  readonly name: string;
  readonly brandName: string | null;
  readonly categoryName: string;
  readonly gtin: string | null;
  readonly matchReason: "GTIN" | "SIMILAR_PRODUCT";
}

export interface ProductImportCandidateMutation {
  readonly id: string;
  readonly actorUserId: string;
  readonly expectedUpdatedAt: string;
  readonly fromStatus: ProductImportCandidateStatus;
  readonly toStatus: ProductImportCandidateStatus;
  readonly action: "REVIEW_STARTED" | "UPDATED" | "APPROVED" | "REJECTED" | "DEFERRED" | "REOPENED";
  readonly reviewDraft?: JsonObject | undefined;
  readonly changeSet?: JsonValue | undefined;
  readonly comment?: string | null | undefined;
  readonly reviewedAt?: Date | null | undefined;
}

export interface ProductImportReviewRepository {
  list(query: ProductImportCandidateListQuery): Promise<ProductImportCandidatePage>;
  findById(id: string): Promise<ProductImportCandidateDetails | null>;
  findCatalogMatches(
    candidate: ProductImportCandidateDetails,
  ): Promise<readonly ProductImportCatalogMatch[]>;
  mutate(input: ProductImportCandidateMutation): Promise<ProductImportCandidateDetails | null>;
}
