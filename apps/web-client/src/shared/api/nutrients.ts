import { getBrowserApiClient } from "./browser-api-client";

import type { NutrientUnit } from "./family";

export interface TargetableNutrient {
  readonly id: string;

  readonly code: string;

  readonly name: string;

  readonly unit: NutrientUnit;

  readonly group: string;

  readonly sortOrder: number;
}

interface NutrientReferenceRecord {
  readonly id: string;

  readonly code: string;

  readonly nameUa: string;

  readonly nameEn: string;

  readonly group: string;

  readonly unit: NutrientUnit;

  readonly isTargetable: boolean;

  readonly isActive: boolean;

  readonly sortOrder: number;
}

interface NutrientReferenceListResponse {
  readonly data: {
    readonly items: readonly NutrientReferenceRecord[];
  };
}

export async function readTargetableNutrients(): Promise<readonly TargetableNutrient[]> {
  const response = await getBrowserApiClient().get<NutrientReferenceListResponse>(
    "/api/v1/reference/nutrients?page=1&pageSize=100",
  );

  return response.data.items
    .filter((nutrient: NutrientReferenceRecord) => nutrient.isActive && nutrient.isTargetable)
    .map((nutrient: NutrientReferenceRecord): TargetableNutrient => ({
      id: nutrient.id,

      code: nutrient.code,

      name: nutrient.nameUa,

      unit: nutrient.unit,

      group: nutrient.group,

      sortOrder: nutrient.sortOrder,
    }))
    .sort(
      (left: TargetableNutrient, right: TargetableNutrient) => left.sortOrder - right.sortOrder,
    );
}
