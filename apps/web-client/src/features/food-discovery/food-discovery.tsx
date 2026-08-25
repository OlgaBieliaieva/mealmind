"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Heart,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { sanitizeReturnTo } from "@/features/auth/safe-return-to";
import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import {
  readRecipeFilterOptions,
  searchFood,
  setFoodFavorite,
  type FoodKind,
  type FoodSearchItem,
  type FoodSearchResponse,
  type RecipeDifficulty,
  type RecipeSearchFilters,
} from "@/shared/api/food";
import { getCategoryEmoji } from "@/shared/lib/category-emoji";

type Tab = "favorites" | "recipe" | "product";
type FilterKey = keyof RecipeSearchFilters;

const EMPTY_FILTERS: RecipeSearchFilters = {};
const DIFFICULTIES: readonly { value: RecipeDifficulty; label: string }[] = [
  { value: "EASY", label: "Легко" },
  { value: "MEDIUM", label: "Середньо" },
  { value: "HARD", label: "Складно" },
];

export function FoodDiscovery() {
  const parameters = useSearchParams();
  const returnTo = sanitizeReturnTo(parameters.get("returnTo"), "/plan");
  const memberId = parameters.get("memberId");
  const initialTab = readTab(parameters.get("tab"));
  const initialQuery = parameters.get("query") ?? "";
  const [input, setInput] = useState(initialQuery);
  const [queryText, setQueryText] = useState(initialQuery);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<RecipeSearchFilters>(() => readFilters(parameters));
  const [ingredientInput, setIngredientInput] = useState("");
  const [ingredientQuery, setIngredientQuery] = useState("");
  const [ingredientName, setIngredientName] = useState(parameters.get("ingredientName") ?? "");
  const queryClient = useQueryClient();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQueryText(input.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [input]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setIngredientQuery(ingredientInput.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [ingredientInput]);

  const favorites = tab === "favorites";
  const type = tab === "favorites" ? "all" : tab;
  const canSearch = favorites || tab === "recipe" || queryText.length >= 2;
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const latestRecipes = tab === "recipe" && queryText.length === 0 && activeFilters === 0;
  const results = useQuery({
    queryKey: ["food-search", { query: queryText, type, favorites, filters, page }],
    queryFn: ({ signal }) =>
      searchFood(
        getBrowserApiClient(),
        {
          query: queryText,
          type,
          favorites,
          ...(tab === "recipe" ? { filters } : {}),
          page,
          pageSize: latestRecipes ? 10 : 20,
        },
        signal,
      ),
    enabled: canSearch,
  });
  const filterOptions = useQuery({
    queryKey: ["recipe-filter-options"],
    queryFn: ({ signal }) => readRecipeFilterOptions(getBrowserApiClient(), signal),
    enabled: tab === "recipe",
    staleTime: 5 * 60 * 1000,
  });
  const ingredientResults = useQuery({
    queryKey: ["recipe-ingredient-search", ingredientQuery],
    queryFn: ({ signal }) =>
      searchFood(
        getBrowserApiClient(),
        {
          query: ingredientQuery,
          type: "product",
          favorites: false,
          pageSize: 8,
        },
        signal,
      ),
    enabled: tab === "recipe" && filtersOpen && ingredientQuery.length >= 2,
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ kind, id, favorite }: { kind: FoodKind; id: string; favorite: boolean }) =>
      setFoodFavorite(getBrowserApiClient(), kind, id, favorite),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["food-search"] });
      const snapshots = queryClient.getQueriesData<FoodSearchResponse>({
        queryKey: ["food-search"],
      });
      queryClient.setQueriesData<FoodSearchResponse>({ queryKey: ["food-search"] }, (current) =>
        current
          ? {
              ...current,
              data: {
                items: current.data.items.map((item) =>
                  item.id === variables.id && item.kind === variables.kind
                    ? { ...item, isFavorite: variables.favorite }
                    : item,
                ),
              },
            }
          : current,
      );
      return { snapshots };
    },
    onError: (_error, _variables, context) =>
      context?.snapshots.forEach(([key, value]) => queryClient.setQueryData(key, value)),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["food-search"] }),
  });

  const totalPages = results.data
    ? Math.max(1, Math.ceil(results.data.meta.total / results.data.meta.pageSize))
    : 1;
  const ingredientOptions = useMemo(
    () =>
      ingredientResults.data?.data.items.filter(
        (item): item is Extract<FoodSearchItem, { kind: "product" }> => item.kind === "product",
      ) ?? [],
    [ingredientResults.data],
  );

  function changeFilter(key: FilterKey, value: string) {
    setFilters((current) => ({ ...current, [key]: value || undefined }));
    setPage(1);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setIngredientInput("");
    setIngredientQuery("");
    setIngredientName("");
    setPage(1);
  }

  const discoveryState = new URLSearchParams({ returnTo, tab });
  if (queryText) discoveryState.set("query", queryText);
  if (memberId) discoveryState.set("memberId", memberId);
  for (const [key, value] of Object.entries(filters)) {
    if (value) discoveryState.set(key, value);
  }
  if (ingredientName) discoveryState.set("ingredientName", ingredientName);
  const detailsSuffix = new URLSearchParams({
    returnTo: "/plan/discover?" + discoveryState.toString(),
  });

  return (
    <section className="food-discovery" aria-labelledby="food-discovery-title">
      <header className="food-discovery__header">
        <Link href={returnTo} aria-label="Повернутися до плану">
          <ArrowLeft />
        </Link>
        <div>
          <p>{memberId ? "Пошук для вибраного члена сім’ї" : "Планування меню"}</p>
          <h1 id="food-discovery-title">Знайти їжу</h1>
        </div>
      </header>
      <div className="food-tabs" role="tablist" aria-label="Каталог їжі">
        {(
          [
            ["favorites", "Моя книга"],
            ["recipe", "Рецепти"],
            ["product", "Продукти"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => {
              setTab(value);
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="food-search-toolbar">
        <div className="food-search-field">
          <Search aria-hidden="true" />
          <label className="sr-only" htmlFor="food-search">
            Пошук продуктів і рецептів
          </label>
          <input
            id="food-search"
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={tab === "recipe" ? "Пошук рецептів" : "Пошук продуктів і рецептів"}
            autoComplete="off"
          />
        </div>
        {tab === "recipe" ? (
          <button
            type="button"
            className="food-filter-trigger"
            aria-expanded={filtersOpen}
            aria-controls="recipe-filters"
            onClick={() => setFiltersOpen((value) => !value)}
          >
            <Filter aria-hidden="true" />
            Фільтри{activeFilters ? ` (${activeFilters})` : ""}
          </button>
        ) : null}
      </div>
      {tab === "recipe" && filtersOpen ? (
        <section className="recipe-filters" id="recipe-filters" aria-label="Фільтри рецептів">
          <div className="recipe-filters__heading">
            <strong>Фільтрувати рецепти</strong>
            {activeFilters ? (
              <button type="button" onClick={clearFilters}>
                <X aria-hidden="true" /> Очистити
              </button>
            ) : null}
          </div>
          <div className="recipe-filters__grid">
            <FilterSelect
              id="recipe-difficulty"
              label="Складність"
              value={filters.difficulty}
              options={DIFFICULTIES}
              onChange={(value) => changeFilter("difficulty", value)}
            />
            <FilterSelect
              id="recipe-type"
              label="Тип"
              value={filters.recipeTypeId}
              options={filterOptions.data?.recipeTypes ?? []}
              onChange={(value) => changeFilter("recipeTypeId", value)}
            />
            <FilterSelect
              id="recipe-author"
              label="Автор"
              value={filters.authorId}
              options={filterOptions.data?.authors ?? []}
              onChange={(value) => changeFilter("authorId", value)}
            />
            <FilterSelect
              id="recipe-cuisine"
              label="Кухня"
              value={filters.cuisineId}
              options={filterOptions.data?.cuisines ?? []}
              onChange={(value) => changeFilter("cuisineId", value)}
            />
            <FilterSelect
              id="recipe-diet"
              label="Дієтична позначка"
              value={filters.dietaryTagId}
              options={filterOptions.data?.dietaryTags ?? []}
              onChange={(value) => changeFilter("dietaryTagId", value)}
            />
            <div className="ingredient-filter">
              <label htmlFor="recipe-ingredient">Інгредієнт</label>
              {filters.ingredientId ? (
                <div className="ingredient-filter__selected">
                  <span>{ingredientName}</span>
                  <button
                    type="button"
                    aria-label={`Прибрати інгредієнт ${ingredientName}`}
                    onClick={() => {
                      changeFilter("ingredientId", "");
                      setIngredientInput("");
                      setIngredientName("");
                    }}
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    id="recipe-ingredient"
                    type="search"
                    value={ingredientInput}
                    onChange={(event) => setIngredientInput(event.target.value)}
                    placeholder="Введіть назву продукту"
                    autoComplete="off"
                  />
                  {ingredientQuery.length >= 2 ? (
                    <div className="ingredient-filter__results" role="listbox">
                      {ingredientOptions.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          role="option"
                          aria-selected="false"
                          onClick={() => {
                            changeFilter("ingredientId", product.id);
                            setIngredientName(product.name);
                          }}
                        >
                          <span aria-hidden="true">{getCategoryEmoji(product.category.code)}</span>
                          {product.name}
                        </button>
                      ))}
                      {!ingredientResults.isPending && ingredientOptions.length === 0 ? (
                        <p>Продуктів не знайдено</p>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
          {filterOptions.isError ? (
            <p className="recipe-filters__error">Не вдалося завантажити довідники фільтрів.</p>
          ) : null}
        </section>
      ) : null}
      {latestRecipes ? (
        <div className="food-results-heading">
          <h2>Останні додані рецепти</h2>
          <p>10 найновіших рецептів каталогу</p>
        </div>
      ) : null}
      <div className="food-results" aria-live="polite">
        {tab === "product" && queryText.length < 2 ? (
          <div className="food-state">
            <span>🔎</span>
            <h2>Що бажаєте знайти?</h2>
            <p>Введіть щонайменше два символи.</p>
          </div>
        ) : null}
        {results.isPending && canSearch ? (
          <div className="food-state">
            <div className="food-loader" />
            <h2>Шукаємо у каталозі</h2>
          </div>
        ) : null}
        {results.isError ? (
          <div className="food-state">
            <span>⚠️</span>
            <h2>Пошук недоступний</h2>
            <button type="button" onClick={() => void results.refetch()}>
              Повторити
            </button>
          </div>
        ) : null}
        {results.data?.data.items.length === 0 ? (
          <div className="food-state">
            <span>{favorites ? "♡" : "🥣"}</span>
            <h2>{favorites ? "У книзі ще немає збереженої їжі" : "Нічого не знайдено"}</h2>
            <p>
              {favorites
                ? "Позначайте серцем продукти й рецепти, щоб швидко повертатися до них."
                : "Спробуйте змінити запит або фільтри."}
            </p>
          </div>
        ) : null}
        {results.data?.data.items.length ? (
          <ul className="food-result-list">
            {results.data.data.items.map((item) => (
              <FoodCard
                key={`${item.kind}-${item.id}`}
                item={item}
                detailsSuffix={detailsSuffix.toString()}
                favoritePending={favoriteMutation.isPending}
                onFavorite={() =>
                  favoriteMutation.mutate({
                    kind: item.kind,
                    id: item.id,
                    favorite: !item.isFavorite,
                  })
                }
              />
            ))}
          </ul>
        ) : null}
      </div>
      {results.data && totalPages > 1 && !latestRecipes ? (
        <nav className="food-pagination" aria-label="Сторінки результатів">
          <button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
            <ChevronLeft /> Назад
          </button>
          <span>
            {page} з {totalPages}
          </span>
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Далі <ChevronRight />
          </button>
        </nav>
      ) : null}
    </section>
  );
}

function FoodCard({
  item,
  detailsSuffix,
  favoritePending,
  onFavorite,
}: {
  readonly item: FoodSearchItem;
  readonly detailsSuffix: string;
  readonly favoritePending: boolean;
  readonly onFavorite: () => void;
}) {
  return (
    <li>
      <Link href={`/food/${item.kind}/${item.id}?${detailsSuffix}`}>
        <span className="food-result-list__image" aria-hidden="true">
          <span>
            {item.kind === "product"
              ? getCategoryEmoji(item.category.code)
              : getRecipeTypeEmoji(item.recipeType?.code)}
          </span>
          {item.imageUrl ? (
            // Signed URLs походять із приватного Supabase bucket і не мають сталого host.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt=""
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
            />
          ) : null}
        </span>
        <span className="food-result-list__content">
          <strong>{item.name}</strong>
          <NutritionLine item={item} />
          {item.kind === "product" ? (
            <small className="food-card-category">
              <span aria-hidden="true">{getCategoryEmoji(item.category.code)}</span>
              {item.category.name}
            </small>
          ) : (
            <RecipeMetadata item={item} />
          )}
        </span>
      </Link>
      <button
        type="button"
        className="favorite-button"
        aria-label={
          item.isFavorite ? `Видалити ${item.name} з обраного` : `Додати ${item.name} до обраного`
        }
        aria-pressed={item.isFavorite}
        disabled={favoritePending}
        onClick={onFavorite}
      >
        <Heart aria-hidden="true" fill={item.isFavorite ? "currentColor" : "none"} />
      </button>
    </li>
  );
}

function NutritionLine({ item }: { readonly item: FoodSearchItem }) {
  const nutrition = item.nutrition;
  const hasValues = [
    nutrition.energyKcal,
    nutrition.proteinG,
    nutrition.fatG,
    nutrition.carbohydrateG,
  ].some((value) => value !== null);
  if (!hasValues)
    return <small className="food-card-nutrition">Поживність ще не розрахована</small>;

  return (
    <small className="food-card-nutrition">
      <span aria-hidden="true">🔥</span>
      {formatNumber(nutrition.energyKcal)} ккал
      <span className="food-card-nutrition__basis">
        /{nutrition.basis === "PER_100G" ? "100 г" : "порцію"}
      </span>
      {" · "}Б {formatNumber(nutrition.proteinG)}
      {" · "}Ж {formatNumber(nutrition.fatG)}
      {" · "}В {formatNumber(nutrition.carbohydrateG)}
    </small>
  );
}

function RecipeMetadata({ item }: { readonly item: Extract<FoodSearchItem, { kind: "recipe" }> }) {
  const metadata = [
    item.totalTimeMin ? (
      <span key="time">
        <Clock3 aria-hidden="true" /> {item.totalTimeMin} хв
      </span>
    ) : null,
    item.difficulty ? <span key="difficulty">{difficultyLabel(item.difficulty)}</span> : null,
    item.recipeType ? <span key="type">{item.recipeType.name}</span> : null,
    ...item.cuisines.map((name) => <span key={`cuisine-${name}`}>{name}</span>),
    ...item.dietaryTags.map((name) => <span key={`diet-${name}`}>{name}</span>),
    item.author && item.author.type !== "MEALMIND" ? (
      <span key="author">Автор: {item.author.name}</span>
    ) : null,
  ].filter(Boolean);

  return metadata.length ? <small className="food-card-metadata">{metadata}</small> : null;
}

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string | undefined;
  readonly options: readonly {
    readonly value?: string;
    readonly id?: string;
    readonly label: string;
  }[];
  readonly onChange: (value: string) => void;
}) {
  return (
    <label className="recipe-filter-select" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
        <option value="">Усі</option>
        {options.map((option) => {
          const optionValue = option.value ?? option.id ?? "";
          return (
            <option key={optionValue} value={optionValue}>
              {option.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function formatNumber(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 }).format(value);
}

function difficultyLabel(value: RecipeDifficulty): string {
  return DIFFICULTIES.find((item) => item.value === value)?.label ?? value;
}

function getRecipeTypeEmoji(code?: string): string {
  const emoji: Record<string, string> = {
    breakfast: "🍳",
    appetizers: "🥟",
    soups: "🍲",
    main_dishes: "🍽️",
    sides: "🥔",
    salads: "🥗",
    bakery: "🥐",
    desserts: "🍰",
    sauces: "🥣",
    beverages: "🥤",
    snacks: "🥜",
    preserves: "🫙",
    baby_food: "🍼",
    medical: "🩺",
  };
  return (code && emoji[code]) || "🍲";
}

function readTab(value: string | null): Tab {
  return value === "recipe" || value === "product" || value === "favorites" ? value : "favorites";
}

function readFilters(parameters: URLSearchParams): RecipeSearchFilters {
  const difficulty = parameters.get("difficulty");
  return {
    ...(difficulty === "EASY" || difficulty === "MEDIUM" || difficulty === "HARD"
      ? { difficulty }
      : {}),
    ...optionalParameter(parameters, "recipeTypeId"),
    ...optionalParameter(parameters, "authorId"),
    ...optionalParameter(parameters, "ingredientId"),
    ...optionalParameter(parameters, "cuisineId"),
    ...optionalParameter(parameters, "dietaryTagId"),
  };
}

function optionalParameter(
  parameters: URLSearchParams,
  key: Exclude<keyof RecipeSearchFilters, "difficulty">,
): Partial<RecipeSearchFilters> {
  const value = parameters.get(key);
  return value ? { [key]: value } : {};
}
