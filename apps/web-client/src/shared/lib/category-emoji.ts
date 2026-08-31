const categoryEmoji: Readonly<Record<string, string>> = Object.freeze({
  // Fruits
  fruits: "🍎",
  citrus_fruits: "🍊",
  berries: "🫐",
  stone_fruits: "🍑",
  apples_pears: "🍐",
  tropical_fruits: "🥭",
  dried_fruits: "🍇",

  // Vegetables
  vegetables: "🥦",
  leafy_greens: "🥬",
  cruciferous: "🥦",
  root_vegetables: "🥕",
  alliums: "🧅",
  nightshades: "🍅",
  squash_gourds: "🎃",

  // Grains & cereals
  grains_cereals: "🌾",
  rice: "🍚",
  wheat_pasta: "🍝",
  oats_cereals: "🥣",
  quinoa_other: "🌾",
  breakfast_cereals: "🥣",

  // Legumes
  legumes: "🫘",
  beans: "🫘",
  lentils: "🫘",
  peas: "🫛",

  // Meat & poultry
  meat_poultry: "🥩",
  poultry: "🍗",
  chicken: "🐔",
  turkey: "🦃",
  beef: "🥩",
  pork: "🐖",
  lamb_goat: "🐐",
  processed_meat: "🌭",

  // Fish & seafood
  fish_seafood: "🐟",
  fatty_fish: "🐟",
  lean_fish: "🐠",
  shellfish: "🦐",

  // Dairy & eggs
  dairy_eggs: "🥛",
  milk: "🥛",
  cheese: "🧀",
  yogurt: "🥣",
  eggs: "🥚",

  // Fats & oils
  fats_oils: "🫒",
  butter_margarine: "🧈",
  vegetable_oils: "🫒",

  // Nuts & seeds
  nuts_seeds: "🥜",

  // Snacks & sweets
  snacks_sweets: "🍫",
  chocolate: "🍫",
  confectionery: "🍬",
  chips_crisps: "🥔",
  cookies_biscuits: "🍪",

  // Beverages
  beverages: "🥤",
  water: "💧",
  tea_coffee: "☕",
  juice: "🧃",
  soft_drinks: "🥤",
  alcohol: "🍷",

  // Herbs & spices
  herbs_spices: "🌿",
  fresh_herbs: "🌿",
  dried_herbs_spices: "🧂",

  // Other / source collections
  miscellaneous: "🍽️",
  american_indian_alaska_native_foods: "🌽",

  // Prepared foods
  prepared_foods: "🍱",
  baby_food: "👶",
  soups_sauces_gravies: "🍲",
  baked_goods: "🥖",
  fast_food: "🍔",
  prepared_meals_sides: "🍛",
  restaurant_food: "🍽️",
});

export function getCategoryEmoji(code: string | null | undefined): string {
  if (!code) return "🍽️";
  const normalized = code.toLowerCase().replaceAll("-", "_");
  if (categoryEmoji[normalized]) return categoryEmoji[normalized];
  const parent = Object.keys(categoryEmoji).find((key) => normalized.includes(key));
  return parent ? categoryEmoji[parent]! : "🍽️";
}
