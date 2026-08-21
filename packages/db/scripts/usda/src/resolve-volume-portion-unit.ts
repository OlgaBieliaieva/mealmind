import { getMeasurementUnitReference } from "../config/measurement-unit-reference.js";

import type { MeasurementUnitReference } from "../config/measurement-unit-reference.js";

import type { ImportReadyVolumePortion } from "./portion-volume-conversion.js";

/**
 * Resolves an already metric-normalized volume portion
 * to the canonical MealMind MeasurementUnit reference.
 *
 * At this stage only:
 *
 * ml
 * l
 *
 * are valid.
 */
export function resolveVolumePortionMeasurementUnit(
  portion: ImportReadyVolumePortion,
): MeasurementUnitReference {
  return getMeasurementUnitReference(portion.measurementUnitCode);
}
