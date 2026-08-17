import { getBrowserApiClient } from "./browser-api-client";

export interface CuisineReference {
  readonly id: string;
  readonly code: string;
  readonly nameUa: string;
  readonly nameEn: string;
  readonly scope: string;
  readonly regionCode: string | null;
  readonly isPreferenceSelectable: boolean;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

interface CuisinesResponse {
  readonly data: {
    readonly items: readonly CuisineReference[];
  };
}

export async function readPreferenceSelectableCuisines(): Promise<readonly CuisineReference[]> {
  const response = await getBrowserApiClient().get<CuisinesResponse>(
    "/api/v1/reference/cuisines?page=1&pageSize=100",
  );

  return response.data.items
    .filter((cuisine: CuisineReference) => cuisine.isActive && cuisine.isPreferenceSelectable)
    .sort((left: CuisineReference, right: CuisineReference) => left.sortOrder - right.sortOrder);
}
