import type { CurationDecision, CurationReasonCode, NormalizedProduct } from "../src/types.js";

export interface MixedCategoryRule {
  readonly categoryId: string;
  readonly includePatterns?: readonly RegExp[];
  readonly excludePatterns?: readonly RegExp[];
}

export interface MixedCategoryEvaluation {
  readonly decision: CurationDecision;
  readonly reasonCode: CurationReasonCode;
}

/**
 * Generic second-level rules for USDA categories that are too broad
 * to be globally INCLUDE or EXCLUDE.
 *
 * These rules should remain conservative:
 * if no rule matches, the product stays in NEEDS_REVIEW.
 */
export const MIXED_CATEGORY_RULES: readonly MixedCategoryRule[] = [
  // {
  //   categoryId: "14", // Beverages
  //   includePatterns: [
  //     // Coffee / tea / cocoa / water
  //     /\bcoffee\b/i,
  //     /\btea\b/i,
  //     /\bcocoa\b/i,
  //     /\bwater\b/i,
  //     // Plant-based milk
  //     /\balmond milk\b/i,
  //     /\bcoconut milk\b/i,
  //     /\boat milk\b/i,
  //     /\brice milk\b/i,
  //     // Juice / soft drinks
  //     /\bjuice\b/i,
  //     /\blemonade\b/i,
  //     /\blimeade\b/i,
  //     /\bfruit punch\b/i,
  //     /\bcarbonated\b/i,
  //     /\bsoda\b/i,
  //     /\bcola\b/i,
  //     /\broot beer\b/i,
  //     /\bginger ale\b/i,
  //     // Sports / energy drinks
  //     /\bgatorade\b/i,
  //     /\bpowerade\b/i,
  //     /\bpropel\b/i,
  //     /\benergy drink\b/i,
  //     // Milk / protein beverages
  //     /\bmilk beverage\b/i,
  //     /\bchocolate drink\b/i,
  //     /\bbeverage mix\b/i,
  //     /\bprotein powder\b/i,
  //     /\bwhey protein powder\b/i,
  //     // Pure alcoholic beverages
  //     /\bwine\b/i,
  //     /\bbeer\b/i,
  //     /\bwhiskey\b/i,
  //     /\bwhisky\b/i,
  //     /\bgin\b/i,
  //     /\bvodka\b/i,
  //     /\brum\b/i,
  //     /\bvermouth\b/i,
  //     /\bbrandy\b/i,
  //     /\bcider\b/i,
  //     /\bmalt liquor\b/i,
  //   ],
  //   excludePatterns: [
  //     // Cocktail mixes / mixed alcoholic drinks
  //     /\bwhiskey sour mix\b/i,
  //     /\bcocktail mix\b/i,
  //     /\bcocktail\b/i,
  //     /\bmixed alcoholic drink\b/i,
  //     // Meal replacement / supplement beverages
  //     /\bmeal supplement\b/i,
  //     /\bensure\b/i,
  //     /\bslimfast\b/i,
  //     // Restaurant / fast-food prepared beverages
  //     /\bshake, fast food\b/i,
  //   ],
  // },
] as const;

