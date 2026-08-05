import { queryOptions } from "@tanstack/react-query";

import type { ApiClient } from "@/shared/api/api-client";
import { listReferenceData, type ReferenceListParameters } from "@/shared/api/reference-data";

const REFERENCE_STALE_TIME_MS = 5 * 60_000;

export function referenceQueryOptions(apiClient: ApiClient, parameters: ReferenceListParameters) {
  return queryOptions({
    queryKey: ["reference", parameters] as const,
    queryFn: ({ signal }) => listReferenceData(apiClient, parameters, signal),
    staleTime: REFERENCE_STALE_TIME_MS,
  });
}
