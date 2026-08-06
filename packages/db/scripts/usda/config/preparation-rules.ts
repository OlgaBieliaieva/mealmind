import type {
  NormalizationConfidence,
  NormalizedFoodState,
  PreparationMethod,
} from "../src/types.js";

export interface PreparationRule {
  readonly method: PreparationMethod;
  readonly foodState: NormalizedFoodState;
  readonly confidence: NormalizationConfidence;

  /**
   * Patterns matched against one comma-separated description part.
   */
  readonly patterns: readonly RegExp[];
}

/**
 * Rules are evaluated in order.
 *
 * More specific methods must come before generic methods:
 * - deep fried before fried
 * - pan fried before fried
 * - cooked is handled separately as a generic fallback
 */
export const PREPARATION_RULES: readonly PreparationRule[] = [
  {
    method: "DEEP_FRIED",
    foodState: "COOKED",
    confidence: "HIGH",
    patterns: [/^deep[- ]fried$/i, /^deep fat fried$/i, /^fried in deep fat$/i],
  },
  {
    method: "PAN_FRIED",
    foodState: "COOKED",
    confidence: "HIGH",
    patterns: [/^pan[- ]fried$/i, /^fried in pan$/i],
  },
  {
    method: "RAW",
    foodState: "RAW",
    confidence: "HIGH",
    patterns: [/^raw$/i, /^uncooked$/i, /^fresh,? raw$/i],
  },
  {
    method: "BOILED",
    foodState: "COOKED",
    confidence: "HIGH",
    patterns: [/^boiled$/i, /^cooked,? boiled$/i],
  },
  {
    method: "STEAMED",
    foodState: "COOKED",
    confidence: "HIGH",
    patterns: [/^steamed$/i, /^cooked,? steamed$/i],
  },
  {
    method: "BAKED",
    foodState: "COOKED",
    confidence: "HIGH",
    patterns: [/^baked$/i, /^cooked,? baked$/i],
  },
  {
    method: "ROASTED",
    foodState: "COOKED",
    confidence: "HIGH",
    patterns: [/^roasted$/i, /^cooked,? roasted$/i, /^roast$/i],
  },
  {
    method: "GRILLED",
    foodState: "COOKED",
    confidence: "HIGH",
    patterns: [/^grilled$/i, /^cooked,? grilled$/i],
  },
  {
    method: "BROILED",
    foodState: "COOKED",
    confidence: "HIGH",
    patterns: [/^broiled$/i, /^cooked,? broiled$/i],
  },
  {
    method: "FRIED",
    foodState: "COOKED",
    confidence: "HIGH",
    patterns: [/^fried$/i, /^cooked,? fried$/i],
  },
  {
    method: "SAUTEED",
    foodState: "COOKED",
    confidence: "HIGH",
    patterns: [/^sauteed$/i, /^sautéed$/i, /^cooked,? sauteed$/i, /^cooked,? sautéed$/i],
  },
  {
    method: "MICROWAVED",
    foodState: "COOKED",
    confidence: "HIGH",
    patterns: [/^microwaved$/i, /^cooked in microwave$/i],
  },
  {
    method: "SIMMERED",
    foodState: "COOKED",
    confidence: "HIGH",
    patterns: [/^simmered$/i],
  },
  {
    method: "POACHED",
    foodState: "COOKED",
    confidence: "HIGH",
    patterns: [/^poached$/i],
  },
  {
    method: "BRAISED",
    foodState: "COOKED",
    confidence: "HIGH",
    patterns: [/^braised$/i],
  },
  {
    method: "STEWED",
    foodState: "COOKED",
    confidence: "HIGH",
    patterns: [/^stewed$/i],
  },
  {
    method: "CANNED",
    foodState: "PROCESSED",
    confidence: "HIGH",
    patterns: [/^canned$/i, /^canned solids$/i, /^canned,? drained$/i],
  },
  {
    method: "DEHYDRATED",
    foodState: "PROCESSED",
    confidence: "HIGH",
    patterns: [/^dehydrated$/i, /^dehydrated solids$/i],
  },
  {
    method: "DRIED",
    foodState: "PROCESSED",
    confidence: "HIGH",
    patterns: [/^dried$/i, /^dry$/i, /^sun[- ]dried$/i],
  },
  {
    method: "FROZEN",
    foodState: "PROCESSED",
    confidence: "HIGH",
    patterns: [/^frozen$/i, /^frozen,? unprepared$/i],
  },
  {
    method: "SMOKED",
    foodState: "PROCESSED",
    confidence: "HIGH",
    patterns: [/^smoked$/i],
  },
  {
    method: "FERMENTED",
    foodState: "PROCESSED",
    confidence: "HIGH",
    patterns: [/^fermented$/i],
  },
  {
    method: "PICKLED",
    foodState: "PROCESSED",
    confidence: "HIGH",
    patterns: [/^pickled$/i],
  },
  {
    method: "TOASTED",
    foodState: "COOKED",
    confidence: "HIGH",
    patterns: [/^toasted$/i],
  },
] as const;

/**
 * Generic state markers do not identify an exact preparation method.
 */
export const GENERIC_COOKED_PATTERNS: readonly RegExp[] = [/^cooked$/i, /^prepared$/i];

export const READY_TO_EAT_PATTERNS: readonly RegExp[] = [
  /^ready[- ]to[- ]eat$/i,
  /^ready to serve$/i,
  /^prepared,? ready[- ]to[- ]eat$/i,
];
