import {
  COUNT_PORTION_LABEL_ALIASES,
  COUNT_PORTION_LABEL_TRANSLATIONS,
  COUNT_PORTION_SIZE_TRANSLATIONS,
} from "../config/portion-label-translations.js";

import type { CountPortionTranslationKey } from "../config/portion-label-translations.js";

import type { ImportReadyProductPortion } from "./import-ready-types.js";

function formatAmount(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(Number(value.toFixed(2)));
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function startsWithSemanticToken(value: string, token: string): boolean {
  return (
    value === token ||
    value.startsWith(`${token} `) ||
    value.startsWith(`${token},`) ||
    value.startsWith(`${token} (`)
  );
}

function resolveCanonicalCountKey(value: string): CountPortionTranslationKey | null {
  const canonicalKeys = Object.keys(
    COUNT_PORTION_LABEL_TRANSLATIONS,
  ) as CountPortionTranslationKey[];

  /**
   * Longer keys first prevents a shorter semantic token
   * from accidentally winning.
   */
  canonicalKeys.sort((left, right) => right.length - left.length);

  for (const key of canonicalKeys) {
    if (startsWithSemanticToken(value, key)) {
      return key;
    }
  }

  for (const [alias, key] of Object.entries(COUNT_PORTION_LABEL_ALIASES)) {
    if (startsWithSemanticToken(value, alias)) {
      return key;
    }
  }

  return null;
}

function resolveSizePrefix(value: string): {
  readonly sizeUa: string;

  readonly remainder: string;
} | null {
  const entries = Object.entries(COUNT_PORTION_SIZE_TRANSLATIONS).sort(
    ([left], [right]) => right.length - left.length,
  );

  for (const [sizeEn, sizeUa] of entries) {
    if (value === sizeEn) {
      return {
        sizeUa,
        remainder: "",
      };
    }

    if (value.startsWith(`${sizeEn} `)) {
      return {
        sizeUa,
        remainder: value.slice(sizeEn.length).trim(),
      };
    }
  }

  return null;
}

function translateCountPortion(labelEn: string): string | null {
  const normalized = normalizeLabel(labelEn);

  /**
   * First handle labels whose semantic noun comes first:
   *
   * slice
   * slice, large
   * pieces
   * potato medium
   */
  const directKey = resolveCanonicalCountKey(normalized);

  if (directKey) {
    return COUNT_PORTION_LABEL_TRANSLATIONS[directKey];
  }

  /**
   * Then handle USDA labels where a size qualifier comes first:
   *
   * small bagel
   * medium slice
   * large whole
   *
   * If we can identify the noun, keep both useful pieces
   * of information. Otherwise retain only the size.
   */
  const size = resolveSizePrefix(normalized);

  if (size) {
    if (!size.remainder) {
      return size.sizeUa;
    }

    const remainderKey = resolveCanonicalCountKey(size.remainder);

    if (remainderKey) {
      const noun = COUNT_PORTION_LABEL_TRANSLATIONS[remainderKey];

      return `${noun}, ${size.sizeUa}`;
    }

    /**
     * USDA dimensions and uncommon descriptions after
     * small/medium/large are not useful enough to localize
     * for the MVP.
     *
     * Example:
     * medium (2-1/2" dia)
     *
     * -> середній розмір
     */
    return size.sizeUa;
  }

  return null;
}

export function translatePortionLabel(portion: ImportReadyProductPortion): string | null {
  if (portion.measurementUnitCode === "ml") {
    return `${formatAmount(portion.amount)} мл`;
  }

  if (portion.measurementUnitCode === "l") {
    return `${formatAmount(portion.amount)} л`;
  }

  if (portion.kind === "COUNT" && portion.measurementUnitCode === null) {
    return translateCountPortion(portion.labelEn);
  }

  return null;
}
