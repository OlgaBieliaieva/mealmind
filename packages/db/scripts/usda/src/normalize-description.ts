import { isKnownModifier } from "../config/modifier-rules.js";
import {
  GENERIC_COOKED_PATTERNS,
  PREPARATION_RULES,
  READY_TO_EAT_PATTERNS,
} from "../config/preparation-rules.js";
import type {
  NormalizationConfidence,
  NormalizedDescription,
  NormalizedFoodState,
  PreparationMethod,
} from "./types.js";

interface PreparationDetection {
  readonly method: PreparationMethod;
  readonly foodState: NormalizedFoodState;
  readonly confidence: NormalizationConfidence;
  readonly matchedPartIndexes: ReadonlySet<number>;
}

function cleanDescriptionPart(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .replace(/^[.;:\s]+/, "")
    .replace(/[.;:\s]+$/, "")
    .trim();
}

function splitDescription(description: string): string[] {
  return description
    .split(",")
    .map(cleanDescriptionPart)
    .filter((part) => part.length > 0);
}

function matchesAny(value: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function detectPreparation(parts: readonly string[]): PreparationDetection {
  const explicitMatches: Array<{
    readonly index: number;
    readonly method: PreparationMethod;
    readonly foodState: NormalizedFoodState;
    readonly confidence: NormalizationConfidence;
  }> = [];

  const genericCookedIndexes: number[] = [];
  const readyToEatIndexes: number[] = [];

  parts.forEach((part, index) => {
    if (matchesAny(part, READY_TO_EAT_PATTERNS)) {
      readyToEatIndexes.push(index);
      return;
    }

    if (matchesAny(part, GENERIC_COOKED_PATTERNS)) {
      genericCookedIndexes.push(index);
      return;
    }

    const rule = PREPARATION_RULES.find((candidate) => matchesAny(part, candidate.patterns));

    if (rule) {
      explicitMatches.push({
        index,
        method: rule.method,
        foodState: rule.foodState,
        confidence: rule.confidence,
      });
    }
  });

  if (explicitMatches.length > 0) {
    /**
     * USDA often contains:
     *
     * cooked, roasted
     * cooked, boiled
     *
     * The specific preparation wins, while generic "cooked"
     * is also removed from the base name.
     */
    const selected = explicitMatches[0];

    return {
      method: selected.method,
      foodState: selected.foodState,
      confidence: explicitMatches.some((match) => match.method !== selected.method)
        ? "MEDIUM"
        : selected.confidence,
      matchedPartIndexes: new Set([
        ...explicitMatches.map((match) => match.index),
        ...genericCookedIndexes,
        ...readyToEatIndexes,
      ]),
    };
  }

  if (readyToEatIndexes.length > 0) {
    return {
      method: "UNSPECIFIED",
      foodState: "READY_TO_EAT",
      confidence: "MEDIUM",
      matchedPartIndexes: new Set(readyToEatIndexes),
    };
  }

  if (genericCookedIndexes.length > 0) {
    return {
      method: "UNSPECIFIED",
      foodState: "COOKED",
      confidence: "MEDIUM",
      matchedPartIndexes: new Set(genericCookedIndexes),
    };
  }

  return {
    method: "UNSPECIFIED",
    foodState: "UNSPECIFIED",
    confidence: "LOW",
    matchedPartIndexes: new Set(),
  };
}

function normalizeBaseName(parts: readonly string[]): string {
  return parts.join(", ").replace(/\s+/g, " ").trim();
}

/**
 * Heuristic for fragments that may contain preparation-related
 * metadata but are not recognized by current rules.
 *
 * These parts remain in the base name and are additionally exposed
 * for review. No information is removed.
 */
function looksLikeUnclassifiedProcessingPart(part: string): boolean {
  const processingPatterns: readonly RegExp[] = [
    /\bcooked?\b/i,
    /\bcooking\b/i,
    /\bprepared?\b/i,
    /\bpreparation\b/i,
    /\bheated?\b/i,
    /\bheating\b/i,

    /\bdried?\b/i,
    /\bdrying\b/i,
    /\bdehydrated?\b/i,

    /\bfrozen\b/i,
    /\bfreezing\b/i,

    /\bfried\b/i,
    /\bfrying\b/i,
    /\bdeep[- ]fried\b/i,
    /\bpan[- ]fried\b/i,

    /\broasted?\b/i,
    /\broasting\b/i,

    /\bboiled?\b/i,
    /\bboiling\b/i,

    /\bsteamed?\b/i,
    /\bsteaming\b/i,

    /\bbaked?\b/i,
    /\bbaking\b/i,

    /\bgrilled?\b/i,
    /\bgrilling\b/i,

    /\bsmoked?\b/i,
    /\bsmoking\b/i,

    /\bcanned\b/i,
    /\bcanning\b/i,

    /\bpacked\b/i,
    /\bpacking\b/i,

    /\bpreserved?\b/i,
    /\bpreserving\b/i,
  ];

  return processingPatterns.some((pattern) => pattern.test(part));
}

export function normalizeDescription(description: string): NormalizedDescription {
  const normalizedDescription = description.normalize("NFKC").replace(/\s+/g, " ").trim();

  if (!normalizedDescription) {
    throw new Error("USDA description must not be empty.");
  }

  const parts = splitDescription(normalizedDescription);

  if (parts.length === 0) {
    throw new Error(`USDA description has no usable parts: "${description}".`);
  }

  const preparation = detectPreparation(parts);

  const modifiersEn: string[] = [];
  const baseNameParts: string[] = [];
  const unclassifiedParts: string[] = [];

  parts.forEach((part, index) => {
    if (preparation.matchedPartIndexes.has(index)) {
      return;
    }

    const normalizedPart = part.toLocaleLowerCase("en-US");

    if (isKnownModifier(normalizedPart)) {
      modifiersEn.push(normalizedPart);
      return;
    }

    baseNameParts.push(part);

    if (looksLikeUnclassifiedProcessingPart(part)) {
      unclassifiedParts.push(part);
    }
  });

  const normalizedNameEn = normalizeBaseName(baseNameParts);

  if (!normalizedNameEn) {
    throw new Error(`Normalization removed the entire USDA description: "${description}".`);
  }

  return {
    normalizedNameEn,
    preparationMethod: preparation.method,
    foodState: preparation.foodState,
    preparationConfidence: preparation.confidence,
    modifiersEn,
    unclassifiedParts,
  };
}
