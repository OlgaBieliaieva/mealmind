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

interface KnownPreparationModifierRule {
  readonly pattern: RegExp;
  readonly modifier: string;
}

interface ContextualPreparationMatch {
  readonly value: string;
  readonly canonicalPart: string;
}

/**
 * Preparation/reconstitution metadata that should be preserved
 * as product modifiers rather than treated as unknown processing.
 *
 * These values may affect the nutritional meaning of the USDA item,
 * so they remain available in modifiersEn.
 */
const KNOWN_PREPARATION_MODIFIERS: readonly KnownPreparationModifierRule[] = [
  // Water-based preparation
  {
    pattern: /^prepared with water$/i,
    modifier: "prepared with water",
  },
  {
    pattern: /^prepared with tap water$/i,
    modifier: "prepared with tap water",
  },
  {
    pattern: /^prepared with distilled water$/i,
    modifier: "prepared with distilled water",
  },
  {
    pattern: /^prepared with water and ice$/i,
    modifier: "prepared with water and ice",
  },
  {
    pattern: /^prepared with equal volume water$/i,
    modifier: "prepared with equal volume water",
  },
  {
    pattern: /^prepared with water or ready-to-serve$/i,
    modifier: "prepared with water or ready-to-serve",
  },
  {
    pattern: /^prepared with water or ready-to serve$/i,
    modifier: "prepared with water or ready-to-serve",
  },
  {
    pattern: /^prepared with water \(boiling water added or microwaved\)$/i,
    modifier: "prepared with water (boiling water added or microwaved)",
  },
  {
    pattern: /^cooked with water$/i,
    modifier: "cooked with water",
  },
  {
    pattern: /^cooked with water \(includes boiling and microwaving\)$/i,
    modifier: "cooked with water (includes boiling and microwaving)",
  },

  // Milk-based preparation
  {
    pattern: /^prepared with whole milk$/i,
    modifier: "prepared with whole milk",
  },
  {
    pattern: /^prepared with 2% milk$/i,
    modifier: "prepared with 2% milk",
  },
  {
    pattern: /^prepared with 1% milk$/i,
    modifier: "prepared with 1% milk",
  },
  {
    pattern: /^prepared with fat free milk$/i,
    modifier: "prepared with fat free milk",
  },
  {
    pattern: /^prepared with equal volume milk$/i,
    modifier: "prepared with equal volume milk",
  },
  {
    pattern: /^prepared with equal volume low fat \(2%\) milk$/i,
    modifier: "prepared with equal volume low fat (2%) milk",
  },
  {
    pattern: /^1\.5 ounce prepared with 1\/2 cup milk$/i,
    modifier: "prepared with 1/2 cup milk",
  },

  // Recipe / commercial preparation
  {
    pattern: /^commercially prepared$/i,
    modifier: "commercially prepared",
  },
  {
    pattern: /^prepared from recipe$/i,
    modifier: "prepared from recipe",
  },
  {
    pattern: /^prepared-from-recipe$/i,
    modifier: "prepared from recipe",
  },
  {
    pattern: /^prepared-by-recipe$/i,
    modifier: "prepared from recipe",
  },
  {
    pattern: /^home-prepared$/i,
    modifier: "home-prepared",
  },
  {
    pattern: /^home prepared$/i,
    modifier: "home-prepared",
  },
  {
    pattern: /^home-prepared from recipe using butter$/i,
    modifier: "prepared from recipe",
  },
  {
    pattern: /^home-prepared from recipe using margarine$/i,
    modifier: "prepared from recipe",
  },
  {
    pattern: /^home-prepared with butter$/i,
    modifier: "home-prepared with butter",
  },
  {
    pattern: /^home-prepared with margarine$/i,
    modifier: "home-prepared with margarine",
  },
  {
    pattern: /^restaurant-prepared$/i,
    modifier: "restaurant-prepared",
  },
  {
    pattern: /^prepared from mix$/i,
    modifier: "prepared from mix",
  },

  // Reconstituted variants
  {
    pattern: /^prepared from flakes without milk$/i,
    modifier: "prepared from flakes without milk",
  },
  {
    pattern: /^prepared from granules$/i,
    modifier: "prepared from granules",
  },
  {
    pattern: /^prepared from granules with milk$/i,
    modifier: "prepared from granules with milk",
  },
  {
    pattern: /^prepared from granules without milk$/i,
    modifier: "prepared from granules without milk",
  },
  {
    pattern: /^prepared with margarine$/i,
    modifier: "prepared with margarine",
  },

  // Tofu / coagulant preparation
  {
    pattern: /^prepared with calcium sulfate$/i,
    modifier: "prepared with calcium sulfate",
  },
  {
    pattern: /^prepared with nigari$/i,
    modifier: "prepared with nigari",
  },
  {
    pattern: /^prepared with calcium sulfate and magnesium chloride \(nigari\)$/i,
    modifier: "prepared with calcium sulfate and magnesium chloride (nigari)",
  },

  // Combined / alternative preparation states
  {
    pattern: /^boiled and steamed$/i,
    modifier: "boiled and steamed",
  },
  {
    pattern: /^pan-fried or roasted$/i,
    modifier: "pan-fried or roasted",
  },
  {
    pattern: /^baked or broiled$/i,
    modifier: "baked or broiled",
  },
  {
    pattern: /^or baked$/i,
    modifier: "or baked",
  },

  // Additional known state/preparation details
  {
    pattern: /^dried and salted$/i,
    modifier: "dried and salted",
  },
  {
    pattern: /^air-dried$/i,
    modifier: "air-dried",
  },
  {
    pattern: /^frozen as packaged$/i,
    modifier: "frozen as packaged",
  },
  {
    pattern: /^cooked as purchased$/i,
    modifier: "cooked as purchased",
  },
  {
    pattern: /^mature cooked$/i,
    modifier: "mature cooked",
  },
  {
    pattern: /^not prepared$/i,
    modifier: "not prepared",
  },
  {
    pattern: /^raw or frozen$/i,
    modifier: "raw or frozen",
  },
  {
    pattern: /^home preserved$/i,
    modifier: "home preserved",
  },

  // Useful state details
  {
    pattern: /^canned in olive oil$/i,
    modifier: "canned in olive oil",
  },
  {
    pattern: /^canned in tomato sauce$/i,
    modifier: "canned in tomato sauce",
  },
  {
    pattern: /^canned with pork$/i,
    modifier: "canned with pork",
  },
  {
    pattern: /^made from dried potatoes$/i,
    modifier: "made from dried potatoes",
  },
  {
    pattern: /^made from dried potatoes \(preformed\)$/i,
    modifier: "made from dried potatoes (preformed)",
  },
  {
    pattern: /^smoke flavor$/i,
    modifier: "smoke flavor",
  },
  // Additional USDA preparation/state variants
  {
    pattern: /^with added solution cooked$/i,
    modifier: "with added solution cooked",
  },
  {
    pattern: /^dried-frozen \(koyadofu\)$/i,
    modifier: "dried-frozen (koyadofu)",
  },
  {
    pattern: /^canned \(liquid expressed from grated meat and water\)$/i,
    modifier: "canned (liquid expressed from grated meat and water)",
  },
  {
    pattern: /^from roasted and toasted kernels \(most common type\)$/i,
    modifier: "from roasted and toasted kernels (most common type)",
  },
  {
    pattern: /^not canned$/i,
    modifier: "not canned",
  },
  {
    pattern: /^canned \(pinto\)$/i,
    modifier: "canned (pinto)",
  },
  {
    pattern: /^canned \(jumbo-super colossal\)$/i,
    modifier: "canned (jumbo-super colossal)",
  },
  {
    pattern: /^canned \(small-extra large\)$/i,
    modifier: "canned (small-extra large)",
  },
  {
    pattern: /^commercially prepared \(includes soft bread crumbs\)$/i,
    modifier: "commercially prepared (includes soft bread crumbs)",
  },
  {
    pattern: /^beef broth or bouillon canned$/i,
    modifier: "beef broth or bouillon canned",
  },
  {
    pattern: /^commercially prepared \(includes brown-and-serve\)$/i,
    modifier: "commercially prepared (includes brown-and-serve)",
  },
];