function evaluateBeverage(product: NormalizedProduct): MixedCategoryEvaluation {
  const description = product.originalDescription.trim();

  /**
   * Beverages use a whitelist-oriented policy.
   *
   * Category 14 contains many legacy branded, fortified,
   * recipe-derived, nutritional and highly specific prepared
   * beverages. MealMind keeps useful generic reference beverages
   * and excludes the remaining unmatched variants.
   */

  /**
   * Explicitly unwanted beverage variants.
   *
   * Exclusions must be checked before inclusions because some
   * descriptions contain otherwise useful terms such as
   * "milk", "juice", "whiskey" or "drink".
   */
  const exclusionPatterns: readonly RegExp[] = [
    // Cocktail mixes / prepared cocktails
    /\bwhiskey sour mix\b/i,
    /\bcocktail mix\b/i,
    /\bcocktail\b/i,
    /\bmixed alcoholic drink\b/i,

    // Recipe-derived alcoholic beverages
    /\bprepared from recipe\b/i,
    /\bprepared-from-recipe\b/i,

    // Meal replacement / nutritional supplement beverages
    /\bmeal supplement\b/i,
    /\bnutritional drink\b/i,
    /\bnutritional shake\b/i,
    /\bmuscle milk\b/i,
    /\bensure\b/i,
    /\bslimfast\b/i,

    // Restaurant-specific beverages
    /\bas served in restaurant\b/i,
    /\bshake, fast food\b/i,

    // Known branded / manufacturer-specific beverages
    /\bcytosport\b/i,
    /\bfuze\b/i,
    /\bnestle\b/i,
    /\bocean spray\b/i,
    /\bovaltine\b/i,
    /\bv8 splash\b/i,
    /\bv8 v[- ]?fusion\b/i,

    // Cooking / recipe-derived alcoholic beverages
    /\bwhiskey sour\b/i,
    /\bprepared from item \d+\b/i,
    /\bwine, cooking\b/i,
  ];

  if (exclusionPatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "EXCLUDE",
      reasonCode: "DESCRIPTION_EXCLUDED",
    };
  }

  /**
   * Generic beverages useful as MealMind reference products.
   *
   * These are intentionally narrower than the old category-level
   * regexes. Generic terms such as "beverage mix" are not enough
   * to automatically include an item.
   */
  const includePatterns: readonly RegExp[] = [
    /\bcoffee\b/i,
    /\btea\b/i,
    /\bcocoa\b/i,
    /\bwater\b/i,

    /\balmond milk\b/i,
    /\bcoconut milk\b/i,
    /\boat milk\b/i,
    /\brice milk\b/i,

    /\bjuice\b/i,
    /\blemonade\b/i,
    /\blimeade\b/i,
    /\bfruit punch\b/i,

    /\bcarbonated\b/i,
    /\bsoda\b/i,
    /\bcola\b/i,
    /\broot beer\b/i,
    /\bginger ale\b/i,

    /\bgatorade\b/i,
    /\bpowerade\b/i,
    /\bpropel\b/i,
    /\benergy drink\b/i,

    /\bmilk beverage\b/i,
    /\bchocolate drink\b/i,
    /\bprotein powder\b/i,
    /\bwhey protein powder\b/i,

    /\bwine\b/i,
    /\bbeer\b/i,
    /\bwhiskey\b/i,
    /\bwhisky\b/i,
    /\bgin\b/i,
    /\bvodka\b/i,
    /\brum\b/i,
    /\bvermouth\b/i,
    /\bbrandy\b/i,
    /\bcider\b/i,
    /\bmalt liquor\b/i,
  ];

  if (includePatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "INCLUDE",
      reasonCode: "CATEGORY_INCLUDED",
    };
  }

  /**
   * Category 14 fallback.
   *
   * Anything that was not recognized as a useful generic beverage
   * is intentionally excluded instead of being left for manual review.
   */
  return {
    decision: "EXCLUDE",
    reasonCode: "DESCRIPTION_EXCLUDED",
  };
}

