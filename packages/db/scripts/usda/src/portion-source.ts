export interface UsdaFoodPortionRow {
  readonly id: string;

  readonly fdcId: number;

  readonly sequenceNumber: number | null;

  readonly amount: number;

  readonly measureUnitId: string | null;

  readonly portionDescription: string | null;

  readonly modifier: string | null;

  readonly gramWeight: number;

  readonly dataPoints: number | null;

  readonly minYearAcquired: number | null;
}

function parseRequiredString(value: string | undefined, fieldName: string): string {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`Missing ${fieldName}.`);
  }

  return normalized;
}

function parsePositiveInteger(value: string | undefined, fieldName: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName}: "${value ?? ""}".`);
  }

  return parsed;
}

function parseNullableNonNegativeInteger(value: string | undefined): number | null {
  if (value == null || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid integer value: "${value}".`);
  }

  return parsed;
}

function parseNonNegativeAmount(value: string | undefined): number {
  if (value == null || value.trim() === "") {
    throw new Error(`Invalid portion amount: "${value ?? ""}".`);
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid portion amount: "${value}".`);
  }

  return parsed;
}

function parsePositiveGramWeight(value: string | undefined): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid portion gram weight: "${value ?? ""}".`);
  }

  return parsed;
}

function nullableString(value: string | undefined): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

export function parseFoodPortionRow(
  row: Readonly<Record<string, string | undefined>>,
): UsdaFoodPortionRow {
  return {
    id: parseRequiredString(row.id, "portion source row ID"),

    fdcId: parsePositiveInteger(row.fdc_id, "fdc_id"),

    sequenceNumber: parseNullableNonNegativeInteger(row.seq_num),

    /**
     * USDA legacy portions can contain amount = 0,
     * especially measure_unit_id 9999.
     *
     * Preserve that value for the normalization stage.
     */
    amount: parseNonNegativeAmount(row.amount),

    measureUnitId: nullableString(row.measure_unit_id),

    portionDescription: nullableString(row.portion_description),

    modifier: nullableString(row.modifier),

    gramWeight: parsePositiveGramWeight(row.gram_weight),

    dataPoints: parseNullableNonNegativeInteger(row.data_points),

    minYearAcquired: parseNullableNonNegativeInteger(row.min_year_acquired),
  };
}