function cleanDescriptionPart(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .replace(/^[.;:\s]+/, "")
    .replace(/[.;:\s]+$/, "")
    .trim();
}

function splitDescription(description: string): string[] {
  const parts: string[] = [];

  let current = "";
  let parenthesesDepth = 0;

  for (const character of description) {
    if (character === "(") {
      parenthesesDepth += 1;
      current += character;
      continue;
    }

    if (character === ")") {
      parenthesesDepth = Math.max(0, parenthesesDepth - 1);

      current += character;
      continue;
    }

    if (character === "," && parenthesesDepth === 0) {
      const cleaned = cleanDescriptionPart(current);

      if (cleaned) {
        parts.push(cleaned);
      }

      current = "";
      continue;
    }

    current += character;
  }

  const trailing = cleanDescriptionPart(current);

  if (trailing) {
    parts.push(trailing);
  }

  return parts;
}

function matchesAny(value: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function findKnownPreparationModifier(value: string): string | null {
  const normalizedValue = value.trim();

  for (const rule of KNOWN_PREPARATION_MODIFIERS) {
    if (rule.pattern.test(normalizedValue)) {
      return rule.modifier;
    }
  }

  return null;
}

/**
 * USDA sometimes appends source/context information in parentheses
 * to an otherwise recognizable preparation state.
 *
 * Examples:
 * - cooked (Alaska Native)
 * - roasted (Navajo)
 * - frozen (Includes foods for USDA's Food Distribution Program)
 *
 * The contextual annotation should not make the preparation state
 * unclassified.
 */
function normalizeContextualPreparationPart(value: string): ContextualPreparationMatch | null {
  const normalizedValue = value.trim();

  const match = /^(raw|cooked|frozen|heated|dried|smoked|roasted|boiled|steamed)\s+\((.+)\)$/i.exec(
    normalizedValue,
  );

  if (!match) {
    return null;
  }

  const state = match[1];

  if (!state) {
    return null;
  }

  const canonicalPart = state.toLowerCase();

  return {
    value: canonicalPart,
    canonicalPart,
  };
}

/**
 * Normalizes USDA aliases that describe an already-known
 * preparation method using a non-standard phrase.
 */
function normalizePreparationAlias(value: string): string {
  const normalizedValue = value.trim().toLowerCase();

  const aliases: Readonly<Record<string, string>> = {
    "cooked-roasted": "roasted",
    "patty cooked": "cooked",
    "tripe cooked": "cooked",
    "cooked simmered": "simmered",

    "boiled. drained": "boiled",
    "boiled with salt": "boiled",
    "cooked without salt": "cooked",

    "par fried": "fried",
    "soaked and fried": "fried",
    "batter-dipped and fried": "fried",

    "roasted and toasted": "roasted",
  };

  return aliases[normalizedValue] ?? normalizedValue;
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

  parts.forEach((originalPart, index) => {
    const contextual = normalizeContextualPreparationPart(originalPart);

    const part = normalizePreparationAlias(contextual?.canonicalPart ?? originalPart);

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
    const [selected, ...otherMatches] = explicitMatches;

    if (!selected) {
      throw new Error("Expected at least one explicit preparation match.");
    }

    return {
      method: selected.method,
      foodState: selected.foodState,
      confidence: otherMatches.some((match) => match.method !== selected.method)
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
 * Fragments that contain words such as "fried", "cooking",
 * "smoked" or "baked", but where those words are part of the
 * product name, intended use or product class rather than
 * preparation metadata.
 *
 * These fragments must remain in normalizedNameEn and should not
 * create UNCLASSIFIED_PROCESSING.
 */
const NON_PROCESSING_NAME_PATTERNS: readonly RegExp[] = [
  /^fried pies$/i,
  /^fried rice$/i,
  /^baked beans$/i,
  /^smoked link sausage$/i,
  /^fried mozzarella sticks$/i,
  /^bunuelos \(fried yeast bread\)$/i,

  /^shortening frying \(heavy duty\)$/i,
  /^canola .* oil for deep fat frying$/i,
  /^pam cooking spray$/i,
  /^soy .* corn for frying$/i,

  /^\(chinese preserving melon\)$/i,
  /^\(dried gourd strips\)$/i,
];

/**
 * Oil descriptions often contain words such as cooking, frying
 * or roasting to indicate intended use rather than the state or
 * preparation of the oil itself.
 */
const OIL_USAGE_PATTERNS: readonly RegExp[] = [
  /^salad or cooking$/i,
  /^cooking and salad$/i,
  /^all purpose salad or cooking$/i,
  /^for woks and light frying$/i,
  /^woks and light frying$/i,
  /^roasting nuts$/i,
];

/**
 * Heuristic for fragments that may contain preparation-related
 * metadata but are not recognized by current rules.
 *
 * These parts remain in the base name and are additionally exposed
 * for review. No information is removed.
 */
function looksLikeUnclassifiedProcessingPart(part: string, allParts: readonly string[]): boolean {
  const normalizedPart = part.toLowerCase().trim();

  const normalizedParts = allParts.map((value) => value.toLowerCase().trim());

  /**
   * Known fragments where processing-like words belong to the
   * actual food name or intended use.
   */
  if (NON_PROCESSING_NAME_PATTERNS.some((pattern) => pattern.test(normalizedPart))) {
    return false;
  }

  /**
   * "Chicken, roasting, ..." uses "roasting" as a poultry class,
   * not as a preparation method.
   */
  const isChickenProduct = normalizedParts[0] === "chicken";

  if (isChickenProduct && normalizedPart === "roasting") {
    return false;
  }

  /**
   * Oil descriptions such as "salad or cooking" describe intended
   * use rather than preparation of the oil itself.
   */
  const isOilProduct = normalizedParts[0] === "oil";

  if (isOilProduct && OIL_USAGE_PATTERNS.some((pattern) => pattern.test(normalizedPart))) {
    return false;
  }

  /**
   * USDA mixed-vegetable descriptions may contain the canned state
   * inside the product-name fragment itself.
   *
   * Example:
   * "Vegetables, mixed (corn, lima beans, peas, green beans,
   * carrots) canned, no salt added"
   *
   * This is a valid generic product rather than unresolved
   * processing metadata.
   */
  if (normalizedParts[0] === "vegetables" && /^mixed \(.*\) canned$/i.test(normalizedPart)) {
    return false;
  }

  /**
   * Some USDA entries contain an English explanation/translation
   * inside parentheses.
   *
   * Example:
   * "Frijoles rojos volteados (Refried beans, red, canned)"
   *
   * The word "canned" belongs to that explanatory product name
   * and should not trigger UNCLASSIFIED_PROCESSING.
   */
  if (/\(refried beans, .*canned\)$/i.test(normalizedPart)) {
    return false;
  }

  const processingPatterns: readonly RegExp[] = [
    /\bcooked?\b/i,
    /\bcooking\b/i,
    /\bpre-cooked\b/i,
    /\bprepared?\b/i,
    /\bpreparation\b/i,
    /\bheated?\b/i,
    /\bheating\b/i,

    /\bdried?\b/i,
    /\bdrying\b/i,
    /\bdehydrated?\b/i,
    /\bfreeze-dried\b/i,

    /\bfrozen\b/i,
    /\bfreezing\b/i,

    /\bfried\b/i,
    /\bfrying\b/i,
    /\bdeep[- ]fried\b/i,
    /\bpan[- ]fried\b/i,
    /\bstir-fried\b/i,

    /\broasted?\b/i,
    /\broasting\b/i,

    /\bboiled?\b/i,
    /\bboiling\b/i,

    /\bsteamed?\b/i,
    /\bsteaming\b/i,

    /\bbaked?\b/i,

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

  return processingPatterns.some((pattern) => pattern.test(normalizedPart));
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

    const knownPreparationModifier = findKnownPreparationModifier(part);

    if (knownPreparationModifier) {
      modifiersEn.push(knownPreparationModifier);
      return;
    }

    /**
     * If this is a recognizable preparation state with a USDA
     * contextual annotation, detectPreparation() normally consumes
     * it already. This remains as a defensive fallback.
     */
    const contextualPreparation = normalizeContextualPreparationPart(part);

    if (contextualPreparation) {
      return;
    }

    baseNameParts.push(part);

    if (looksLikeUnclassifiedProcessingPart(part, parts)) {
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
    modifiersEn: [...new Set(modifiersEn)],
    unclassifiedParts,
  };
}
