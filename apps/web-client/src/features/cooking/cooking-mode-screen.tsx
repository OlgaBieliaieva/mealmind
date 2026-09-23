"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  CookingPot,
  ExternalLink,
  Pencil,
  Plus,
  Scale,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ApiClientError, getUserFacingErrorMessage } from "@/shared/api/api-error";
import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import {
  addCookingIngredient,
  cancelCookingSession,
  completeCookingSession,
  deleteCookingIngredient,
  getCookingSession,
  updateCookingIngredient,
  updateCookingStep,
  updateCookingYield,
  type CookingSession,
} from "@/shared/api/cooking";
import { getFoodDetails, type FoodNutrient, type RecipeFoodDetails } from "@/shared/api/food";
import { searchProducts, type ProductSearchItem } from "@/shared/api/products";
import { Button, Modal, PageState } from "@/shared/ui";

import { useScreenWakeLock } from "./use-screen-wake-lock";

type CookingTab = "overview" | "ingredients" | "steps" | "nutrition";

const tabLabels: Readonly<Record<CookingTab, string>> = {
  overview: "Огляд",
  ingredients: "Інгредієнти",
  steps: "Кроки",
  nutrition: "Нутрієнти",
};

const MACRO_CODES = ["energy_kcal", "protein", "total_fat", "carbohydrate"] as const;

function grams(value: number | null): string {
  if (value === null) return "—";
  return `${new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 }).format(value)} г`;
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short" }).format(
    new Date(`${value}T12:00:00`),
  );
}

function difficultyLabel(value: string | null): string | null {
  return value ? ({ EASY: "Легко", MEDIUM: "Середньо", HARD: "Складно" }[value] ?? value) : null;
}