function evaluateBakedProduct(product: NormalizedProduct): MixedCategoryEvaluation | null {
  const description = product.originalDescription.trim();

  /**
   * Recipe-derived products, mixes, convenience dough products,
   * branded products and highly specific commercial bakery foods
   * are excluded from the core MealMind catalog.
   */
  const exclusionPatterns: readonly RegExp[] = [
    // Recipe-derived foods
    /\bprepared from recipe\b/i,
    /\bprepared-from-recipe\b/i,

    // Mix-based products
    /\bdry mix\b/i,
    /\bprepared from mix\b/i,
    /\bmuffin mix\b/i,
    /\bcake mix\b/i,
    /\bstuffing mix\b/i,

    // Stuffing
    /\bstuffing\b/i,

    // Dough / convenience products
    /\brefrigerated dough\b/i,
    /\bfrozen dough\b/i,
    /\bready-to-bake\b/i,
    /\bready to bake\b/i,

    // Niche bakery item
    /^keikitos\b/i,

    // Highly specific commercially prepared bakery products
    /^cake, chocolate, commercially prepared with chocolate frosting\b/i,
    /^cake, pound, commercially prepared\b/i,
    /^muffins, blueberry, commercially prepared\b/i,
    /^sweet rolls, cinnamon, commercially prepared with raisins\b/i,

    // Embedded branded description
    /\bbimbo bakeries usa\b/i,
  ];

  if (exclusionPatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "EXCLUDE",
      reasonCode: "DESCRIPTION_EXCLUDED",
    };
  }

  /**
   * Known branded/manufacturer-style descriptions.
   */
  const brandedPatterns: readonly RegExp[] = [
    /^archway\b/i,
    /^pepperidge farm\b/i,
    /^nabisco\b/i,
    /^pillsbury\b/i,
    /^glutino\b/i,
    /^udi'?s\b/i,
    /^van'?s\b/i,
    /^schar\b/i,
    /^heinz\b/i,
    /^keebler\b/i,
    /^kraft\b/i,
    /^kraft foods\b/i,
    /^mission foods\b/i,
    /^george weston bakeries\b/i,
    /^martha white foods\b/i,
    /^interstate brands corp\b/i,
    /^mckee baking\b/i,
    /^continental mills\b/i,
    /^crunchmaster\b/i,
    /^mary'?s gone crackers\b/i,
    /^rudi'?s\b/i,
    /^sage valley\b/i,
    /^andrea'?s\b/i,
  ];

  if (brandedPatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "EXCLUDE",
      reasonCode: "DESCRIPTION_EXCLUDED",
    };
  }

  /**
   * Generic baked products useful as MealMind catalog items.
   */
  const includePatterns: readonly RegExp[] = [
    // Breads
    /^bread\b/i,
    /^bagels?\b/i,
    /^rolls?\b/i,
    /^english muffins?\b/i,
    /^croissants?\b/i,
    /^focaccia\b/i,
    /^garlic bread\b/i,

    // Flatbreads / wrappers / shells
    /^tortillas?\b/i,
    /^pita\b/i,
    /^phyllo dough\b/i,
    /^wonton wrappers?\b/i,
    /^taco shells?\b/i,
    /^tostada shells?\b/i,

    // Crackers / savory baked foods
    /^crackers?\b/i,
    /^croutons?\b/i,
    /^biscuits?\b/i,
    /^hush puppies\b/i,
    /^popovers?\b/i,

    // Breakfast baked foods
    /^pancakes?\b/i,
    /^waffles?\b/i,
    /^french toast\b/i,

    // Muffins / cakes / cookies
    /^muffins?\b/i,
    /^cookies?\b/i,
    /^cake\b/i,

    // Pies / pastry
    /^pie crust\b/i,
    /^pie\b/i,
    /^pastry\b/i,
    /^puff pastry\b/i,
    /^danish pastry\b/i,
    /^strudel\b/i,
    /^tart\b/i,
    /^cream puff(?: shell)?\b/i,

    // Sweet baked goods
    /^doughnuts?\b/i,
    /^sweet rolls?\b/i,
    /^cinnamon buns?\b/i,
    /^toaster pastries\b/i,
    /^pan dulce\b/i,

    // Other generic baked products
    /^ice cream cones?\b/i,

    // Baking ingredients
    /^leavening agents\b/i,
  ];

  if (includePatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "INCLUDE",
      reasonCode: "CATEGORY_INCLUDED",
    };
  }

  /**
   * Unknown category-18 leftovers are not automatically promoted.
   */
  return {
    decision: "EXCLUDE",
    reasonCode: "DESCRIPTION_EXCLUDED",
  };
}

