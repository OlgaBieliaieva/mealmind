import type {
  CanonicalMeasurementUnitCode,
  NormalizedPortionKind,
} from "../src/portion-normalization-types.js";

export interface CanonicalUnitRule {
  readonly code: CanonicalMeasurementUnitCode;

  readonly kind: NormalizedPortionKind;

  readonly aliases: readonly RegExp[];
}

/**
 * Canonical household / metric units that are useful
 * in the MealMind catalog.
 *
 * US-specific units such as oz, lb, fl oz and quart
 * are intentionally excluded from this list.
 */
export const CANONICAL_UNIT_RULES: readonly CanonicalUnitRule[] = [
  {
    code: "cup",

    kind: "VOLUME",

    aliases: [
      /^cup$/i,
      /^cups?$/i,

      /**
       * Also matches:
       *
       * cup, chopped
       * cup sliced
       * cup pieces
       * cup farfalle
       */
      /^cup(?:\b|[\s,(])/i,
    ],
  },

  {
    code: "tbsp",

    kind: "VOLUME",

    aliases: [/^tbsp$/i, /^tbsp\b/i, /^tablespoon$/i, /^tablespoons?\b/i],
  },

  {
    code: "tsp",

    kind: "VOLUME",

    aliases: [/^tsp$/i, /^tsp\b/i, /^teaspoon$/i, /^teaspoons?\b/i],
  },

  {
    code: "ml",

    kind: "VOLUME",

    aliases: [/^ml$/i, /^millilit(?:er|re)s?$/i],
  },

  {
    code: "l",

    kind: "VOLUME",

    aliases: [/^l$/i, /^liter$/i, /^liters$/i, /^litre$/i, /^litres$/i],
  },
] as const;

/**
 * Known USDA units that are valid source data but are not
 * useful in the current Ukrainian MealMind catalog.
 */
export const NON_LOCAL_MEASURE_PATTERNS: readonly RegExp[] = [
  /^oz$/i,
  /^oz\b/i,
  /^ounce$/i,
  /^ounces?\b/i,

  /^lb$/i,
  /^lb\b/i,
  /^pound$/i,
  /^pounds?\b/i,

  /^fl oz$/i,
  /^fl oz\b/i,
  /^fluid ounce/i,

  /^quart$/i,
  /^quarts?\b/i,
  /^qt$/i,

  /^cubic inch\b/i,
] as const;

/**
 * Packaging is intentionally excluded.
 *
 * Package weights are market- and manufacturer-specific and
 * should not become generic ProductPortion records.
 */
export const PACKAGE_SPECIFIC_PATTERNS: readonly RegExp[] = [
  /^package\b/i,
  /^packet\b/i,
  /^container\b/i,
  /^can\b/i,
  /^can or bottle\b/i,
  /^bottle\b/i,
  /^bag\b/i,
  /^box\b/i,
  /^carton\b/i,
  /^envelope\b/i,
  /^drink box\b/i,
  /^individual box\b/i,
] as const;

/**
 * USDA / nutrition-label serving concepts are intentionally
 * excluded because they are not physical household measures.
 */
export const SERVING_SPECIFIC_PATTERNS: readonly RegExp[] = [
  /^serving\b/i,
  /^nlea serving\b/i,
  /^order\b/i,
] as const;

/**
 * Product-specific count portions useful to MealMind.
 *
 * These do not map to a global MeasurementUnit.
 *
 * Examples:
 *
 * 1 slice
 * 1 medium
 * 1 fillet
 * 1 mushroom
 * 2 carrots
 */
export const COUNT_PORTION_PATTERNS: readonly RegExp[] = [
  /^each\b/i,

  /^piece\b/i,
  /^pieces\b/i,

  /^slice\b/i,
  /^slices\b/i,

  /^fillet\b/i,

  /^egg\b/i,

  /^fruit\b/i,

  /^medium\b/i,
  /^small\b/i,
  /^large\b/i,
  /^extra large\b/i,

  /^link\b/i,

  /^wedge\b/i,

  /^drumstick\b/i,

  /^breast\b/i,

  /^thigh\b/i,

  /^wing\b/i,

  /^chop\b/i,

  /^steak\b/i,

  /^patty\b/i,

  /^cookie\b/i,
  /^cookies\b/i,

  /^cracker\b/i,
  /^crackers\b/i,

  /^cake\b/i,
  /^cakes\b/i,

  /^bar\b/i,

  /^roll\b/i,

  /^leaf\b/i,
  /^leaves\b/i,

  /^head\b/i,

  /^bunch\b/i,

  /^block\b/i,
  /^blocks\b/i,

  /^clove\b/i,
  /^cloves\b/i,

  /^bulb\b/i,

  /^scoop\b/i,
  /^scoops\b/i,

  /^half\b/i,
  /^halves\b/i,

  /^sprout\b/i,
  /^sprouts\b/i,

  /^almond\b/i,
  /^peanut\b/i,

  /^olive\b/i,

  /^date\b/i,

  /^grape\b/i,
  /^grapes\b/i,

  /^muffin\b/i,

  /^strip\b/i,
  /^strips\b/i,

  /^stick\b/i,

  /^pod\b/i,
  /^pods\b/i,

  /^cube\b/i,
  /^cubes\b/i,

  /^stalk\b/i,
  /^stalks\b/i,

  /^kernel\b/i,
  /^kernels\b/i,

  /^pancake\b/i,

  /^sprig\b/i,
  /^sprigs\b/i,

  /^flower\b/i,
  /^floweret\b/i,
  /^flowerets\b/i,

  /^leek\b/i,

  /^mushroom\b/i,
  /^mushrooms\b/i,

  /^spear\b/i,
  /^spears\b/i,

  /^toast\b/i,

  /^wafer\b/i,

  /^bagel\b/i,

  /^carrot\b/i,

  /^cherry\b/i,

  /^berry\b/i,

  /^cutlet\b/i,

  /^rib\b/i,
  /^ribs\b/i,

  /^root\b/i,

  /^pepper\b/i,

  /^banana\b/i,

  /^onion\b/i,

  /^tomato\b/i,
  /^tomatoes\b/i,

  /^potato\b/i,

  /^ear\b/i,

  /^roast\b/i,
] as const;

/**
 * USDA legacy measures that describe yield or refuse
 * calculations rather than useful user-facing portions.
 */
export const COMPLEX_LEGACY_PATTERNS: readonly RegExp[] = [
  /\byield from\b/i,

  /\byields?\b/i,

  /\bexcluding refuse\b/i,

  /\bwith refuse\b/i,

  /\bready-to-cook\b/i,

  /\braw meat with refuse\b/i,

  /\brecipe yield\b/i,

  /^paired raw w\b/i,

  /^paired cooked w\b/i,

  /^orig(?:inal)? rw g\b/i,

  /^orig(?:inal)? ckd g\b/i,
] as const;
