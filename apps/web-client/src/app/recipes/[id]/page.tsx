import type { Metadata } from "next";
import { RecipeDetails } from "@/features/recipe-details/recipe-details";
export const metadata: Metadata = { title: "Рецепт" };
export default async function RecipePage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  return <RecipeDetails recipeId={(await params).id} />;
}