function evaluateSweetProduct(product: NormalizedProduct): MixedCategoryEvaluation | null {
  const description = product.originalDescription.trim();

  /**
   * Recipe-derived, mix-based, niche and branded sweets are excluded
   * from the MealMind catalog.
   */
  const exclusionPatterns: readonly RegExp[] = [
    // Recipe-derived products
    /\bprepared from recipe\b/i,
    /\bprepared-from-recipe\b/i,

    // Mix-based products
    /\bdry mix\b/i,

    // Less useful / niche products
    /^rennin\b/i,
    /^egg custards?\b/i,
    /^flan\b/i,
    /^frostings?\b/i,
    /^gelatin desserts?\b/i,
    /^puddings?\b/i,
    /^snacks, fruit leather\b/i,

    // Branded / manufacturer-specific products
    /^schiff\b/i,
    /\bmars snackfood\b/i,
    /\bsnickers\b/i,
    /\bm&m'?s\b/i,
    /\bhershey\b/i,
    /\breese'?s\b/i,
  ];

  if (exclusionPatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "EXCLUDE",
      reasonCode: "DESCRIPTION_EXCLUDED",
    };
  }

  /**
   * Generic sweets useful as MealMind reference foods.
   */
  const includePatterns: readonly RegExp[] = [
    /^candies\b/i,
    /^chocolate\b/i,
    /^cocoa\b/i,
    /^honey\b/i,
    /^sugars?\b/i,
    /^sweeteners?\b/i,
    /^syrups?\b/i,
    /^jams?\b/i,
    /^jellies\b/i,
    /^marmalade\b/i,
    /^molasses\b/i,
    /^fruit butters?\b/i,
  ];

  if (includePatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "INCLUDE",
      reasonCode: "CATEGORY_INCLUDED",
    };
  }

  return {
    decision: "EXCLUDE",
    reasonCode: "DESCRIPTION_EXCLUDED",
  };
}
function evaluateSoupSauceProduct(product: NormalizedProduct): MixedCategoryEvaluation | null {
  const description = product.originalDescription.trim();

  if (/^wasabi$/i.test(description)) {
    return {
      decision: "INCLUDE",
      reasonCode: "CATEGORY_INCLUDED",
    };
  }

  /**
   * Branded/manufacturer-specific soups and sauces are excluded.
   *
   * MealMind keeps generic USDA reference foods rather than
   * manufacturer-specific SR Legacy entries.
   */
  const brandedPatterns: readonly RegExp[] = [
    /^campbell'?s\b/i,
    /^campbells\b/i,
    /^progresso\b/i,
    /^healthy choice\b/i,
    /^swanson\b/i,
    /^lipton\b/i,
    /^knorr\b/i,
  ];

  if (brandedPatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "EXCLUDE",
      reasonCode: "DESCRIPTION_EXCLUDED",
    };
  }

  /**
   * Recipe-derived, reconstituted, mix-based and restaurant-specific
   * variants are excluded.
   *
   * MealMind keeps the generic reference product rather than USDA
   * records representing a particular dilution, recipe or restaurant
   * preparation.
   */
  const exclusionPatterns: readonly RegExp[] = [
    // Recipe-derived products
    /\bprepared from recipe\b/i,
    /\bprepared-from-recipe\b/i,

    // Reconstituted canned / condensed products
    /\bprepared with equal volume water\b/i,
    /\bprepared with equal volume milk\b/i,
    /\bprepared with equal volume low fat \(2%\) milk\b/i,

    // Ambiguous reconstructed/ready-to-serve variant
    /\bprepared with water or ready-to-serve\b/i,

    // Dry / powdered / cube products already reconstructed
    /\bdry,?\s+mix,?\s+prepared with water\b/i,
    /\bpowder,?\s+prepared with water\b/i,
    /\bcubed,?\s+prepared with water\b/i,
    /\bbroth cubes?,?\s+dry,?\s+prepared with water\b/i,
    /\bbouillon,?\s+dry,?\s+prepared with water\b/i,

    // Restaurant-specific foods
    /\bchinese restaurant\b/i,
    /\brestaurant[- ]prepared\b/i,
    /^dip\b/i,
  ];

  if (exclusionPatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "EXCLUDE",
      reasonCode: "DESCRIPTION_EXCLUDED",
    };
  }

  /**
   * Generic soups, sauces, gravies, broths, stocks and bouillon
   * products are useful MealMind reference foods.
   *
   * These patterns intentionally do not require the food type to be
   * the first word. For example, "Fish broth" is still a generic
   * broth.
   */
  const includePatterns: readonly RegExp[] = [
    /^soup\b/i,
    /\bsoup\b/i,

    /^sauce\b/i,
    /\bsauce\b/i,

    /^gravy\b/i,
    /\bgravy\b/i,

    /^broth\b/i,
    /\bbroth\b/i,

    /^bouillon\b/i,
    /\bbouillon\b/i,

    /^consomme\b/i,
    /\bconsomme\b/i,

    /^stock\b/i,
    /\bstock\b/i,
  ];

  if (includePatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "INCLUDE",
      reasonCode: "CATEGORY_INCLUDED",
    };
  }

  return null;
}

