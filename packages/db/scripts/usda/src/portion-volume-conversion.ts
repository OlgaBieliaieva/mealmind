import { USDA_VOLUME_CONVERSION_BY_CODE } from "../config/portion-volume-conversions.js";

import type { UsdaVolumeMeasurementUnitCode } from "../config/portion-volume-conversions.js";

import type { NormalizedProductPortion } from "./portion-normalization-types.js";

export interface ImportReadyVolumePortion {
  /**
   * Metric amount that will be stored in ProductPortion.amount.
   */
  readonly amount: number;

  /**
   * Canonical MealMind MeasurementUnit code.
   *
   * USDA household units are converted to ml.
   */
  readonly measurementUnitCode: "ml" | "l";

  /**
   * USDA product-specific mass remains unchanged.
   */
  readonly gramWeight: number;

  /**
   * Original normalized household amount retained for provenance.
   */
  readonly sourceAmount: number;

  /**
   * Original normalized household unit retained for provenance.
   */
  readonly sourceMeasurementUnitCode: UsdaVolumeMeasurementUnitCode;

  readonly labelEn: string;
}

function isSupportedVolumeUnitCode(value: string | null): value is UsdaVolumeMeasurementUnitCode {
  return value === "cup" || value === "tbsp" || value === "tsp" || value === "ml" || value === "l";
}

export function convertVolumePortionToMetric(
  portion: NormalizedProductPortion,
): ImportReadyVolumePortion {
  if (portion.kind !== "VOLUME") {
    throw new Error(`Cannot convert non-volume portion "${portion.labelEn}" to a metric volume.`);
  }

  if (!isSupportedVolumeUnitCode(portion.measurementUnitCode)) {
    throw new Error(
      `Unsupported volume MeasurementUnit code "${String(
        portion.measurementUnitCode,
      )}" for portion "${portion.labelEn}".`,
    );
  }

  const rule = USDA_VOLUME_CONVERSION_BY_CODE.get(portion.measurementUnitCode);

  if (!rule) {
    throw new Error(`Missing volume conversion rule for "${portion.measurementUnitCode}".`);
  }

  const amount = portion.amount * rule.factor;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid converted volume amount for portion "${portion.labelEn}": ${amount}.`);
  }

  return {
    amount,

    measurementUnitCode: rule.targetUnit,

    gramWeight: portion.gramWeight,

    sourceAmount: portion.amount,

    sourceMeasurementUnitCode: portion.measurementUnitCode,

    labelEn: portion.labelEn,
  };
}
