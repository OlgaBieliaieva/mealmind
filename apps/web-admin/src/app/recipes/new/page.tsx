import type { Metadata } from "next";
import { RecipeEditor } from "@/features/recipes/recipe-editor";
export const metadata: Metadata = { title: "Новий рецепт" };
export default function NewRecipePage() {
  return <RecipeEditor />;
}
