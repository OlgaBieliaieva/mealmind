export interface UsdaFoodCategory {
  readonly id: string;
  readonly code: string;
  readonly description: string;
}

/**
 * Canonical USDA FoodData Central food categories.
 *
 * Source:
 * scripts/usda/data/raw/food_category.csv
 *
 * Keep IDs and codes as strings because CSV values are external
 * identifiers, not values used for arithmetic.
 */
export const USDA_FOOD_CATEGORIES: readonly UsdaFoodCategory[] = [
  {
    id: "1",
    code: "100",
    description: "Dairy and Egg Products",
  },
  {
    id: "2",
    code: "200",
    description: "Spices and Herbs",
  },
  {
    id: "3",
    code: "300",
    description: "Baby Foods",
  },
  {
    id: "4",
    code: "400",
    description: "Fats and Oils",
  },
  {
    id: "5",
    code: "500",
    description: "Poultry Products",
  },
  {
    id: "6",
    code: "600",
    description: "Soups, Sauces, and Gravies",
  },
  {
    id: "7",
    code: "700",
    description: "Sausages and Luncheon Meats",
  },
  {
    id: "8",
    code: "800",
    description: "Breakfast Cereals",
  },
  {
    id: "9",
    code: "900",
    description: "Fruits and Fruit Juices",
  },
  {
    id: "10",
    code: "1000",
    description: "Pork Products",
  },
  {
    id: "11",
    code: "1100",
    description: "Vegetables and Vegetable Products",
  },
  {
    id: "12",
    code: "1200",
    description: "Nut and Seed Products",
  },
  {
    id: "13",
    code: "1300",
    description: "Beef Products",
  },
  {
    id: "14",
    code: "1400",
    description: "Beverages",
  },
  {
    id: "15",
    code: "1500",
    description: "Finfish and Shellfish Products",
  },
  {
    id: "16",
    code: "1600",
    description: "Legumes and Legume Products",
  },
  {
    id: "17",
    code: "1700",
    description: "Lamb, Veal, and Game Products",
  },
  {
    id: "18",
    code: "1800",
    description: "Baked Products",
  },
  {
    id: "19",
    code: "1900",
    description: "Sweets",
  },
  {
    id: "20",
    code: "2000",
    description: "Cereal Grains and Pasta",
  },
  {
    id: "21",
    code: "2100",
    description: "Fast Foods",
  },
  {
    id: "22",
    code: "2200",
    description: "Meals, Entrees, and Side Dishes",
  },
  {
    id: "23",
    code: "2500",
    description: "Snacks",
  },
  {
    id: "24",
    code: "3500",
    description: "American Indian/Alaska Native Foods",
  },
  {
    id: "25",
    code: "3600",
    description: "Restaurant Foods",
  },
  {
    id: "26",
    code: "4500",
    description: "Branded Food Products Database",
  },
  {
    id: "27",
    code: "2600",
    description: "Quality Control Materials",
  },
  {
    id: "28",
    code: "1410",
    description: "Alcoholic Beverages",
  },
] as const;

export const USDA_FOOD_CATEGORY_BY_ID = new Map(
  USDA_FOOD_CATEGORIES.map((category) => [category.id, category]),
);

export const USDA_FOOD_CATEGORY_BY_CODE = new Map(
  USDA_FOOD_CATEGORIES.map((category) => [category.code, category]),
);