function evaluateSausageAndLuncheonMeat(
  product: NormalizedProduct,
): MixedCategoryEvaluation | null {
  const description = product.originalDescription.trim();

  /**
   * Brand-specific products are excluded from the generic
   * MealMind product catalog.
   */
  const brandedPatterns: readonly RegExp[] = [
    /^oscar mayer\b/i,
    /^hormel\b/i,

    /\bincludes spam\b/i,
    /\bincludes spam \(hormel\)\b/i,
    /\bincludes spam lite\b/i,
  ];

  if (brandedPatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "EXCLUDE",
      reasonCode: "DESCRIPTION_EXCLUDED",
    };
  }

  const exclusionPatterns: readonly RegExp[] = [
    // Composite spreads
    /^chicken spread\b/i,
    /^ham and cheese spread\b/i,
    /^ham salad spread\b/i,
    /^poultry salad sandwich spread\b/i,
    /^roast beef spread\b/i,
    /^sandwich spread\b/i,

    // Composite loaf-style products
    /^macaroni and cheese loaf\b/i,

    // Prepared convenience meat products
    /^meatballs, frozen\b/i,
    /^pork sausage rice links\b/i,
    /^beef, new zealand, imported, ribs prepared\b/i,
  ];

  if (exclusionPatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "EXCLUDE",
      reasonCode: "DESCRIPTION_EXCLUDED",
    };
  }

  /**
   * Generic processed meats, deli meats, sausages and pâtés
   * are useful standalone MealMind products.
   */
  const includePatterns: readonly RegExp[] = [
    /^bacon\b/i,
    /^bacon and beef sticks\b/i,

    /^barbecue loaf\b/i,

    /^beef\b/i,

    /^beerwurst\b/i,
    /^blood sausage\b/i,
    /^bockwurst\b/i,

    /^bologna\b/i,
    /^bratwurst\b/i,
    /^braunschweiger\b/i,

    /^cheesefurter\b/i,

    /^chicken breast\b/i,

    /^corned beef loaf\b/i,
    /^dutch brand loaf\b/i,

    /^frankfurter\b/i,

    /^ham\b/i,
    /^ham and cheese loaf or roll\b/i,

    /^headcheese\b/i,
    /^honey roll sausage\b/i,

    /^kielbasa\b/i,
    /^knackwurst\b/i,

    /^lebanon bologna\b/i,

    /^liver cheese\b/i,
    /^liver sausage\b/i,
    /^liverwurst\b/i,

    /^luncheon meat\b/i,
    /^luncheon sausage\b/i,
    /^lunchmeat\b/i,

    /^luxury loaf\b/i,

    /^mortadella\b/i,
    /^mother'?s loaf\b/i,

    /^olive loaf\b/i,

    /^pastrami\b/i,
    /^pate\b/i,
    /^peppered loaf\b/i,
    /^pepperoni\b/i,
    /^pickle and pimiento loaf\b/i,
    /^picnic loaf\b/i,

    /^polish sausage\b/i,
    /^pork sausage\b/i,

    /^roast beef\b/i,

    /^salami\b/i,

    /^sausage\b/i,

    /^scrapple\b/i,
    /^swisswurst\b/i,

    /^thuringer\b/i,

    /^turkey breast\b/i,
    /^turkey\b/i,

    /^yachtwurst\b/i,
  ];

  if (includePatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "INCLUDE",
      reasonCode: "CATEGORY_INCLUDED",
    };
  }

  return null;
}

