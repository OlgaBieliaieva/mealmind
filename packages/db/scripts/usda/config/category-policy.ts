import type { CurationDecision, CurationReasonCode } from "../src/types.js";

export type UsdaCategoryPolicy = "INCLUDE" | "EXCLUDE" | "REVIEW";

interface CategoryPolicyResult {
  readonly decision: CurationDecision;
  readonly reasonCode: CurationReasonCode;
}

export const USDA_CATEGORY_POLICY: Readonly<Record<string, UsdaCategoryPolicy>> = {
  "1": "INCLUDE", // Dairy and Egg Products
  "2": "INCLUDE", // Spices and Herbs
  "3": "EXCLUDE", // Baby Foods
  "4": "INCLUDE", // Fats and Oils
  "5": "INCLUDE", // Poultry Products
  "6": "REVIEW", // Soups, Sauces, and Gravies
  "7": "REVIEW", // Sausages and Luncheon Meats
  "8": "REVIEW", // Breakfast Cereals
  "9": "INCLUDE", // Fruits and Fruit Juices
  "10": "INCLUDE", // Pork Products
  "11": "INCLUDE", // Vegetables and Vegetable Products
  "12": "INCLUDE", // Nut and Seed Products
  "13": "INCLUDE", // Beef Products
  "14": "REVIEW", // Beverages
  "15": "INCLUDE", // Finfish and Shellfish Products
  "16": "INCLUDE", // Legumes and Legume Products
  "17": "INCLUDE", // Lamb, Veal, and Game Products
  "18": "REVIEW", // Baked Products
  "19": "REVIEW", // Sweets
  "20": "INCLUDE", // Cereal Grains and Pasta
  "21": "EXCLUDE", // Fast Foods
  "22": "REVIEW", // Meals, Entrees, and Side Dishes
  "23": "REVIEW", // Snacks
  "24": "REVIEW", // American Indian/Alaska Native Foods
  "25": "REVIEW", // Restaurant Foods
  "26": "EXCLUDE", // Branded Food Products Database
  "27": "EXCLUDE", // Quality Control Materials
  "28": "INCLUDE", // Alcoholic Beverages
};

export function evaluateCategoryPolicy(categoryId: string | null): CategoryPolicyResult {
  if (!categoryId) {
    return {
      decision: "NEEDS_REVIEW",
      reasonCode: "CATEGORY_MISSING",
    };
  }

  const policy = USDA_CATEGORY_POLICY[categoryId];

  if (!policy) {
    return {
      decision: "NEEDS_REVIEW",
      reasonCode: "CATEGORY_REQUIRES_REVIEW",
    };
  }

  switch (policy) {
    case "INCLUDE":
      return {
        decision: "INCLUDE",
        reasonCode: "CATEGORY_INCLUDED",
      };

    case "EXCLUDE":
      return {
        decision: "EXCLUDE",
        reasonCode: "CATEGORY_EXCLUDED",
      };

    case "REVIEW":
      return {
        decision: "NEEDS_REVIEW",
        reasonCode: "CATEGORY_REQUIRES_REVIEW",
      };
  }
}
