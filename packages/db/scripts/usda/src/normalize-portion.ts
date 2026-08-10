import {
  CANONICAL_UNIT_RULES,
  COMPLEX_LEGACY_PATTERNS,
  COUNT_PORTION_PATTERNS,
  NON_LOCAL_MEASURE_PATTERNS,
  PACKAGE_SPECIFIC_PATTERNS,
  SERVING_SPECIFIC_PATTERNS,
} from "../config/portion-unit-rules.js";

import type { ExtractedPortion } from "./portion-types.js";

import type {
  NormalizedProductPortion,
  PortionNormalizationReasonCode,
} from "./portion-normalization-types.js";

export interface NormalizePortionIncludedResult {
  readonly decision: "INCLUDE";

  readonly portion: NormalizedProductPortion;
}

export interface NormalizePortionExcludedResult {
  readonly decision: "EXCLUDE";

  readonly reasonCodes: readonly PortionNormalizationReasonCode[];
}

export type NormalizePortionResult =
  NormalizePortionIncludedResult | NormalizePortionExcludedResult;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function matchesAny(value: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function getSourceLabel(portion: ExtractedPortion): string | null {
  const modifier = portion.modifier ? normalizeWhitespace(portion.modifier) : null;

  if (modifier) {
    return modifier;
  }

  const description = portion.portionDescription
    ? normalizeWhitespace(portion.portionDescription)
    : null;

  if (description) {
    return description;
  }

  const unitName = portion.sourceMeasurementUnitName
    ? normalizeWhitespace(portion.sourceMeasurementUnitName)
    : null;

  if (unitName && unitName.toLowerCase() !== "undetermined") {
    return unitName;
  }

  return null;
}

function findCanonicalUnit(value: string) {
  return (
    CANONICAL_UNIT_RULES.find((rule) => rule.aliases.some((pattern) => pattern.test(value))) ?? null
  );
}

function buildLabel(portion: ExtractedPortion, fallbackLabel: string): string {
  const structuredUnit = portion.sourceMeasurementUnitName?.trim();

  const modifier = portion.modifier?.trim();

  /**
   * Foundation-style structured portion:
   *
   * source unit = cup
   * modifier = chopped
   *
   * → cup, chopped
   */
  if (structuredUnit && structuredUnit.toLowerCase() !== "undetermined") {
    if (modifier && modifier.toLowerCase() !== structuredUnit.toLowerCase()) {
      return normalizeWhitespace(`${structuredUnit}, ${modifier}`);
    }

    return normalizeWhitespace(structuredUnit);
  }

  /**
   * SR Legacy:
   *
   * measure_unit_id = 9999
   * modifier = cup, chopped
   */
  return normalizeWhitespace(fallbackLabel);
}

function buildIncludedPortion(
  portion: ExtractedPortion,
  options: {
    readonly labelEn: string;

    readonly kind: NormalizedProductPortion["kind"];

    readonly measurementUnitCode: NormalizedProductPortion["measurementUnitCode"];

    readonly reasonCode: PortionNormalizationReasonCode;
  },
): NormalizePortionIncludedResult {
  return {
    decision: "INCLUDE",

    portion: {
      sourceRowId: portion.sourceRowId,

      sourceSequence: portion.sourceSequence,

      amount: portion.sourceAmount,

      gramWeight: portion.gramWeight,

      labelEn: options.labelEn,

      kind: options.kind,

      weightType: "UNKNOWN",

      measurementUnitCode: options.measurementUnitCode,

      sourceMeasurementUnitExternalId: portion.sourceMeasurementUnitExternalId,

      sourceMeasurementUnitName: portion.sourceMeasurementUnitName,

      sourceModifier: portion.modifier,

      sourcePortionDescription: portion.portionDescription,

      sourceDataPoints: portion.sourceDataPoints,

      reasonCodes: [options.reasonCode],
    },
  };
}

export function normalizePortion(portion: ExtractedPortion): NormalizePortionResult {
  /**
   * Legacy source anomalies are not repaired.
   */
  if (portion.sourceAmount <= 0) {
    return {
      decision: "EXCLUDE",

      reasonCodes: ["NON_POSITIVE_SOURCE_AMOUNT"],
    };
  }

  const sourceLabel = getSourceLabel(portion);

  if (!sourceLabel) {
    return {
      decision: "EXCLUDE",

      reasonCodes: ["MISSING_MEASURE_LABEL"],
    };
  }

  /**
   * Yield/refuse semantics have higher priority than
   * count detection.
   *
   * Example:
   *
   * "ear, yields"
   *
   * must not become a normal COUNT portion.
   */
  if (matchesAny(sourceLabel, COMPLEX_LEGACY_PATTERNS)) {
    return {
      decision: "EXCLUDE",

      reasonCodes: ["COMPLEX_LEGACY_MEASURE"],
    };
  }

  /**
   * Package-specific measures are deliberately excluded
   * from the generic MealMind catalog.
   */
  if (matchesAny(sourceLabel, PACKAGE_SPECIFIC_PATTERNS)) {
    return {
      decision: "EXCLUDE",

      reasonCodes: ["PACKAGE_SPECIFIC_MEASURE"],
    };
  }

  /**
   * Nutrition-label serving concepts are not physical
   * product portions.
   */
  if (matchesAny(sourceLabel, SERVING_SPECIFIC_PATTERNS)) {
    return {
      decision: "EXCLUDE",

      reasonCodes: ["SERVING_SPECIFIC_MEASURE"],
    };
  }

  /**
   * US-specific measurement units are intentionally
   * excluded from the current Ukrainian catalog.
   */
  if (matchesAny(sourceLabel, NON_LOCAL_MEASURE_PATTERNS)) {
    return {
      decision: "EXCLUDE",

      reasonCodes: ["NON_LOCAL_MEASURE"],
    };
  }

  const structuredUnitName = portion.sourceMeasurementUnitName?.trim();

  /**
   * Prefer a supported concrete USDA measure unit
   * when available.
   */
  const canonicalFromStructuredUnit =
    structuredUnitName && structuredUnitName.toLowerCase() !== "undetermined"
      ? findCanonicalUnit(structuredUnitName)
      : null;

  if (canonicalFromStructuredUnit) {
    return buildIncludedPortion(portion, {
      labelEn: buildLabel(portion, sourceLabel),

      kind: canonicalFromStructuredUnit.kind,

      measurementUnitCode: canonicalFromStructuredUnit.code,

      reasonCode: "NORMALIZED_STRUCTURED_UNIT",
    });
  }

  /**
   * Most SR Legacy rows encode the household unit
   * in the modifier.
   */
  const canonicalFromModifier = findCanonicalUnit(sourceLabel);

  if (canonicalFromModifier) {
    return buildIncludedPortion(portion, {
      labelEn: buildLabel(portion, sourceLabel),

      kind: canonicalFromModifier.kind,

      measurementUnitCode: canonicalFromModifier.code,

      reasonCode: "NORMALIZED_MODIFIER_UNIT",
    });
  }

  /**
   * Product-specific natural portions.
   *
   * These intentionally have no global MeasurementUnit code.
   */
  if (matchesAny(sourceLabel, COUNT_PORTION_PATTERNS)) {
    return buildIncludedPortion(portion, {
      labelEn: buildLabel(portion, sourceLabel),

      kind: "COUNT",

      measurementUnitCode: null,

      reasonCode: "NORMALIZED_COUNT_PORTION",
    });
  }

  return {
    decision: "EXCLUDE",

    reasonCodes: ["UNSUPPORTED_MEASURE"],
  };
}