function evaluateSnackProduct(product: NormalizedProduct): MixedCategoryEvaluation | null {
  const description = product.originalDescription.trim();

  /**
   * Explicit branded/manufacturer products and overly specific
   * processed snack variants are excluded.
   */
  const exclusionPatterns: readonly RegExp[] = [
    // Specific processed tortilla-chip variants
    /^snacks, tortilla chips, light \(baked with less oil\)$/i,
    /^tortilla chips, low fat, baked without fat$/i,
  ];

  if (exclusionPatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "EXCLUDE",
      reasonCode: "DESCRIPTION_EXCLUDED",
    };
  }

  const brandedPatterns: readonly RegExp[] = [
    /\bluna bar\b/i,
    /\bmars snackfood\b/i,
    /\bsnickers marathon\b/i,
    /\bpower bar\b/i,
    /\bslim-fast\b/i,
    /\bsouth beach\b/i,
    /\bzone perfect\b/i,
    /\bclif bar\b/i,

    /\bfarley candy\b/i,

    /\bfritolay\b/i,
    /\bsunchips\b/i,

    /\bgeneral mills\b/i,
    /\bnature valley\b/i,

    /\bkashi\b/i,
    /\bquaker\b/i,
    /\bkellogg\b/i,
    /\bnutri-grain\b/i,

    /\bkraft\b/i,
    /\bm&m mars\b/i,

    /\bsunkist\b/i,
    /\bhain celestial\b/i,
    /\bterra chips\b/i,
  ];

  if (brandedPatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "EXCLUDE",
      reasonCode: "DESCRIPTION_EXCLUDED",
    };
  }

  /**
   * Generic snack products useful for food tracking.
   */
  const includePatterns: readonly RegExp[] = [
    /\bpopcorn\b/i,

    /\bpotato chips?\b/i,
    /\bsweet potato chips?\b/i,
    /\bplantain chips?\b/i,
    /\btaro chips?\b/i,
    /\byucca(?: \(cassava\))? chips?\b/i,
    /\bvegetable chips?\b/i,

    /\btortilla chips?\b/i,
    /\bpita chips?\b/i,
    /\bbagel chips?\b/i,
    /\bbrown rice chips?\b/i,

    /\bcorn-based\b/i,
    /\bcorn cakes?\b/i,
    /\bcornnuts?\b/i,

    /\bpretzels?\b/i,

    /\brice cakes?\b/i,
    /\brice crackers?\b/i,

    /\bsesame sticks?\b/i,
    /\bsoy chips?\b/i,
    /\bshrimp crackers?\b/i,

    /\bpork skins?\b/i,

    /\bbanana chips?\b/i,
    /\bfruit leather\b/i,

    /\btrail mix\b/i,

    /\bgranola bars?\b/i,
    /\bgranola bites?\b/i,
    /\bcereal bars?\b/i,
    /\bcrisped rice bar\b/i,

    /\bbeef jerky\b/i,
    /\bbeef sticks?\b/i,

    /\bcheese puffs? and twists?\b/i,
  ];

  if (includePatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "INCLUDE",
      reasonCode: "CATEGORY_INCLUDED",
    };
  }

  /**
   * Category 23 fallback.
   */
  return {
    decision: "EXCLUDE",
    reasonCode: "DESCRIPTION_EXCLUDED",
  };
}

function evaluateBreakfastCereal(product: NormalizedProduct): MixedCategoryEvaluation | null {
  const description = product.originalDescription.trim();

  const brandedPatterns: readonly RegExp[] = [
    /\bALPEN\b/i,
    /\bBARBARA'S\b/i,
    /\bGENERAL MILLS\b/i,
    /\bHEALTH VALLEY\b/i,
    /\bMALT-O-MEAL\b/i,
    /\bMOM'S BEST\b/i,
    /\bNATURE'S PATH\b/i,
    /\bPOST\b/i,
    /\bQUAKER\b/i,
    /\bRALSTON\b/i,
    /\bSUN COUNTRY\b/i,
    /\bUNCLE SAM\b/i,
    /\bWEETABIX\b/i,
    /\bWHEATENA\b/i,
  ];

  if (brandedPatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "EXCLUDE",
      reasonCode: "DESCRIPTION_EXCLUDED",
    };
  }

  const includePatterns: readonly RegExp[] = [
    // Generic ready-to-eat cereals
    /\bgranola, homemade\b/i,
    /\brice, puffed\b/i,
    /\bwheat, puffed\b/i,
    /\bmillet, puffed\b/i,
    /\bwheat germ\b/i,

    // Generic hot cereals / grains
    /\bcorn grits\b/i,
    /\bfarina\b/i,
    /\boats\b/i,
    /\boatmeal\b/i,
    /\bwhole wheat hot natural cereal\b/i,
  ];

  if (includePatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "INCLUDE",
      reasonCode: "CATEGORY_INCLUDED",
    };
  }

  return {
    decision: "EXCLUDE",
    reasonCode: "DESCRIPTION_EXCLUDED",
  };
}

