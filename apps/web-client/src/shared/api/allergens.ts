import { getBrowserApiClient } from "./browser-api-client";

export interface AllergenReference {
  readonly id: string;
  readonly code: string;
  readonly nameUa: string;
  readonly nameEn: string;
  readonly isActive: boolean;
}

interface AllergensResponse {
  readonly data: {
    readonly items: readonly AllergenReference[];
  };
}

export async function readActiveAllergens(): Promise<readonly AllergenReference[]> {
  const response = await getBrowserApiClient().get<AllergensResponse>(
    "/api/v1/reference/allergens?page=1&pageSize=100",
  );

  return response.data.items
    .filter((allergen: AllergenReference) => allergen.isActive)
    .sort((left: AllergenReference, right: AllergenReference) =>
      left.nameUa.localeCompare(right.nameUa, "uk-UA"),
    );
}