export function CookingModeScreen({ sessionId }: { readonly sessionId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["cooking-session", sessionId] as const;
  const [activeTab, setActiveTab] = useState<CookingTab>("overview");
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [addingIngredient, setAddingIngredient] = useState(false);
  const [yieldOpen, setYieldOpen] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => getCookingSession(getBrowserApiClient(), sessionId, signal),
  });
  const session = query.data?.data;
  const recipeQuery = useQuery({
    queryKey: ["food-details", "recipe", session?.recipeId],
    queryFn: () => getFoodDetails(getBrowserApiClient(), "recipe", session!.recipeId),
    enabled: Boolean(session),
  });
  const baseRecipe = recipeQuery.data?.data.kind === "recipe" ? recipeQuery.data.data : null;

  useScreenWakeLock(session?.status === "IN_PROGRESS");

  const accept = (next: CookingSession) => {
    queryClient.setQueryData(queryKey, { data: next });
    void queryClient.invalidateQueries({ queryKey: ["meal-plan"] });
    if (next.status === "COMPLETED") {
      void queryClient.invalidateQueries({ queryKey: ["consumption"] });
    }
  };
  const handleMutationError = async (error: unknown) => {
    if (error instanceof ApiClientError && error.statusCode === 409) {
      await query.refetch();
      toast.error("Стан приготування змінився в іншому вікні. Дані оновлено.");
      return;
    }
    toast.error(getUserFacingErrorMessage(error));
  };

  const ingredientMutation = useMutation({
    mutationFn: (input: {
      readonly ingredientId: string;
      readonly status: "USED" | "OMITTED" | "SUBSTITUTED";
      readonly productId?: string;
      readonly quantityGrams?: number;
    }) => {
      if (!session) throw new Error("Cooking session unavailable");
      return updateCookingIngredient(getBrowserApiClient(), session.id, input.ingredientId, {
        expectedRevision: session.revision,
        status: input.status,
        ...(input.productId ? { productId: input.productId } : {}),
        ...(input.quantityGrams === undefined ? {} : { quantityGrams: input.quantityGrams }),
      });
    },
    onSuccess: (response) => {
      accept(response.data);
      setEditingIngredientId(null);
    },
    onError: handleMutationError,
  });
  const addIngredientMutation = useMutation({
    mutationFn: (input: { readonly productId: string; readonly quantityGrams: number }) => {
      if (!session) throw new Error("Cooking session unavailable");
      return addCookingIngredient(getBrowserApiClient(), session.id, {
        expectedRevision: session.revision,
        ...input,
      });
    },
    onSuccess: (response) => {
      accept(response.data);
      setAddingIngredient(false);
    },
    onError: handleMutationError,
  });
  const deleteIngredientMutation = useMutation({
    mutationFn: (ingredientId: string) => {
      if (!session) throw new Error("Cooking session unavailable");
      return deleteCookingIngredient(
        getBrowserApiClient(),
        session.id,
        ingredientId,
        session.revision,
      );
    },
    onSuccess: (response) => accept(response.data),
    onError: handleMutationError,
  });
  const stepMutation = useMutation({
    mutationFn: (input: { readonly stepId: string; readonly status: "COMPLETED" | "SKIPPED" }) => {
      if (!session) throw new Error("Cooking session unavailable");
      return updateCookingStep(getBrowserApiClient(), session.id, input.stepId, {
        expectedRevision: session.revision,
        status: input.status,
      });
    },
    onSuccess: (response) => accept(response.data),
    onError: handleMutationError,
  });
  const yieldMutation = useMutation({
    mutationFn: (input: Parameters<typeof updateCookingYield>[2]) => {
      if (!session) throw new Error("Cooking session unavailable");
      return updateCookingYield(getBrowserApiClient(), session.id, input);
    },
    onSuccess: (response) => {
      accept(response.data);
      setYieldOpen(false);
    },
    onError: handleMutationError,
  });
  const completeMutation = useMutation({
    mutationFn: (resolvePending: boolean) => {
      if (!session) throw new Error("Cooking session unavailable");
      return completeCookingSession(
        getBrowserApiClient(),
        session.id,
        session.revision,
        resolvePending,
      );
    },
    onSuccess: (response) => {
      accept(response.data);
      setCompletionOpen(false);
      toast.success("Приготування завершено");
    },
    onError: handleMutationError,
  });
  const cancelMutation = useMutation({
    mutationFn: () => {
      if (!session) throw new Error("Cooking session unavailable");
      return cancelCookingSession(getBrowserApiClient(), session.id, session.revision);
    },
    onSuccess: (response) => {
      accept(response.data);
      toast.success("Приготування скасовано. Дні знову доступні для нового приготування.");
    },
    onError: handleMutationError,
  });

  if (query.isPending) {
    return <PageState kind="loading" title="Відкриваємо режим приготування" />;
  }
  if (query.isError || !session) {
    return (
      <PageState
        kind="error"
        title="Приготування недоступне"
        description="Session не знайдено або у вас немає до неї доступу."
        actions={<Button onClick={() => void query.refetch()}>Повторити</Button>}
      />
    );
  }

  const editingIngredient = session.ingredients.find((item) => item.id === editingIngredientId);
  const pendingCount =
    session.progress.totalIngredients -
    session.progress.resolvedIngredients +
    session.progress.totalSteps -
    session.progress.resolvedSteps;
  const mutationPending =
    ingredientMutation.isPending ||
    addIngredientMutation.isPending ||
    deleteIngredientMutation.isPending ||
    stepMutation.isPending ||
    yieldMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending;

  return (
    <article className="food-details cooking-mode" aria-labelledby="cooking-title">
      <header className="food-details__hero cooking-detail-hero">
        <nav className="food-details__nav" aria-label="Дії сторінки">
          <Link href="/plan" aria-label="Назад до плану харчування">
            <ArrowLeft aria-hidden="true" />
          </Link>
          <span className="cooking-detail-hero__icon" aria-hidden="true">
            <CookingPot />
          </span>
        </nav>
        <div className="food-details__hero-fallback" aria-hidden="true">
          <CookingPot />
        </div>
        {session.recipe.imageUrl ? (
          <Image
            src={session.recipe.imageUrl}
            alt={session.recipe.title}
            fill
            sizes="(max-width: 768px) 100vw, 64rem"
            unoptimized
          />
        ) : null}
      </header>
      <div className="food-details__sheet cooking-detail-sheet">
        <header className="food-details__title">
          <h1 id="cooking-title">{session.recipe.title}</h1>
          {session.recipe.summary ? <p>{session.recipe.summary}</p> : null}
        </header>
        <nav className="detail-tabs cooking-tabs" role="tablist" aria-label="Розділи рецепта">
          {(Object.keys(tabLabels) as CookingTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </nav>

        {session.status === "COMPLETED" ? (
          <div className="cooking-banner cooking-banner--success" role="status">
            <Check />
            <span>
              Приготування завершено
              {session.completedAt
                ? ` · ${new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.completedAt))}`
                : ""}
            </span>
          </div>
        ) : session.status === "CANCELLED" ? (
          <div className="cooking-banner" role="status">
            <X /> Це приготування скасовано. Прогрес збережено лише як історію.
          </div>
        ) : null}

        {session.planEntries.some((entry) => entry.removed) ? (
          <div className="cooking-banner" role="status">
            <CircleAlert /> Частину пов’язаних днів вилучено з активного плану. Snapshot
            приготування не змінено.
          </div>
        ) : null}

        <div className="cooking-content" role="tabpanel">
          {activeTab === "overview" ? (
            <CookingOverview
              session={session}
              baseRecipe={baseRecipe}
              baseRecipePending={recipeQuery.isPending}
            />
          ) : activeTab === "ingredients" ? (
            <CookingIngredients
              session={session}
              disabled={mutationPending || session.status !== "IN_PROGRESS"}
              onQuickUse={(ingredientId) =>
                ingredientMutation.mutate({ ingredientId, status: "USED" })
              }
              onEdit={setEditingIngredientId}
              onAdd={() => setAddingIngredient(true)}
              onDelete={(ingredientId) => deleteIngredientMutation.mutate(ingredientId)}
            />
          ) : activeTab === "steps" ? (
            <CookingSteps
              session={session}
              disabled={mutationPending || session.status !== "IN_PROGRESS"}
              onResolve={(stepId, status) => stepMutation.mutate({ stepId, status })}
            />
          ) : (
            <CookingNutrition session={session} />
          )}
        </div>
      </div>

      {session.status === "IN_PROGRESS" ? (
        <footer className="cooking-actions">
          <Button variant="secondary" disabled={mutationPending} onClick={() => setYieldOpen(true)}>
            <Scale /> Вага страви
          </Button>
          <Button disabled={mutationPending} onClick={() => setCompletionOpen(true)}>
            <Check /> Завершити
          </Button>
          <Button
            variant="danger"
            disabled={mutationPending}
            onClick={() =>
              toast("Скасувати це приготування?", {
                description: "Пов’язані дні можна буде використати для нової cooking session.",
                action: { label: "Скасувати", onClick: () => cancelMutation.mutate() },
                cancel: { label: "Залишити", onClick: () => undefined },
              })
            }
          >
            Скасувати приготування
          </Button>
        </footer>
      ) : null}

      <IngredientEditor
        key={`ingredient-editor-${editingIngredient?.id ?? "closed"}`}
        ingredient={editingIngredient ?? null}
        open={Boolean(editingIngredient)}
        pending={ingredientMutation.isPending}
        onClose={() => setEditingIngredientId(null)}
        onSave={(input) => ingredientMutation.mutate(input)}
      />
      <AddIngredientDialog
        key={`add-ingredient-${addingIngredient ? "open" : "closed"}`}
        open={addingIngredient}
        pending={addIngredientMutation.isPending}
        onClose={() => setAddingIngredient(false)}
        onSave={(input) => addIngredientMutation.mutate(input)}
      />
      <YieldDialog
        key={`${session.yield.method ?? "none"}-${session.revision}`}
        open={yieldOpen}
        session={session}
        pending={yieldMutation.isPending}
        onClose={() => setYieldOpen(false)}
        onSave={(input) => yieldMutation.mutate(input)}
      />
      <Modal
        open={completionOpen}
        title="Завершити приготування?"
        description={
          pendingCount > 0
            ? `Ще не підтверджено ${pendingCount} поз. MealMind вважатиме решту інгредієнтів використаними за рецептом, а кроки — виконаними.`
            : "Усі інгредієнти та кроки підтверджено. Після завершення cooking snapshot більше не можна буде змінити."
        }
        onClose={() => setCompletionOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCompletionOpen(false)}>
              Продовжити готування
            </Button>
            <Button
              isLoading={completeMutation.isPending}
              loadingLabel="Завершуємо…"
              onClick={() => completeMutation.mutate(pendingCount > 0)}
            >
              {pendingCount > 0 ? "Завершити автоматично" : "Завершити приготування"}
            </Button>
          </>
        }
      >
        {session.yield.actualWeightG === null ? (
          <p>Фактичну вагу не вказано — нутрієнти на 100 г залишаться орієнтовними.</p>
        ) : (
          <p>Фактична вага готової страви: {grams(session.yield.actualWeightG)}.</p>
        )}
      </Modal>
    </article>
  );
}

