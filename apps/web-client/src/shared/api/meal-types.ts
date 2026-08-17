import { getBrowserApiClient } from "./browser-api-client";

export type MealTypeKind = "MAIN_MEAL" | "SNACK" | "FLEXIBLE";

export interface MealTypeReference {
  readonly id: string;
  readonly code: string;
  readonly nameUa: string;
  readonly nameEn: string;
  readonly kind: MealTypeKind;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

interface MealTypesResponse {
  readonly data: {
    readonly items: readonly MealTypeReference[];
  };
}

export async function readMealTypes(): Promise<readonly MealTypeReference[]> {
  const response = await getBrowserApiClient().get<MealTypesResponse>(
    "/api/v1/reference/meal-types?page=1&pageSize=100",
  );

  return response.data.items
    .filter((mealType: MealTypeReference) => mealType.isActive)
    .sort((left: MealTypeReference, right: MealTypeReference) => left.sortOrder - right.sortOrder);
}
