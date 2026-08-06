import type { Metadata } from "next";
import { RecipeList } from "@/features/recipes/recipe-list";
export const metadata: Metadata = { title: "Рецепти" };
export default function RecipesPage() {
  return <RecipeList />;
}