function CookingOverview({
  session,
  baseRecipe,
  baseRecipePending,
}: {
  readonly session: CookingSession;
  readonly baseRecipe: RecipeFoodDetails | null;
  readonly baseRecipePending: boolean;
}) {
  return (
    <div className="food-details__panels cooking-overview">
      <section className="recipe-fact-grid" aria-label="Основна інформація">
        <CookingFact value={minutes(session.recipe.prepTimeMin)} label="Підготовка" />
        <CookingFact value={minutes(session.recipe.cookTimeMin)} label="Приготування" />
        <CookingFact value={difficultyLabel(session.recipe.difficulty) ?? "—"} label="Складність" />
      </section>

      <section
        className="detail-card cooking-plan-context"
        aria-labelledby="cooking-plan-context-title"
      >
        <h2 id="cooking-plan-context-title">Готуємо для плану</h2>
        <ul>
          {session.planEntries.map((entry) => (
            <li key={entry.id}>
              <span>
                {dateLabel(entry.date)} · {entry.mealType}
              </span>
              <strong>{grams(entry.plannedDemandWeightG)}</strong>
              {entry.removed ? <small>Вилучено з активного плану</small> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="detail-card" aria-labelledby="cooking-macros-title">
        <div className="detail-card__heading">
          <h2 id="cooking-macros-title">Планові макронутрієнти</h2>
          <span>на 100 г базового рецепту</span>
        </div>
        {baseRecipe ? (
          <CookingMacroCards nutrients={baseRecipe.nutrients} />
        ) : (
          <p className="cooking-supporting-copy">
            {baseRecipePending
              ? "Завантажуємо дані базового рецепту…"
              : "Планові макронутрієнти недоступні."}
          </p>
        )}
      </section>

      <section className="detail-card" aria-labelledby="cooking-additional-title">
        <h2 id="cooking-additional-title">Додаткова інформація</h2>
        <dl className="detail-definition-list">
          <div>
            <dt>Тип страви</dt>
            <dd>{baseRecipe?.recipeType?.name ?? "Не вказано"}</dd>
          </div>
          <div>
            <dt>Кухня</dt>
            <dd>{baseRecipe?.cuisines.map((item) => item.name).join(", ") || "Не вказано"}</dd>
          </div>
          <div>
            <dt>Дієтичні позначки</dt>
            <dd>{baseRecipe?.dietaryTags.map((item) => item.name).join(", ") || "Немає"}</dd>
          </div>
        </dl>
      </section>

      {session.recipe.description ? (
        <section className="detail-card cooking-description" aria-labelledby="cooking-about-title">
          <h2 id="cooking-about-title">Про рецепт</h2>
          <p>{session.recipe.description}</p>
        </section>
      ) : null}

      {baseRecipe?.author ? <CookingAuthorCard author={baseRecipe.author} /> : null}

      {baseRecipe?.sources.length ? (
        <section className="detail-card" aria-labelledby="cooking-source-title">
          <h2 id="cooking-source-title">Джерело</h2>
          <ul className="source-list cooking-source-list">
            {baseRecipe.sources.map((source) => (
              <li key={source.id}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  <span>{source.title ?? "Відкрити оригінальний рецепт"}</span>
                  <ExternalLink aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function CookingFact({ value, label }: { readonly value: string; readonly label: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function CookingMacroCards({ nutrients }: { readonly nutrients: readonly FoodNutrient[] }) {
  const energy = nutrientValue(nutrients.find((item) => item.code === "energy_kcal"));
  return (
    <div className="macro-cards">
      {MACRO_CODES.map((code) => {
        const nutrient = nutrients.find((item) => item.code === code);
        const value = nutrientValue(nutrient);
        return (
          <div key={code} className={`macro-card macro-card--${code}`}>
            <span>{nutrient?.name ?? macroLabel(code)}</span>
            <strong>
              {value === null ? "—" : formatNumber(value)}{" "}
              {nutrient ? nutrientUnitLabel(nutrient.unit) : ""}
            </strong>
            <progress
              className="nutrient-progress"
              aria-label={`${formatNumber(macroEnergyPercent(code, value, energy))}% від загальної енергії`}
              max={100}
              value={macroEnergyPercent(code, value, energy)}
            />
          </div>
        );
      })}
    </div>
  );
}

function CookingAuthorCard({
  author,
}: {
  readonly author: NonNullable<RecipeFoodDetails["author"]>;
}) {
  return (
    <section className="detail-card author-card">
      <div className="author-card__avatar" aria-hidden="true">
        {author.avatarUrl ? (
          <Image src={author.avatarUrl} alt="" width={56} height={56} unoptimized />
        ) : (
          <UserRound />
        )}
      </div>
      <div>
        <h2>{author.name}</h2>
        {author.bio ? <p>{author.bio}</p> : <p>Опис автора ще не додано.</p>}
        {author.links.length ? (
          <ul className="author-links cooking-author-links" aria-label="Посилання автора">
            {author.links.map((link) => (
              <li key={link.id}>
                <a href={link.url} target="_blank" rel="noreferrer">
                  {authorLinkLabel(link.type)}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function minutes(value: number | null): string {
  return value === null ? "—" : `${value} хв`;
}

function nutrientValue(nutrient: FoodNutrient | undefined): number | null {
  if (nutrient?.valuePer100g === null || nutrient?.valuePer100g === undefined) return null;
  const value = Number(nutrient.valuePer100g);
  return Number.isFinite(value) ? value : null;
}

function macroEnergyPercent(code: string, value: number | null, energy: number | null): number {
  if (value === null || energy === null || energy <= 0) return 0;
  const factor = code === "total_fat" ? 9 : code === "protein" || code === "carbohydrate" ? 4 : 1;
  return Math.min(100, code === "energy_kcal" ? 100 : (value * factor * 100) / energy);
}

function macroLabel(code: (typeof MACRO_CODES)[number]): string {
  return {
    energy_kcal: "Енергія",
    protein: "Білки",
    total_fat: "Жири",
    carbohydrate: "Вуглеводи",
  }[code];
}

function nutrientUnitLabel(unit: string): string {
  return (
    ({ KCAL: "ккал", G: "г", MG: "мг", MCG: "мкг", PERCENT: "%" } as Record<string, string>)[
      unit
    ] ?? unit.toLowerCase()
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 }).format(value);
}

function authorLinkLabel(type: string): string {
  return (
    (
      {
        INSTAGRAM: "Instagram",
        YOUTUBE: "YouTube",
        TIKTOK: "TikTok",
        WEBSITE: "Вебсайт",
        OTHER: "Інше посилання",
      } as Record<string, string>
    )[type] ?? "Посилання"
  );
}

function CookingIngredients({
  session,
  disabled,
  onQuickUse,
  onEdit,
  onAdd,
  onDelete,
}: {
  readonly session: CookingSession;
  readonly disabled: boolean;
  readonly onQuickUse: (id: string) => void;
  readonly onEdit: (id: string) => void;
  readonly onAdd: () => void;
  readonly onDelete: (id: string) => void;
}) {
  return (
    <section className="recipe-panel cooking-section" aria-labelledby="cooking-ingredients-title">
      <header>
        <h2 id="cooking-ingredients-title">Інгредієнти</h2>
        <strong>
          {session.progress.resolvedIngredients} / {session.progress.totalIngredients}
        </strong>
      </header>
      <progress
        max={Math.max(session.progress.totalIngredients, 1)}
        value={session.progress.resolvedIngredients}
        aria-label="Прогрес інгредієнтів"
      />
      <ul className="cooking-ingredient-list">
        {session.ingredients.map((ingredient) => {
          const name =
            ingredient.actual?.productName ?? ingredient.planned?.productName ?? "Інгредієнт";
          const actualWeight = ingredient.actual?.gramWeight ?? null;
          const plannedWeight = ingredient.planned?.gramWeight ?? null;
          return (
            <li key={ingredient.id} data-status={ingredient.status}>
              <label>
                <input
                  type="checkbox"
                  checked={ingredient.status === "USED" || ingredient.status === "SUBSTITUTED"}
                  disabled={disabled || ingredient.status !== "PENDING"}
                  onChange={() => onQuickUse(ingredient.id)}
                  aria-label={`Підтвердити ${name}`}
                />
                <span>
                  <strong>{name}</strong>
                  <small>
                    {ingredient.status === "OMITTED"
                      ? "Не використано"
                      : ingredient.status === "SUBSTITUTED"
                        ? `Замість ${ingredient.planned?.productName ?? "інгредієнта"} · ${grams(actualWeight)}`
                        : ingredient.source === "ADDED_DURING_COOKING"
                          ? `Додано під час приготування · ${grams(actualWeight)}`
                          : ingredient.status === "PENDING"
                            ? `За рецептом · ${grams(plannedWeight)}`
                            : `Фактично · ${grams(actualWeight)}`}
                  </small>
                </span>
              </label>
              <div>
                {ingredient.source === "RECIPE" ? (
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Редагувати ${name}`}
                    onClick={() => onEdit(ingredient.id)}
                  >
                    <Pencil />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Видалити ${name}`}
                    onClick={() => onDelete(ingredient.id)}
                  >
                    <Trash2 />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {session.status === "IN_PROGRESS" ? (
        <Button variant="secondary" disabled={disabled} onClick={onAdd}>
          <Plus /> Додати інгредієнт
        </Button>
      ) : null}
    </section>
  );
}

function CookingSteps({
  session,
  disabled,
  onResolve,
}: {
  readonly session: CookingSession;
  readonly disabled: boolean;
  readonly onResolve: (id: string, status: "COMPLETED" | "SKIPPED") => void;
}) {
  return (
    <section className="recipe-panel cooking-section" aria-labelledby="cooking-steps-title">
      <header>
        <h2 id="cooking-steps-title">Кроки</h2>
        <strong>
          {session.progress.resolvedSteps} / {session.progress.totalSteps}
        </strong>
      </header>
      <progress
        max={Math.max(session.progress.totalSteps, 1)}
        value={session.progress.resolvedSteps}
        aria-label="Прогрес кроків"
      />
      <ol className="cooking-step-list">
        {session.steps.map((step) => (
          <li key={step.id} data-status={step.status}>
            <label>
              <input
                type="checkbox"
                checked={step.status === "COMPLETED"}
                disabled={disabled || step.status !== "PENDING"}
                onChange={() => onResolve(step.id, "COMPLETED")}
                aria-label={`Виконати крок ${step.position}`}
              />
              <span>
                <strong>Крок {step.position}</strong>
                <span>{step.instruction}</span>
                {step.timerSeconds ? (
                  <small>{Math.ceil(step.timerSeconds / 60)} хв за рецептом</small>
                ) : null}
              </span>
            </label>
            {step.status === "SKIPPED" ? (
              <em>Пропущено</em>
            ) : step.status === "PENDING" ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onResolve(step.id, "SKIPPED")}
              >
                Пропустити
              </button>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function CookingNutrition({ session }: { readonly session: CookingSession }) {
  const unresolved = session.progress.totalIngredients - session.progress.resolvedIngredients;
  return (
    <section
      className="recipe-panel cooking-section cooking-nutrition"
      aria-labelledby="cooking-nutrition-title"
    >
      <header>
        <div>
          <h2 id="cooking-nutrition-title">Фактичне приготування · на 100 г</h2>
          <p>
            {session.status === "COMPLETED"
              ? "Розраховано за фактично використаними інгредієнтами."
              : "Розраховано за інгредієнтами, які ви вже підтвердили."}
          </p>
        </div>
      </header>
      {unresolved > 0 ? (
        <div className="cooking-banner">
          <CircleAlert /> {unresolved} інгредієнт(и) ще не підтверджено. Розрахунок попередній.
        </div>
      ) : null}
      <p className="cooking-basis">
        {session.nutrition.basis === "ACTUAL"
          ? `На основі фактичної ваги ${grams(session.yield.actualWeightG)}.`
          : session.nutrition.basis === "PLANNED_ESTIMATE"
            ? `Орієнтовно за плановою вагою ${grams(session.yield.plannedWeightG)}.`
            : "Недостатньо даних для розрахунку на 100 г."}
        {session.nutrition.completeness === "PARTIAL"
          ? " Дані про склад часткові."
          : session.nutrition.completeness === "UNVERIFIED"
            ? " Частина продуктів ще не верифікована."
            : ""}
      </p>
      <dl className="cooking-nutrient-list">
        {session.nutrition.nutrients.map((nutrient) => (
          <div key={nutrient.nutrientId}>
            <dt>{nutrient.name}</dt>
            <dd>
              {nutrient.valuePer100g === null
                ? "—"
                : new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 2 }).format(
                    nutrient.valuePer100g,
                  )}{" "}
              {nutrient.valuePer100g === null ? "" : nutrient.unit.toLowerCase()}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ProductSearchField({
  selected,
  onSelect,
}: {
  readonly selected: ProductSearchItem | null;
  readonly onSelect: (product: ProductSearchItem) => void;
}) {
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["products", "cooking-search", search],
    queryFn: () => searchProducts({ search, page: 1, pageSize: 8 }),
    enabled: search.trim().length >= 2,
  });
  return (
    <div className="cooking-product-picker">
      <label>
        Знайти продукт
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Наприклад, петрушка"
        />
      </label>
      {selected ? (
        <p>
          Обрано: <strong>{selected.name}</strong>
        </p>
      ) : null}
      {query.isFetching ? <p role="status">Шукаємо…</p> : null}
      {query.data?.items.length ? (
        <ul>
          {query.data.items.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                aria-pressed={selected?.id === product.id}
                onClick={() => onSelect(product)}
              >
                <strong>{product.name}</strong>
                <small>
                  {product.categoryName}
                  {product.brandName ? ` · ${product.brandName}` : ""}
                </small>
              </button>
            </li>
          ))}
        </ul>
      ) : search.trim().length >= 2 && !query.isFetching ? (
        <p>Нічого не знайдено.</p>
      ) : null}
    </div>
  );
}

function IngredientEditor({
  ingredient,
  open,
  pending,
  onClose,
  onSave,
}: {
  readonly ingredient: CookingSession["ingredients"][number] | null;
  readonly open: boolean;
  readonly pending: boolean;
  readonly onClose: () => void;
  readonly onSave: (input: {
    readonly ingredientId: string;
    readonly status: "USED" | "OMITTED" | "SUBSTITUTED";
    readonly productId?: string;
    readonly quantityGrams?: number;
  }) => void;
}) {
  const [mode, setMode] = useState<"actual" | "substitute">("actual");
  const [quantity, setQuantity] = useState(
    String(ingredient?.actual?.gramWeight ?? ingredient?.planned?.gramWeight ?? ""),
  );
  const [replacement, setReplacement] = useState<ProductSearchItem | null>(null);
  if (!ingredient) return null;
  const title = ingredient.planned?.productName ?? "Інгредієнт";
  const parsed = Number(quantity);
  return (
    <Modal
      open={open}
      title={title}
      description={`За рецептом: ${grams(ingredient.planned?.gramWeight ?? null)}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Закрити
          </Button>
          <Button
            isLoading={pending}
            disabled={
              !Number.isFinite(parsed) || parsed <= 0 || (mode === "substitute" && !replacement)
            }
            onClick={() =>
              onSave({
                ingredientId: ingredient.id,
                status: mode === "substitute" ? "SUBSTITUTED" : "USED",
                quantityGrams: parsed,
                ...(replacement && mode === "substitute" ? { productId: replacement.id } : {}),
              })
            }
          >
            Зберегти
          </Button>
        </>
      }
    >
      <div className="cooking-form">
        <div className="cooking-segmented" role="group" aria-label="Спосіб зміни інгредієнта">
          <button type="button" aria-pressed={mode === "actual"} onClick={() => setMode("actual")}>
            Змінити вагу
          </button>
          <button
            type="button"
            aria-pressed={mode === "substitute"}
            onClick={() => setMode("substitute")}
          >
            Замінити продукт
          </button>
        </div>
        {mode === "substitute" ? (
          <ProductSearchField selected={replacement} onSelect={setReplacement} />
        ) : null}
        <label>
          Фактично, г
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </label>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => onSave({ ingredientId: ingredient.id, status: "OMITTED" })}
        >
          Не використовувати
        </Button>
      </div>
    </Modal>
  );
}

function AddIngredientDialog({
  open,
  pending,
  onClose,
  onSave,
}: {
  readonly open: boolean;
  readonly pending: boolean;
  readonly onClose: () => void;
  readonly onSave: (input: { readonly productId: string; readonly quantityGrams: number }) => void;
}) {
  const [product, setProduct] = useState<ProductSearchItem | null>(null);
  const [quantity, setQuantity] = useState("");
  const parsed = Number(quantity);
  return (
    <Modal
      open={open}
      title="Додати інгредієнт"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Закрити
          </Button>
          <Button
            isLoading={pending}
            disabled={!product || !Number.isFinite(parsed) || parsed <= 0}
            onClick={() => product && onSave({ productId: product.id, quantityGrams: parsed })}
          >
            Додати
          </Button>
        </>
      }
    >
      <div className="cooking-form">
        <ProductSearchField selected={product} onSelect={setProduct} />
        <label>
          Фактична вага, г
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </label>
      </div>
    </Modal>
  );
}

function YieldDialog({
  open,
  session,
  pending,
  onClose,
  onSave,
}: {
  readonly open: boolean;
  readonly session: CookingSession;
  readonly pending: boolean;
  readonly onClose: () => void;
  readonly onSave: (input: Parameters<typeof updateCookingYield>[2]) => void;
}) {
  const [method, setMethod] = useState<"DIRECT" | "CONTAINER_DIFFERENCE">(
    session.yield.method ?? "DIRECT",
  );
  const [actual, setActual] = useState(String(session.yield.actualWeightG ?? ""));
  const [tare, setTare] = useState(String(session.yield.tareWeightG ?? ""));
  const [gross, setGross] = useState(String(session.yield.grossWeightG ?? ""));
  const net = Number(gross) - Number(tare);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (method === "DIRECT")
      onSave({ expectedRevision: session.revision, method, actualWeightG: Number(actual) });
    else
      onSave({
        expectedRevision: session.revision,
        method,
        tareWeightG: Number(tare),
        grossWeightG: Number(gross),
      });
  };
  const valid =
    method === "DIRECT" ? Number(actual) > 0 : Number(tare) >= 0 && Number(gross) > Number(tare);
  return (
    <Modal
      open={open}
      title="Вага готової страви"
      description="Необов’язково. Допомагає точніше розрахувати нутрієнти на 100 г."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Закрити
          </Button>
          <Button form="cooking-yield-form" type="submit" isLoading={pending} disabled={!valid}>
            Зберегти
          </Button>
        </>
      }
    >
      <form id="cooking-yield-form" className="cooking-form" onSubmit={submit}>
        <div className="cooking-segmented" role="group" aria-label="Спосіб зважування">
          <button
            type="button"
            aria-pressed={method === "DIRECT"}
            onClick={() => setMethod("DIRECT")}
          >
            Вага страви
          </button>
          <button
            type="button"
            aria-pressed={method === "CONTAINER_DIFFERENCE"}
            onClick={() => setMethod("CONTAINER_DIFFERENCE")}
          >
            Разом із посудом
          </button>
        </div>
        {method === "DIRECT" ? (
          <label>
            Вага страви, г
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={actual}
              onChange={(event) => setActual(event.target.value)}
            />
          </label>
        ) : (
          <>
            <label>
              Вага порожнього посуду, г
              <input
                type="number"
                min="0"
                step="0.1"
                value={tare}
                onChange={(event) => setTare(event.target.value)}
              />
            </label>
            <label>
              Посуд зі стравою, г
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={gross}
                onChange={(event) => setGross(event.target.value)}
              />
            </label>
            <output>
              Вага страви: <strong>{valid ? grams(net) : "—"}</strong>
            </output>
          </>
        )}
        {session.yield.method ? (
          <Button
            variant="ghost"
            type="button"
            disabled={pending}
            onClick={() => onSave({ expectedRevision: session.revision, method: null })}
          >
            Очистити фактичну вагу
          </Button>
        ) : null}
      </form>
    </Modal>
  );
}