function evaluateRestaurantFood(product: NormalizedProduct): MixedCategoryEvaluation | null {
  const description = product.originalDescription.trim();

  const exclusionPatterns: readonly RegExp[] = [/^restaurant, latino, chicken and rice\b/i];

  if (exclusionPatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "EXCLUDE",
      reasonCode: "DESCRIPTION_EXCLUDED",
    };
  }

  const brandedRestaurantPatterns: readonly RegExp[] = [
    /^APPLEBEE'S,/i,
    /^CARRABBA'S ITALIAN GRILL,/i,
    /^CRACKER BARREL,/i,
    /^DENNY'S,/i,
    /^OLIVE GARDEN,/i,
    /^ON THE BORDER,/i,
    /^T\.G\.I\. FRIDAY'S,/i,
  ];

  if (brandedRestaurantPatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "EXCLUDE",
      reasonCode: "DESCRIPTION_EXCLUDED",
    };
  }

  if (/^Restaurant,/i.test(description)) {
    return {
      decision: "INCLUDE",
      reasonCode: "CATEGORY_INCLUDED",
    };
  }

  return null;
}

function evaluateNativeFood(product: NormalizedProduct): MixedCategoryEvaluation | null {
  const description = product.originalDescription.trim();

  const exclusionPatterns: readonly RegExp[] = [
    // existing explicit exclusions...
  ];

  if (exclusionPatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "EXCLUDE",
      reasonCode: "DESCRIPTION_EXCLUDED",
    };
  }

  const includePatterns: readonly RegExp[] = [
    // existing useful generic Native-food whitelist...
  ];

  if (includePatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "INCLUDE",
      reasonCode: "CATEGORY_INCLUDED",
    };
  }

  /**
   * Remaining category 24 products are too regional,
   * culturally specific or otherwise too niche for the
   * core MealMind catalog.
   */
  return {
    decision: "EXCLUDE",
    reasonCode: "DESCRIPTION_EXCLUDED",
  };
}

