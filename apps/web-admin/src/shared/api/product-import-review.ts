import type { ApiClient } from "./api-client";

export type ProductImportCandidateDisposition = "CANDIDATE" | "REVIEW_REQUIRED" | "REJECTED";
export type ProductImportCandidateStatus =
  "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "DEFERRED" | "PUBLISHED";
export type ProductImportReviewDecision = "APPROVE" | "REJECT" | "DEFER";
export type ProductImportPackageKind =
  "UNSPECIFIED" | "FIXED_MASS" | "FIXED_VOLUME" | "FIXED_COUNT" | "FIXED_MASS_AND_VOLUME";
export type JsonValue =
  string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type JsonObject = { readonly [key: string]: JsonValue };

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

export interface ProductImportCandidateEvent {
  readonly id: string;
  readonly action: string;
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

export interface ProductImportCandidateReviewDetails {
  readonly candidate: ProductImportCandidateDetails;
  readonly catalogMatches: readonly ProductImportCatalogMatch[];
}

export interface ProductImportCandidateListParameters {
  readonly search?: string;
  readonly brandName?: string;
  readonly packageKind?: ProductImportPackageKind;
  readonly batchId?: string;
  readonly disposition?: ProductImportCandidateDisposition;
  readonly status?: ProductImportCandidateStatus;
  readonly matchStatus?: string;
  readonly reasonCode?: string;
  readonly reviewedByUserId?: string;
  readonly page?: number;
  readonly pageSize?: number;
}

export interface ProductImportCandidatePageResponse {
  readonly data: { readonly items: readonly ProductImportCandidateSummary[] };
  readonly meta: { readonly page: number; readonly pageSize: number; readonly total: number };
}

interface ProductImportCandidateResponse {
  readonly data: ProductImportCandidateReviewDetails;
}

export function buildProductImportCandidateListPath(
  parameters: ProductImportCandidateListParameters,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return `/api/v1/admin/product-import/candidates${query.size === 0 ? "" : `?${query.toString()}`}`;
}

export function listProductImportCandidates(
  apiClient: ApiClient,
  parameters: ProductImportCandidateListParameters,
) {
  return apiClient.get<ProductImportCandidatePageResponse>(
    buildProductImportCandidateListPath(parameters),
  );
}

export function getProductImportCandidate(apiClient: ApiClient, id: string) {
  return apiClient.get<ProductImportCandidateResponse>(candidatePath(id));
}

export function startProductImportReview(
  apiClient: ApiClient,
  id: string,
  expectedUpdatedAt: string,
  comment?: string,
) {
  return apiClient.post<ProductImportCandidateResponse>(`${candidatePath(id)}/review`, {
    expectedUpdatedAt,
    ...(comment ? { comment } : {}),
  });
}

export function updateProductImportReviewDraft(
  apiClient: ApiClient,
  id: string,
  expectedUpdatedAt: string,
  patch: JsonObject,
  comment?: string,
) {
  return apiClient.patch<ProductImportCandidateResponse>(`${candidatePath(id)}/review`, {
    expectedUpdatedAt,
    patch,
    ...(comment ? { comment } : {}),
  });
}

export function decideProductImportReview(
  apiClient: ApiClient,
  id: string,
  expectedUpdatedAt: string,
  decision: ProductImportReviewDecision,
  comment?: string,
  patch?: JsonObject,
) {
  return apiClient.post<ProductImportCandidateResponse>(`${candidatePath(id)}/decision`, {
    expectedUpdatedAt,
    decision,
    ...(comment ? { comment } : {}),
    ...(patch ? { patch } : {}),
  });
}

export function reopenProductImportReview(
  apiClient: ApiClient,
  id: string,
  expectedUpdatedAt: string,
  comment?: string,
) {
  return apiClient.post<ProductImportCandidateResponse>(`${candidatePath(id)}/reopen`, {
    expectedUpdatedAt,
    ...(comment ? { comment } : {}),
  });
}

export function publishProductImportCandidate(
  apiClient: ApiClient,
  id: string,
  expectedUpdatedAt: string,
) {
  return apiClient.post<ProductImportCandidateResponse>(candidatePath(id) + "/publish", {
    expectedUpdatedAt,
  });
}

function candidatePath(id: string): string {
  return `/api/v1/admin/product-import/candidates/${encodeURIComponent(id)}`;
}
