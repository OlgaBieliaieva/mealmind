import type { Metadata } from "next";
import { RecipeEditor } from "@/features/recipes/recipe-editor";
export const metadata: Metadata = { title: "Редагування рецепта" };
export default async function RecipePage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  return <RecipeEditor recipeId={(await params).id} />;
}
