import { getBrowserApiClient } from "./browser-api-client";

export interface DietaryTagReference {
  readonly id: string;
  readonly code: string;
  readonly nameUa: string;
  readonly nameEn: string;
  readonly kind: string;
  readonly isRestrictionSelectable: boolean;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

interface DietaryTagsResponse {
  readonly data: {
    readonly items: readonly DietaryTagReference[];
  };
}

export async function readRestrictionSelectableDietaryTags(): Promise<
  readonly DietaryTagReference[]
> {
  const response = await getBrowserApiClient().get<DietaryTagsResponse>(
    "/api/v1/reference/dietary-tags?page=1&pageSize=100",
  );

  return response.data.items
    .filter(
      (dietaryTag: DietaryTagReference) =>
        dietaryTag.isActive && dietaryTag.isRestrictionSelectable,
    )
    .sort(
      (left: DietaryTagReference, right: DietaryTagReference) => left.sortOrder - right.sortOrder,
    );
}
