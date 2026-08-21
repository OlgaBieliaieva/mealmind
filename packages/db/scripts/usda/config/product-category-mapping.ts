export interface ProductCategoryRefinementRule {
  readonly categoryCode: string;
  readonly patterns: readonly RegExp[];
}

export interface UsdaProductCategoryMapping {
  readonly fallbackCategoryCode: string;

  readonly refinementRules?: readonly ProductCategoryRefinementRule[];
}

/**
 * Minimal mapping for the 22 USDA food categories that are actually present
 * in the current curated USDA dataset.
 *
 * Broad USDA categories use a small number of deterministic refinements.
 * If none matches, the broad fallback category is used.
 */
export const USDA_PRODUCT_CATEGORY_MAPPING: Readonly<Record<string, UsdaProductCategoryMapping>> = {
  "1": {
    fallbackCategoryCode: "dairy_eggs",

    refinementRules: [
      {
        categoryCode: "yogurt",
        patterns: [/\byogurt\b/i, /\byoghurt\b/i],
      },

      {
        categoryCode: "cheese",
        patterns: [/\bcheese\b/i],
      },

      {
        categoryCode: "eggs",
        patterns: [/^egg\b/i, /^eggs\b/i],
      },

      {
        categoryCode: "milk",
        patterns: [/\bmilk\b/i, /\bbuttermilk\b/i],
      },
    ],
  },

  "2": {
    fallbackCategoryCode: "herbs_spices",

    refinementRules: [
      {
        categoryCode: "fresh_herbs",
        patterns: [/\bfresh\b/i],
      },

      {
        categoryCode: "dried_herbs_spices",
        patterns: [/^spices?\b/i, /\bdried\b/i, /\bpowder\b/i],
      },
    ],
  },

  "4": {
    fallbackCategoryCode: "fats_oils",

    refinementRules: [
      {
        categoryCode: "vegetable_oils",
        patterns: [
          /^oil\b/i,
          /\bvegetable oil\b/i,
          /\bolive oil\b/i,
          /\bcanola oil\b/i,
          /\bcorn oil\b/i,
          /\bsoybean oil\b/i,
          /\bsunflower oil\b/i,
          /\bflaxseed oil\b/i,
        ],
      },

      {
        categoryCode: "butter_margarine",
        patterns: [/\bbutter\b/i, /\bmargarine\b/i],
      },
    ],
  },

  "5": {
    fallbackCategoryCode: "poultry",

    refinementRules: [
      {
        categoryCode: "chicken",
        patterns: [/\bchicken\b/i],
      },

      {
        categoryCode: "turkey",
        patterns: [/\bturkey\b/i],
      },
    ],
  },

  "6": {
    fallbackCategoryCode: "soups_sauces_gravies",
  },

  "7": {
    fallbackCategoryCode: "processed_meat",
  },

  "8": {
    fallbackCategoryCode: "breakfast_cereals",

    refinementRules: [
      {
        categoryCode: "oats_cereals",
        patterns: [/\boat\b/i, /\boats\b/i],
      },
    ],
  },

  "9": {
    fallbackCategoryCode: "fruits",

    refinementRules: [
      {
        categoryCode: "citrus_fruits",
        patterns: [
          /\blemons?\b/i,
          /\blimes?\b/i,
          /\boranges?\b/i,
          /\bgrapefruits?\b/i,
          /\bmandarins?\b/i,
          /\btangerines?\b/i,
        ],
      },

      {
        categoryCode: "berries",
        patterns: [
          /\bstrawberr(?:y|ies)\b/i,
          /\bblueberr(?:y|ies)\b/i,
          /\braspberr(?:y|ies)\b/i,
          /\bblackberr(?:y|ies)\b/i,
          /\bcranberr(?:y|ies)\b/i,
        ],
      },

      /**
       * Prickly pear is a cactus fruit and must not be
       * classified as an apple/pear taxonomy member.
       */
      {
        categoryCode: "fruits",
        patterns: [/\bprickly pears?\b/i],
      },

      {
        categoryCode: "apples_pears",
        patterns: [/\bapples?\b/i, /\bpears?\b/i],
      },

      {
        categoryCode: "stone_fruits",
        patterns: [
          /\bpeaches?\b/i,
          /\bplums?\b/i,
          /\bapricots?\b/i,
          /\bcherr(?:y|ies)\b/i,
          /\bnectarines?\b/i,
        ],
      },

      {
        categoryCode: "tropical_fruits",
        patterns: [
          /\bbananas?\b/i,
          /\bmango(?:es|s)?\b/i,
          /\bpapayas?\b/i,
          /\bpineapples?\b/i,
          /\bkiwis?\b/i,
          /\bavocados?\b/i,
          /\bplantains?\b/i,
        ],
      },

      {
        categoryCode: "dried_fruits",
        patterns: [/\bdried\b/i, /\braisins?\b/i, /\bprunes?\b/i],
      },
    ],
  },

  "10": {
    fallbackCategoryCode: "pork",
  },

  "11": {
    fallbackCategoryCode: "vegetables",

    refinementRules: [
      {
        categoryCode: "alliums",
        patterns: [
          /\bonions?\b/i,
          /\bgarlic\b/i,
          /\bleeks?\b/i,
          /\bshallots?\b/i,
          /\bscallions?\b/i,
        ],
      },

      {
        categoryCode: "leafy_greens",
        patterns: [
          /\bspinach\b/i,
          /\blettuces?\b/i,
          /\barugula\b/i,
          /\bkale\b/i,
          /\bcollards?\b/i,
          /\bchard\b/i,
        ],
      },

      {
        categoryCode: "cruciferous",
        patterns: [
          /\bcabbages?\b/i,
          /\bbroccoli\b/i,
          /\bcauliflower\b/i,
          /\bbrussels sprouts?\b/i,
          /\bbok choy\b/i,
        ],
      },

      {
        categoryCode: "root_vegetables",
        patterns: [
          /\bpotatoes?\b/i,
          /\bsweet potatoes?\b/i,
          /\bcarrots?\b/i,
          /\bbeets?\b/i,
          /\bparsnips?\b/i,
          /\bturnips?\b/i,
          /\brutabagas?\b/i,
        ],
      },

      {
        categoryCode: "nightshades",
        patterns: [/\btomatoes?\b/i, /\bpeppers?\b/i, /\beggplants?\b/i],
      },

      {
        categoryCode: "squash_gourds",
        patterns: [/\bsquash(?:es)?\b/i, /\bzucchini\b/i, /\bpumpkins?\b/i, /\bcucumbers?\b/i],
      },
    ],
  },

  "12": {
    fallbackCategoryCode: "nuts_seeds",
  },

  "13": {
    fallbackCategoryCode: "beef",
  },

  "14": {
    fallbackCategoryCode: "beverages",

    refinementRules: [
      {
        categoryCode: "tea_coffee",
        patterns: [/\bcoffee\b/i, /\btea\b/i],
      },

      {
        categoryCode: "alcohol",
        patterns: [/\balcoholic beverage\b/i, /\bbeer\b/i, /\bwine\b/i],
      },

      {
        categoryCode: "juice",
        patterns: [/\bjuice\b/i],
      },

      {
        categoryCode: "soft_drinks",
        patterns: [/\bsoft drink\b/i, /\bcarbonated\b/i, /\bsoda\b/i],
      },

      {
        categoryCode: "water",
        patterns: [/^water\b/i],
      },

      {
        categoryCode: "milk",
        patterns: [/\balmond milk\b/i, /\bsoy milk\b/i, /\boat milk\b/i],
      },
    ],
  },

  "15": {
    fallbackCategoryCode: "fish_seafood",

    refinementRules: [
      {
        categoryCode: "shellfish",
        patterns: [
          /\bshrimp\b/i,
          /\bcrab\b/i,
          /\blobster\b/i,
          /\bscallop\b/i,
          /\boyster\b/i,
          /\bclam\b/i,
          /\bmussel\b/i,
          /\bsquid\b/i,
        ],
      },

      {
        categoryCode: "fatty_fish",
        patterns: [/\bsalmon\b/i, /\bmackerel\b/i, /\bsardine\b/i, /\bherring\b/i, /\btrout\b/i],
      },

      {
        categoryCode: "lean_fish",
        patterns: [
          /\bcod\b/i,
          /\bhaddock\b/i,
          /\btilapia\b/i,
          /\bpollock\b/i,
          /\bhalibut\b/i,
          /\btuna\b/i,
        ],
      },
    ],
  },

  "16": {
    fallbackCategoryCode: "miscellaneous",

    refinementRules: [
      {
        categoryCode: "beans",
        patterns: [
          /^beans?\b/i,
          /\bblack bean\b/i,
          /\bkidney bean\b/i,
          /\bpinto bean\b/i,
          /\bnavy bean\b/i,
        ],
      },

      {
        categoryCode: "lentils",
        patterns: [/\blentil\b/i],
      },

      {
        categoryCode: "peas",
        patterns: [/\bpea\b/i, /\bpeas\b/i],
      },

      {
        categoryCode: "legumes",
        patterns: [/\bchickpea\b/i, /\bgarbanzo\b/i, /\bsoybean\b/i],
      },
    ],
  },

  "17": {
    fallbackCategoryCode: "lamb_goat",

    refinementRules: [
      {
        categoryCode: "beef",

        patterns: [/\bveal\b/i],
      },
    ],
  },

  "18": {
    fallbackCategoryCode: "baked_goods",

    refinementRules: [
      {
        categoryCode: "cookies_biscuits",
        patterns: [/\bcookie\b/i, /\bbiscuit\b/i],
      },
    ],
  },

  "19": {
    fallbackCategoryCode: "confectionery",

    refinementRules: [
      {
        categoryCode: "chocolate",
        patterns: [/\bchocolate\b/i],
      },
    ],
  },

  "20": {
    fallbackCategoryCode: "grains_cereals",

    refinementRules: [
      {
        categoryCode: "rice",
        patterns: [/^rice\b/i, /\brice flour\b/i],
      },

      {
        categoryCode: "oats_cereals",
        patterns: [/\boat\b/i, /\boats\b/i],
      },

      {
        categoryCode: "wheat_pasta",
        patterns: [/\bwheat\b/i, /\bpasta\b/i, /\bspaghetti\b/i, /\bmacaroni\b/i, /\bsemolina\b/i],
      },

      {
        categoryCode: "quinoa_other",
        patterns: [
          /\bquinoa\b/i,
          /\bmillet\b/i,
          /\bbuckwheat\b/i,
          /\bamaranth\b/i,
          /\bsorghum\b/i,
          /\bbarley\b/i,
          /\brye\b/i,
        ],
      },
    ],
  },

  "22": {
    fallbackCategoryCode: "prepared_meals_sides",
  },

  "23": {
    fallbackCategoryCode: "snacks_sweets",

    refinementRules: [
      {
        categoryCode: "chips_crisps",
        patterns: [/\bchips?\b/i, /\bcrisps?\b/i],
      },

      {
        categoryCode: "cookies_biscuits",
        patterns: [/\bcookie\b/i, /\bcracker\b/i],
      },

      {
        categoryCode: "confectionery",
        patterns: [/\bcandy\b/i, /\bcandies\b/i],
      },
    ],
  },

  "25": {
    fallbackCategoryCode: "restaurant_food",
  },
} as const;
