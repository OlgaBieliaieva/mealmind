"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import {
  listRecipes,
  type RecipeAuthorType,
  type RecipeDifficulty,
  type RecipeStatus,
  type RecipeVisibility,
} from "@/shared/api/recipes";
import { Button, Card, PageState, SelectField, TextInput } from "@/shared/ui";
import { RECIPE_DIFFICULTY_LABELS, RECIPE_STATUS_LABELS } from "./recipe-labels";
const PAGE_SIZE = 20;
export function RecipeList() {
  const api = getBrowserApiClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState<RecipeStatus | "">(
    asRecipeStatus(searchParams.get("status")) ?? "",
  );
  const [visibility, setVisibility] = useState<RecipeVisibility | "">(
    asRecipeVisibility(searchParams.get("visibility")) ?? "",
  );
  const [difficulty, setDifficulty] = useState<RecipeDifficulty | "UNASSIGNED" | "">(
    asRecipeDifficulty(searchParams.get("difficulty")) ?? "",
  );
  const [authorType, setAuthorType] = useState<RecipeAuthorType | "UNASSIGNED" | "">(
    asAuthorType(searchParams.get("authorType")) ?? "",
  );
  const [creatorOrigin, setCreatorOrigin] = useState<"USER" | "SYSTEM" | "">(
    asCreatorOrigin(searchParams.get("creatorOrigin")) ?? "",
  );
  const recipeTypeId = searchParams.get("recipeTypeId") ?? undefined;
  const authorId = searchParams.get("authorId") ?? undefined;
  const cuisineId = searchParams.get("cuisineId") ?? undefined;
  const dietaryTagId = searchParams.get("dietaryTagId") ?? undefined;
  const includeArchived = searchParams.get("includeArchived") !== "false";
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: [
      "admin-recipes",
      {
        search,
        status,
        visibility,
        difficulty,
        authorType,
        creatorOrigin,
        recipeTypeId,
        authorId,
        cuisineId,
        dietaryTagId,
        includeArchived,
        page,
      },
    ],
    queryFn: () =>
      listRecipes(api, {
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(status ? { status } : {}),
        ...(visibility ? { visibility } : {}),
        ...(difficulty ? { difficulty } : {}),
        ...(authorType ? { authorType } : {}),
        ...(creatorOrigin ? { creatorOrigin } : {}),
        ...(recipeTypeId ? { recipeTypeId } : {}),
        ...(authorId ? { authorId } : {}),
        ...(cuisineId ? { cuisineId } : {}),
        ...(dietaryTagId ? { dietaryTagId } : {}),
        includeArchived,
        page,
        pageSize: PAGE_SIZE,
      }),
  });
  const pages = Math.max(1, Math.ceil((query.data?.meta.total ?? 0) / PAGE_SIZE));
  return (
    <section className="admin-page recipe-page" aria-labelledby="recipes-title">
      <header className="recipe-page__header">
        <div>
          <p className="admin-page__eyebrow">Каталог</p>
          <h1 id="recipes-title">Рецепти</h1>
          <p className="admin-page__description">
            Пошук, редагування, nutrition snapshot і lifecycle рецептів.
          </p>
        </div>
        <Link className="ui-button ui-button--primary" href="/recipes/new">
          Створити рецепт
        </Link>
      </header>
      <Card>
        <form
          className="recipe-filters"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            const next = new URLSearchParams();
            if (search.trim()) next.set("search", search.trim());
            if (status) next.set("status", status);
            if (visibility) next.set("visibility", visibility);
            if (difficulty) next.set("difficulty", difficulty);
            if (authorType) next.set("authorType", authorType);
            if (creatorOrigin) next.set("creatorOrigin", creatorOrigin);
            if (recipeTypeId) next.set("recipeTypeId", recipeTypeId);
            if (authorId) next.set("authorId", authorId);
            if (cuisineId) next.set("cuisineId", cuisineId);
            if (dietaryTagId) next.set("dietaryTagId", dietaryTagId);
            if (!includeArchived) next.set("includeArchived", "false");
            router.replace(`/recipes${next.size ? `?${next.toString()}` : ""}`);
          }}
        >
          <TextInput
            label="Пошук"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <SelectField
            label="Статус"
            value={status}
            onChange={(event) => setStatus(event.target.value as RecipeStatus | "")}
            options={[
              { value: "", label: "Усі статуси" },
              ...Object.entries(RECIPE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
          <SelectField
            label="Видимість"
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as RecipeVisibility | "")}
            options={[
              { value: "", label: "Усі" },
              { value: "PUBLIC", label: "Публічні" },
              { value: "FAMILY", label: "Сімейні" },
            ]}
          />
          <SelectField
            label="Складність"
            value={difficulty}
            onChange={(event) =>
              setDifficulty(event.target.value as RecipeDifficulty | "UNASSIGNED" | "")
            }
            options={[
              { value: "", label: "Усі" },
              ...Object.entries(RECIPE_DIFFICULTY_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
              { value: "UNASSIGNED", label: "Не вказано" },
            ]}
          />
          <SelectField
            label="Тип автора"
            value={authorType}
            onChange={(event) =>
              setAuthorType(event.target.value as RecipeAuthorType | "UNASSIGNED" | "")
            }
            options={[
              { value: "", label: "Усі" },
              { value: "MEALMIND", label: "MealMind" },
              { value: "EXPERT", label: "Експерт" },
              { value: "BLOGGER", label: "Блогер" },
              { value: "USER", label: "Користувач" },
              { value: "UNASSIGNED", label: "Без автора" },
            ]}
          />
          <SelectField
            label="Хто створив запис"
            value={creatorOrigin}
            onChange={(event) => setCreatorOrigin(event.target.value as "USER" | "SYSTEM" | "")}
            options={[
              { value: "", label: "Усі" },
              { value: "USER", label: "Користувач" },
              { value: "SYSTEM", label: "Система / імпорт" },
            ]}
          />
          <Button type="submit" variant="secondary">
            Застосувати
          </Button>
        </form>
        {recipeTypeId || authorId || cuisineId || dietaryTagId ? (
          <p className="recipe-filters__context">
            Застосовано перехід з аналітики. <Link href="/recipes">Скинути додаткові фільтри</Link>
          </p>
        ) : null}
      </Card>
      {query.isPending ? <PageState kind="loading" title="Завантажуємо рецепти" /> : null}
      {query.isError ? (
        <PageState
          kind="error"
          title="Не вдалося завантажити рецепти"
          actions={<Button onClick={() => void query.refetch()}>Повторити</Button>}
        />
      ) : null}
      {query.data?.data.items.length === 0 ? (
        <PageState
          kind="empty"
          title="Рецептів не знайдено"
          description="Змініть фільтри або створіть перший рецепт."
        />
      ) : null}
      {query.data?.data.items.length ? (
        <Card padding="none">
          <div className="recipe-table-scroll">
            <table className="recipe-table">
              <caption>Знайдено рецептів: {query.data.meta.total}</caption>
              <thead>
                <tr>
                  <th scope="col">Назва</th>
                  <th scope="col">Автор</th>
                  <th scope="col">Тип</th>
                  <th scope="col">Порції</th>
                  <th scope="col">Статус</th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link href={`/recipes/${item.id}`}>{item.title}</Link>
                    </td>
                    <td>{item.authorName ?? "—"}</td>
                    <td>{item.recipeTypeName ?? "—"}</td>
                    <td>{item.baseServings ?? "—"}</td>
                    <td>
                      <span className={`recipe-status recipe-status--${item.status.toLowerCase()}`}>
                        {RECIPE_STATUS_LABELS[item.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
      <nav className="recipe-pagination" aria-label="Сторінки рецептів">
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => setPage((value) => value - 1)}
        >
          Назад
        </Button>
        <span aria-live="polite">
          Сторінка {page} з {pages}
        </span>
        <Button
          variant="secondary"
          disabled={page >= pages}
          onClick={() => setPage((value) => value + 1)}
        >
          Далі
        </Button>
      </nav>
    </section>
  );
}

function asRecipeStatus(value: string | null): RecipeStatus | undefined {
  return value === "DRAFT" || value === "READY" || value === "PUBLISHED" || value === "ARCHIVED"
    ? value
    : undefined;
}
function asRecipeVisibility(value: string | null): RecipeVisibility | undefined {
  return value === "FAMILY" || value === "PUBLIC" ? value : undefined;
}
function asRecipeDifficulty(value: string | null): RecipeDifficulty | "UNASSIGNED" | undefined {
  return value === "EASY" || value === "MEDIUM" || value === "HARD" || value === "UNASSIGNED"
    ? value
    : undefined;
}
function asAuthorType(value: string | null): RecipeAuthorType | "UNASSIGNED" | undefined {
  return value === "MEALMIND" ||
    value === "EXPERT" ||
    value === "BLOGGER" ||
    value === "USER" ||
    value === "UNASSIGNED"
    ? value
    : undefined;
}
function asCreatorOrigin(value: string | null): "USER" | "SYSTEM" | undefined {
  return value === "USER" || value === "SYSTEM" ? value : undefined;
}
