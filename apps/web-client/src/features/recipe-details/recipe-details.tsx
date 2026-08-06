"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import { getPublicRecipe } from "@/shared/api/recipes";
import { Button, PageState } from "@/shared/ui";
type Tab = "overview" | "ingredients" | "steps" | "nutrition";
const difficulty = { EASY: "Легко", MEDIUM: "Середньо", HARD: "Складно" } as const;
export function RecipeDetails({ recipeId }: { readonly recipeId: string }) {
  const query = useQuery({
    queryKey: ["recipe", recipeId],
    queryFn: () => getPublicRecipe(getBrowserApiClient(), recipeId),
  });
  const [tab, setTab] = useState<Tab>("overview");
  if (query.isPending) return <PageState kind="loading" title="Завантажуємо рецепт" />;
  if (query.isError)
    return (
      <PageState
        kind="error"
        title="Не вдалося відкрити рецепт"
        description="Рецепт не опублікований, недоступний або сталася помилка мережі."
        actions={<Button onClick={() => void query.refetch()}>Повторити</Button>}
      />
    );
  const recipe = query.data.data;
  const totalTime =
    (recipe.prepTimeMin ?? 0) + (recipe.cookTimeMin ?? 0) + (recipe.restTimeMin ?? 0);
  return (
    <article className="recipe-details" aria-labelledby="recipe-title">
      <header className="recipe-details__hero">
        <p className="recipe-details__eyebrow">{recipe.recipeTypeName ?? "Рецепт MealMind"}</p>
        <h1 id="recipe-title">{recipe.title}</h1>
        {recipe.summary ? <p>{recipe.summary}</p> : null}
        <ul className="recipe-details__stats" aria-label="Основні параметри">
          <li>
            <strong>{recipe.baseServings ?? "—"}</strong>
            <span>порцій</span>
          </li>
          <li>
            <strong>{totalTime || "—"}</strong>
            <span>хвилин</span>
          </li>
          <li>
            <strong>{recipe.difficulty ? difficulty[recipe.difficulty] : "—"}</strong>
            <span>складність</span>
          </li>
        </ul>
        {recipe.cuisines.length ? (
          <ul className="recipe-details__chips" aria-label="Кухні">
            {recipe.cuisines.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        ) : null}
      </header>
      <div className="recipe-tabs" role="tablist" aria-label="Розділи рецепта">
        {(
          [
            ["overview", "Огляд"],
            ["ingredients", "Інгредієнти"],
            ["steps", "Кроки"],
            ["nutrition", "Поживність"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            aria-controls={`recipe-panel-${value}`}
            id={`recipe-tab-${value}`}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "overview" ? (
        <section
          className="recipe-panel"
          role="tabpanel"
          id="recipe-panel-overview"
          aria-labelledby="recipe-tab-overview"
        >
          <h2>Про рецепт</h2>
          {recipe.description ? <p>{recipe.description}</p> : <p>Детальний опис не додано.</p>}
          {recipe.author ? (
            <section className="recipe-details__author">
              <h3>Автор: {recipe.author.displayName}</h3>
              {recipe.author.bio ? <p>{recipe.author.bio}</p> : null}
            </section>
          ) : null}
          {recipe.dietaryTags.length ? (
            <>
              <h3>Дієтичні позначки</h3>
              <ul className="recipe-details__chips">
                {recipe.dietaryTags.map((item) => (
                  <li key={item.id}>{item.name}</li>
                ))}
              </ul>
            </>
          ) : null}
          {recipe.videos.length ? (
            <>
              <h3>Відео</h3>
              <ul className="recipe-details__links">
                {recipe.videos.map((item) => (
                  <li key={item.id}>
                    <a href={item.externalUrl} target="_blank" rel="noreferrer">
                      {item.title ?? item.platform}
                    </a>
                    {item.durationSec ? ` · ${Math.ceil(item.durationSec / 60)} хв` : ""}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {recipe.sources.length ? (
            <>
              <h3>Джерела</h3>
              <ul className="recipe-details__links">
                {recipe.sources.map((item) => (
                  <li key={item.id}>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      {item.title ?? "Відкрити джерело"}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}
      {tab === "ingredients" ? (
        <section
          className="recipe-panel"
          role="tabpanel"
          id="recipe-panel-ingredients"
          aria-labelledby="recipe-tab-ingredients"
        >
          <h2>Інгредієнти</h2>
          <p>Розраховано на {recipe.baseServings ?? "вказану кількість"} порцій.</p>
          <ul className="recipe-ingredients">
            {recipe.ingredients.map((item) => (
              <li key={item.id}>
                <span>
                  <strong>{item.productName}</strong>
                  {item.note ? <small>{item.note}</small> : null}
                </span>
                <span>
                  {item.gramWeight} г{item.isOptional ? " · опційно" : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {tab === "steps" ? (
        <section
          className="recipe-panel"
          role="tabpanel"
          id="recipe-panel-steps"
          aria-labelledby="recipe-tab-steps"
        >
          <h2>Приготування</h2>
          <ol className="recipe-steps">
            {recipe.steps.map((item) => (
              <li key={item.id}>
                <div>
                  <h3>Крок {item.position}</h3>
                  <p>{item.instruction}</p>
                  {item.timerSeconds ? (
                    <p className="recipe-steps__timer">
                      Таймер: {Math.ceil(item.timerSeconds / 60)} хв
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {tab === "nutrition" ? (
        <section
          className="recipe-panel"
          role="tabpanel"
          id="recipe-panel-nutrition"
          aria-labelledby="recipe-tab-nutrition"
        >
          <h2>Поживність</h2>
          <p>
            На одну порцію. Часткові дані означають, що не всі продукти мають значення цього
            нутрієнта.
          </p>
          <div className="recipe-nutrients">
            {recipe.nutrients.map((item) => (
              <div key={item.nutrientId}>
                <span>{item.name}</span>
                <strong>
                  {item.valuePerServing ?? "—"} {unitLabel(item.unit)}
                </strong>
                <small>{item.completeness === "COMPLETE" ? "Повні дані" : "Часткові дані"}</small>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
function unitLabel(unit: string) {
  return (
    ({ KCAL: "ккал", G: "г", MG: "мг", MCG: "мкг", PERCENT: "%" } as Record<string, string>)[
      unit
    ] ?? unit.toLowerCase()
  );
}
