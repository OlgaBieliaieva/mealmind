export interface UsdaFoodNutrientRow {
  readonly id: string;
  readonly fdcId: number;
  readonly nutrientId: number;
  readonly amount: number;
  readonly dataPoints: number | null;
  readonly derivationId: string | null;
}

/**
 * Parses a required positive integer.
 *
 * Used for USDA identifiers such as:
 * - fdc_id
 * - nutrient_id
 *
 * Zero and negative values are considered invalid.
 */
function parseRequiredPositiveInteger(value: string, fieldName: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName}: "${value}".`);
  }

  return parsed;
}

/**
 * Parses an optional non-negative integer.
 *
 * Empty values are represented as null.
 *
 * Used for fields such as data_points.
 */
function parseNullableInteger(value: string | undefined, fieldName: string): number | null {
  if (value == null || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid ${fieldName}: "${value}".`);
  }

  return parsed;
}

/**
 * Parses the USDA nutrient amount.
 *
 * Zero is valid because a nutrient may explicitly
 * have a measured value of 0.
 *
 * Negative and non-finite values are rejected.
 */
function parseAmount(value: string): number {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error("Missing nutrient amount.");
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid nutrient amount: "${value}".`);
  }

  return parsed;
}

/**
 * Parses a required non-empty string.
 *
 * Used for source identifiers where an empty value
 * would make provenance impossible to trace.
 */
function parseRequiredString(value: string | undefined, fieldName: string): string {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`Missing ${fieldName}.`);
  }

  return normalized;
}

/**
 * Converts a raw USDA food_nutrient.csv row into
 * a validated internal representation.
 */
export function parseFoodNutrientRow(row: Readonly<Record<string, string>>): UsdaFoodNutrientRow {
  return {
    id: parseRequiredString(row.id, "food_nutrient.id"),

    fdcId: parseRequiredPositiveInteger(row.fdc_id ?? "", "fdc_id"),

    nutrientId: parseRequiredPositiveInteger(row.nutrient_id ?? "", "nutrient_id"),

    amount: parseAmount(row.amount ?? ""),

    dataPoints: parseNullableInteger(row.data_points, "data_points"),

    derivationId: row.derivation_id?.trim() || null,
  };
}
