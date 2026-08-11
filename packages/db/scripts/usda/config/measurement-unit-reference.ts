import { MEASUREMENT_UNITS } from "./measurement-units.js";

export type UsdaImportMeasurementUnitCode = "g" | "ml" | "l";

export interface MeasurementUnitReference {
  readonly id: string;

  readonly code: UsdaImportMeasurementUnitCode;

  readonly dimension: "MASS" | "VOLUME";
}

/**
 * Measurement units that may be referenced directly
 * by the final USDA import-ready dataset.
 *
 * Household USDA units such as cup, tbsp and tsp
 * are intentionally absent here:
 *
 * cup  -> ml
 * tbsp -> ml
 * tsp  -> ml
 *
 * before the import-ready ProductPortion is created.
 */
const REQUIRED_USDA_IMPORT_UNIT_CODES: readonly UsdaImportMeasurementUnitCode[] = [
  "g",
  "ml",
  "l",
] as const;

function buildMeasurementUnitReferenceMap(): ReadonlyMap<
  UsdaImportMeasurementUnitCode,
  MeasurementUnitReference
> {
  const references = new Map<UsdaImportMeasurementUnitCode, MeasurementUnitReference>();

  for (const code of REQUIRED_USDA_IMPORT_UNIT_CODES) {
    const unit = MEASUREMENT_UNITS.find((candidate) => candidate.code === code);

    if (!unit) {
      throw new Error(
        `Required MeasurementUnit "${code}" is missing from the MealMind reference seed.`,
      );
    }

    if (unit.dimension !== "MASS" && unit.dimension !== "VOLUME") {
      throw new Error(`MeasurementUnit "${code}" has unsupported dimension "${unit.dimension}".`);
    }

    references.set(code, {
      id: unit.id,

      code,

      dimension: unit.dimension,
    });
  }

  return references;
}

export const USDA_IMPORT_MEASUREMENT_UNITS = buildMeasurementUnitReferenceMap();

export function getMeasurementUnitReference(
  code: UsdaImportMeasurementUnitCode,
): MeasurementUnitReference {
  const reference = USDA_IMPORT_MEASUREMENT_UNITS.get(code);

  if (!reference) {
    throw new Error(`Unsupported USDA import MeasurementUnit code "${code}".`);
  }

  return reference;
}
