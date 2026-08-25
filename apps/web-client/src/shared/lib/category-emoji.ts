const categoryEmoji: Readonly<Record<string, string>> = Object.freeze({
  fruits: "🍎",
  vegetables: "🥦",
  legumes: "🫘",
  grains: "🌾",
  cereals: "🥣",
  bakery: "🥖",
  dairy: "🥛",
  cheese: "🧀",
  eggs: "🥚",
  meat: "🥩",
  poultry: "🍗",
  fish: "🐟",
  seafood: "🦐",
  nuts: "🥜",
  seeds: "🌻",
  oils: "🫒",
  beverages: "🥤",
  sweets: "🍫",
  spices: "🌿",
  sauces: "🥫",
  soups: "🍲",
  prepared_foods: "🍱",
});

export function getCategoryEmoji(code: string | null | undefined): string {
  if (!code) return "🍽️";
  const normalized = code.toLowerCase().replaceAll("-", "_");
  if (categoryEmoji[normalized]) return categoryEmoji[normalized];
  const parent = Object.keys(categoryEmoji).find((key) => normalized.includes(key));
  return parent ? categoryEmoji[parent]! : "🍽️";
}
