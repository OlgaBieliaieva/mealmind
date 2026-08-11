import { getMeasurementUnitReference } from "../config/measurement-unit-reference.js";

import type { MeasurementUnitReference } from "../config/measurement-unit-reference.js";

/**
 * USDA nutrient composition is represented per 100 g.
 *
 * Therefore every generic USDA product imported into MealMind
 * uses grams as its default measurement unit.
 */
export function resolveUsdaProductDefaultUnit(): MeasurementUnitReference {
  return getMeasurementUnitReference("g");
}
