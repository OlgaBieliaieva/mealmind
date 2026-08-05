import type { ApiClient } from "./api-client";

export const REFERENCE_RESOURCES = [
  "allergens",
  "authors",
  "brands",
  "cuisines",
  "dietary-tags",
  "meal-types",
  "measurement-units",
  "nutrients",
  "product-categories",
  "recipe-types",
] as const;

export type ReferenceResource = (typeof REFERENCE_RESOURCES)[number];

export interface ReferenceItem {
  readonly id: string;
  readonly [field: string]: unknown;
}

export interface ReferencePage {
  readonly data: { readonly items: readonly ReferenceItem[] };
  readonly meta: { readonly page: number; readonly pageSize: number; readonly total: number };
}

export interface ReferenceListParameters {
  readonly resource: ReferenceResource;
  readonly search?: string;
  readonly page?: number;
  readonly pageSize?: number;
  readonly includeInactive?: boolean;
}

export type ReferenceWriteData = Readonly<Record<string, unknown>>;

export function buildReferencePath(parameters: ReferenceListParameters): string {
  const query = new URLSearchParams();
  if (parameters.search !== undefined) query.set("search", parameters.search);
  if (parameters.page !== undefined) query.set("page", String(parameters.page));
  if (parameters.pageSize !== undefined) query.set("pageSize", String(parameters.pageSize));
  if (parameters.includeInactive !== undefined) {
    query.set("includeInactive", String(parameters.includeInactive));
  }
  const suffix = query.size === 0 ? "" : `?${query.toString()}`;
  return `/api/v1/admin/reference/${parameters.resource}${suffix}`;
}

export function listReferenceData(
  apiClient: ApiClient,
  parameters: ReferenceListParameters,
  signal?: AbortSignal,
): Promise<ReferencePage> {
  return apiClient.get(buildReferencePath(parameters), signal === undefined ? {} : { signal });
}

export function createReferenceData(
  apiClient: ApiClient,
  resource: ReferenceResource,
  data: ReferenceWriteData,
) {
  return apiClient.post<{ readonly data: ReferenceItem }>(
    `/api/v1/admin/reference/${resource}`,
    data,
  );
}

export function updateReferenceData(
  apiClient: ApiClient,
  resource: ReferenceResource,
  id: string,
  data: ReferenceWriteData,
) {
  return apiClient.patch<{ readonly data: ReferenceItem }>(
    `/api/v1/admin/reference/${resource}/${encodeURIComponent(id)}`,
    data,
  );
}
