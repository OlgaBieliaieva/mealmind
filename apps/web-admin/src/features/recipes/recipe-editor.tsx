"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import {
  createReferenceData,
  listReferenceData,
  type ReferenceItem,
  type ReferenceResource,
} from "@/shared/api/reference-data";
import {
  changeRecipeStatus,
  createRecipe,
  getRecipe,
  previewRecipeNutrition,
  updateRecipe,
  type RecipeNutritionPreview,
} from "@/shared/api/recipes";
import { listProducts } from "@/shared/api/products";
import { showErrorToast } from "@/shared/feedback/error-toast";
import { PageState } from "@/shared/ui";
import { InlineAuthorForm } from "./inline-author-form";
import { RecipeForm, type RecipeOption } from "./recipe-form";
import { EMPTY_RECIPE_FORM, mapRecipeFormToWrite, mapRecipeToForm } from "./recipe-form-schema";
import { RecipeStatusActions } from "./recipe-status-actions";
export function RecipeEditor({ recipeId }: { readonly recipeId?: string }) {
  const api = getBrowserApiClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const editing = recipeId !== undefined;
  const [preview, setPreview] = useState<RecipeNutritionPreview | null>(null);
  const recipe = useQuery({
    queryKey: ["admin-recipe", recipeId],
    queryFn: () => getRecipe(api, recipeId as string),
    enabled: editing,
  });
  const products = useQuery({
    queryKey: ["admin-recipe-products"],
    queryFn: () => listProducts(api, { status: "ACTIVE", pageSize: 100 }),
  });
  const recipeTypes = useOptions("recipe-types");
  const authors = useOptions("authors");
  const cuisines = useOptions("cuisines");
  const dietaryTags = useOptions("dietary-tags");
  const nutrients = useOptions("nutrients");
  const initial = useMemo(
    () => (recipe.data ? mapRecipeToForm(recipe.data.data) : EMPTY_RECIPE_FORM),
    [recipe.data],
  );
  const save = useMutation({
    mutationFn: (values: typeof initial) =>
      editing
        ? updateRecipe(api, recipeId, mapRecipeFormToWrite(values))
        : createRecipe(api, mapRecipeFormToWrite(values)),
    onSuccess: async (response) => {
      toast.success(editing ? "Рецепт оновлено" : "Рецепт створено");
      await queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
      if (editing) await queryClient.invalidateQueries({ queryKey: ["admin-recipe", recipeId] });
      else router.push(`/recipes/${response.data.id}`);
    },
    onError: showErrorToast,
  });
  const previewMutation = useMutation({
    mutationFn: (values: typeof initial) =>
      previewRecipeNutrition(api, mapRecipeFormToWrite(values).ingredients),
    onSuccess: (response) => setPreview(response.data),
    onError: showErrorToast,
  });
  const status = useMutation({
    mutationFn: (target: Parameters<typeof changeRecipeStatus>[2]) =>
      changeRecipeStatus(api, recipeId as string, target),
    onSuccess: async () => {
      toast.success("Статус рецепта змінено");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-recipe", recipeId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-recipes"] }),
      ]);
    },
    onError: showErrorToast,
  });
  const authorCreate = useMutation({
    mutationFn: (data: {
      readonly type: string;
      readonly slug: string;
      readonly displayName: string;
    }) => createReferenceData(api, "authors", data),
    onSuccess: async () => {
      toast.success("Автора створено");
      await queryClient.invalidateQueries({ queryKey: ["admin-reference-options", "authors"] });
    },
    onError: showErrorToast,
  });
  const pending =
    (editing && recipe.isPending) ||
    products.isPending ||
    recipeTypes.isPending ||
    authors.isPending ||
    cuisines.isPending ||
    dietaryTags.isPending ||
    nutrients.isPending;
  const failed =
    (editing && recipe.isError) ||
    products.isError ||
    recipeTypes.isError ||
    authors.isError ||
    cuisines.isError ||
    dietaryTags.isError ||
    nutrients.isError;
  if (pending) return <PageState kind="loading" title="Завантажуємо редактор рецепта" />;
  if (failed)
    return (
      <PageState
        kind="error"
        title="Не вдалося відкрити редактор рецепта"
        actions={
          <Link className="ui-button ui-button--secondary" href="/recipes">
            До рецептів
          </Link>
        }
      />
    );
  const current = recipe.data?.data;
  const storedPreview = current
    ? {
        nutrients: current.nutrients.map((item) => ({
          nutrientId: item.nutrientId,
          valueTotal: item.valueTotal,
          completeness:
            item.completeness === "UNVERIFIED" ? ("PARTIAL" as const) : item.completeness,
        })),
        inputFingerprint: "",
        totalIngredientWeightG: current.ingredients
          .filter((item) => !item.isOptional)
          .reduce((sum, item) => sum + Number(item.gramWeight), 0)
          .toString(),
      }
    : null;
  return (
    <section className="admin-page recipe-page" aria-labelledby="recipe-editor-title">
      <header className="recipe-page__header">
        <div>
          <p className="admin-page__eyebrow">Каталог рецептів</p>
          <h1 id="recipe-editor-title">{current?.title ?? "Новий рецепт"}</h1>
          <p className="admin-page__description">
            Metadata, автор, інгредієнти, кроки, джерела та детермінована поживність.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/recipes">
          До списку
        </Link>
      </header>
      {current ? (
        <RecipeStatusActions
          status={current.status}
          isPending={status.isPending}
          onChange={(target) => status.mutate(target)}
        />
      ) : null}
      <InlineAuthorForm
        isPending={authorCreate.isPending}
        onCreate={(data) => authorCreate.mutateAsync(data).then(() => undefined)}
      />
      <RecipeForm
        mode={editing ? "edit" : "create"}
        initialValues={initial}
        products={(products.data?.data.items ?? []).map((item) => ({
          value: item.id,
          label: item.nameUa ?? item.nameEn,
        }))}
        recipeTypes={recipeTypes.options}
        authors={authors.options}
        cuisines={cuisines.options}
        dietaryTags={dietaryTags.options}
        nutrients={nutrients.options}
        preview={preview ?? storedPreview}
        isPreviewing={previewMutation.isPending}
        isSubmitting={save.isPending}
        onPreview={(values) => previewMutation.mutateAsync(values).then(() => undefined)}
        onSubmit={(values) => save.mutateAsync(values).then(() => undefined)}
      />
    </section>
  );
}
function useOptions(
  resource: Extract<
    ReferenceResource,
    "recipe-types" | "authors" | "cuisines" | "dietary-tags" | "nutrients"
  >,
) {
  const api = getBrowserApiClient();
  const query = useQuery({
    queryKey: ["admin-reference-options", resource],
    queryFn: () => listReferenceData(api, { resource, includeInactive: false, pageSize: 100 }),
  });
  return { ...query, options: (query.data?.data.items ?? []).map(option) };
}
function option(item: ReferenceItem): RecipeOption {
  for (const key of ["displayName", "nameUa", "name", "nameEn", "code"] as const) {
    if (typeof item[key] === "string") return { value: item.id, label: item[key] };
  }
  return { value: item.id, label: item.id };
}
