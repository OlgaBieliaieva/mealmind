"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import { listRecipes, type RecipeStatus, type RecipeVisibility } from "@/shared/api/recipes";
import { Button, Card, PageState, SelectField, TextInput } from "@/shared/ui";
import { RECIPE_STATUS_LABELS } from "./recipe-labels";
const PAGE_SIZE = 20;
export function RecipeList() {
  const api = getBrowserApiClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<RecipeStatus | "">("");
  const [visibility, setVisibility] = useState<RecipeVisibility | "">("");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["admin-recipes", { search, status, visibility, page }],
    queryFn: () =>
      listRecipes(api, {
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(status ? { status } : {}),
        ...(visibility ? { visibility } : {}),
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
          <Button type="submit" variant="secondary">
            Застосувати
          </Button>
        </form>
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
