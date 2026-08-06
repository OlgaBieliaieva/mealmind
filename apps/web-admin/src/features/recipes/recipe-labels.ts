import type { RecipeStatus } from "@/shared/api/recipes";

export const RECIPE_STATUS_LABELS: Readonly<Record<RecipeStatus, string>> = {
  DRAFT: "Чернетка",
  READY: "Готовий до публікації",
  PUBLISHED: "Опублікований",
  ARCHIVED: "Архівний",
};
export const RECIPE_DIFFICULTY_LABELS = {
  EASY: "Легко",
  MEDIUM: "Середньо",
  HARD: "Складно",
} as const;
