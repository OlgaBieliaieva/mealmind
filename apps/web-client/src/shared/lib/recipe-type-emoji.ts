export function getRecipeTypeEmoji(code?: string): string {
  const emoji: Record<string, string> = {
    breakfast: "🍳",
    appetizers: "🥟",
    soups: "🍲",
    main_dishes: "🍽️",
    sides: "🥔",
    salads: "🥗",
    bakery: "🥐",
    desserts: "🍰",
    sauces: "🥣",
    beverages: "🥤",
    snacks: "🥜",
    preserves: "🫙",
    baby_food: "🍼",
    medical: "🩺",
  };
  return (code && emoji[code]) || "🍲";
}