function evaluatePreparedMeal(product: NormalizedProduct): MixedCategoryEvaluation | null {
  const description = product.originalDescription.trim();

  const exclusionPatterns: readonly RegExp[] = [/\bfrozen entree\b/i, /\bcanned entree\b/i];

  if (exclusionPatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "EXCLUDE",
      reasonCode: "DESCRIPTION_EXCLUDED",
    };
  }

  /**
   * Branded / commercial convenience products.
   */
  const brandedPatterns: readonly RegExp[] = [
    /^banquet\b/i,
    /^hot pockets\b/i,
    /^hungry man\b/i,
    /^jimmy dean\b/i,
    /^lean pockets\b/i,
    /^rice-a-roni\b/i,
  ];

  if (brandedPatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "EXCLUDE",
      reasonCode: "DESCRIPTION_EXCLUDED",
    };
  }

  /**
   * Packaged meal mixes rather than useful generic dishes.
   */
  const packagedMixPatterns: readonly RegExp[] = [
    /^pasta mix\b/i,
    /^rice and vermicelli mix\b/i,
    /^rice mix\b/i,
    /^spanish rice mix\b/i,
    /^yellow rice with seasoning\b/i,

    /^macaroni and cheese dinner with dry sauce mix\b/i,
    /^macaroni and cheese, box mix\b/i,
    /^macaroni and cheese, dry mix\b/i,
    /^macaroni or noodles with cheese, made from .*packaged mix\b/i,

    /^turnover\b/i,
    /^pizza rolls\b/i,
    /^corn dogs\b/i,
  ];

  if (packagedMixPatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "EXCLUDE",
      reasonCode: "DESCRIPTION_EXCLUDED",
    };
  }

  /**
   * Generic prepared dishes useful in MealMind.
   *
   * Other review rules may still keep an item in NEEDS_REVIEW
   * because of COMPOSITE_DISH or UNCLASSIFIED_PROCESSING.
   */
  const includePatterns: readonly RegExp[] = [
    /^beef macaroni\b/i,
    /^beef pot pie\b/i,
    /^beef stew\b/i,
    /^beef, corned beef hash\b/i,

    /^burrito\b/i,

    /^chicken pot pie\b/i,
    /^chicken tenders\b/i,
    /^chicken, nuggets\b/i,
    /^chicken, thighs\b/i,

    /^chili\b/i,
    /^chili con carne\b/i,
    /^chili with beans\b/i,

    /^dumpling\b/i,
    /^egg rolls?\b/i,

    /^lasagna\b/i,
    /^lasagna with\b/i,

    /^macaroni and cheese\b/i,
    /^macaroni or noodles with cheese\b/i,

    /^pasta with sliced franks\b/i,
    /^pasta with tomato sauce\b/i,

    /^potato salad\b/i,
    /^potsticker or wonton\b/i,
    /^pulled pork\b/i,

    /^ravioli\b/i,

    /^spaghetti\b/i,
    /^spaghetti with\b/i,

    /^taquitos\b/i,
    /^tortellini\b/i,

    /^turkey pot pie\b/i,
  ];

  if (includePatterns.some((pattern) => pattern.test(description))) {
    return {
      decision: "INCLUDE",
      reasonCode: "CATEGORY_INCLUDED",
    };
  }

  return {
    decision: "EXCLUDE",
    reasonCode: "DESCRIPTION_EXCLUDED",
  };
}

/**
 * Applies generic regex-based rules.
 */
function evaluateGenericMixedCategory(product: NormalizedProduct): MixedCategoryEvaluation | null {
  const rule = MIXED_CATEGORY_RULES.find(
    (candidate) => candidate.categoryId === product.foodCategoryExternalId,
  );

  if (!rule) {
    return null;
  }

  const description = product.originalDescription;

  /**
   * Exclusion has priority over inclusion.
   *
   * Example:
   * "Whiskey sour mix" contains "whiskey",
   * but must be excluded as a cocktail mix.
   */
  if (rule.excludePatterns?.some((pattern) => pattern.test(description))) {
    return {
      decision: "EXCLUDE",
      reasonCode: "DESCRIPTION_EXCLUDED",
    };
  }

  if (rule.includePatterns?.some((pattern) => pattern.test(description))) {
    return {
      decision: "INCLUDE",
      reasonCode: "CATEGORY_INCLUDED",
    };
  }

  return null;
}

/**
 * Evaluates a product from a USDA category whose top-level
 * category policy is REVIEW.
 *
 * A mixed-category rule may promote the product to INCLUDE
 * or EXCLUDE.
 *
 * If the result is null, the caller preserves the original
 * category-level NEEDS_REVIEW decision.
 */
export function evaluateMixedCategory(product: NormalizedProduct): MixedCategoryEvaluation | null {
  switch (product.foodCategoryExternalId) {
    case "6":
      return evaluateSoupSauceProduct(product);

    case "7":
      return evaluateSausageAndLuncheonMeat(product);

    case "8":
      return evaluateBreakfastCereal(product);

    case "14":
      return evaluateBeverage(product);

    case "18":
      return evaluateBakedProduct(product);

    case "19":
      return evaluateSweetProduct(product);

    case "22":
      return evaluatePreparedMeal(product);

    case "23":
      return evaluateSnackProduct(product);

    case "24":
      return evaluateNativeFood(product);

    case "25":
      return evaluateRestaurantFood(product);

    default:
      return evaluateGenericMixedCategory(product);
  }
}
