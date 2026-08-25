"use client";
/* eslint-disable @next/next/no-img-element -- signed media URLs are dynamic and short-lived */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock3,
  ExternalLink,
  Globe,
  Heart,
  ImageIcon,
  PlayCircle,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";

import { sanitizeReturnTo } from "@/features/auth/safe-return-to";
import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import {
  getFoodDetails,
  setFoodFavorite,
  type FoodDetails as FoodDetailsContract,
  type FoodKind,
  type FoodNutrient,
  type RecipeDifficulty,
} from "@/shared/api/food";
import { getCategoryEmoji } from "@/shared/lib/category-emoji";
import { Button, PageState } from "@/shared/ui";

const MACRO_CODES = ["energy_kcal", "protein", "total_fat", "carbohydrate"] as const;
const DIFFICULTY: Record<RecipeDifficulty, string> = {
  EASY: "Легко",
  MEDIUM: "Середньо",
  HARD: "Складно",
};
const NUTRIENT_GROUPS: Record<string, string> = {
  ENERGY: "Енергія",
  MACRONUTRIENT: "Макронутрієнти",
  FATTY_ACID: "Жири",
  VITAMIN: "Вітаміни",
  MINERAL: "Мінерали",
  OTHER: "Інші нутрієнти",
};

export function FoodDetails({ kind, id }: { readonly kind: FoodKind; readonly id: string }) {
  const returnTo = sanitizeReturnTo(useSearchParams().get("returnTo"), "/plan/discover");
  const queryClient = useQueryClient();
  const queryKey = ["food-details", kind, id] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => getFoodDetails(getBrowserApiClient(), kind, id),
  });
  const favorite = useMutation({
    mutationFn: (next: boolean) => setFoodFavorite(getBrowserApiClient(), kind, id, next),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ data: FoodDetailsContract }>(queryKey);
      queryClient.setQueryData(
        queryKey,
        previous ? { data: { ...previous.data, isFavorite: next } } : previous,
      );
      return { previous };
    },
    onError: (_error, _next, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ["food-search"] });
    },
  });

  if (query.isPending) return <PageState kind="loading" title="Завантажуємо деталі" />;
  if (query.isError) {
    return (
      <PageState
        kind="error"
        title="Їжу не знайдено"
        description="Вона могла стати недоступною для вашої сім’ї."
        actions={<Button onClick={() => void query.refetch()}>Повторити</Button>}
      />
    );
  }

  const food = query.data.data;
  const selfPath =
    "/food/" + food.kind + "/" + food.id + "?returnTo=" + encodeURIComponent(returnTo);

  return (
    <article className="food-details" aria-labelledby="food-details-title">
      {food.kind === "product" ? (
        <ProductDetails
          food={food}
          returnTo={returnTo}
          selfPath={selfPath}
          onFavorite={() => favorite.mutate(!food.isFavorite)}
        />
      ) : (
        <RecipeDetails
          food={food}
          returnTo={returnTo}
          selfPath={selfPath}
          onFavorite={() => favorite.mutate(!food.isFavorite)}
        />
      )}
    </article>
  );
}

function ProductDetails({
  food,
  returnTo,
  selfPath,
  onFavorite,
}: {
  readonly food: Extract<FoodDetailsContract, { kind: "product" }>;
  readonly returnTo: string;
  readonly selfPath: string;
  readonly onFavorite: () => void;
}) {
  const [tab, setTab] = useState<"overview" | "nutrients" | "recipes">("overview");
  const macros = food.nutrients.filter((item) => MACRO_CODES.includes(item.code as never));

  return (
    <>
      <DetailHero
        returnTo={returnTo}
        favorite={food.isFavorite}
        onFavorite={onFavorite}
        imageUrl={food.imageUrl}
        fallback={getCategoryEmoji(food.category.code)}
        imageAlt={food.name}
      />
      <div className="food-details__sheet">
        <header className="food-details__title">
          <h1 id="food-details-title">{food.name}</h1>
          <p>{food.category.name}</p>
        </header>
        <DetailTabs
          value={tab}
          onChange={(value) => setTab(value as typeof tab)}
          tabs={[
            ["overview", "Огляд"],
            ["nutrients", "Нутрієнти"],
            ["recipes", "Рецепти"],
          ]}
        />
        {tab === "overview" ? (
          <div className="food-details__panels">
            <section className="detail-card" aria-labelledby="product-macros-title">
              <div className="detail-card__heading">
                <h2 id="product-macros-title">Макронутрієнти</h2>
                <span>на 100 г</span>
              </div>
              <MacroCards nutrients={macros} valueKey="valuePer100g" />
            </section>
            <section className="detail-card">
              <h2>Про продукт</h2>
              <dl className="detail-definition-list">
                <div>
                  <dt>Категорія</dt>
                  <dd>{food.category.name}</dd>
                </div>
                <div>
                  <dt>Базова одиниця</dt>
                  <dd>{food.defaultUnit.symbol}</dd>
                </div>
              </dl>
              {food.portions.length ? (
                <>
                  <h3>Типові порції</h3>
                  <ul className="portion-list">
                    {food.portions.map((portion) => (
                      <li key={portion.id}>
                        <span>{portion.label}</span>
                        <strong>{formatNumber(portion.gramWeight)} г</strong>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>
            {food.brand ? (
              <section className="detail-card">
                <h2>Бренд</h2>
                <dl className="detail-definition-list">
                  <div>
                    <dt>Назва</dt>
                    <dd>{food.brand.name}</dd>
                  </div>
                  <div>
                    <dt>Країна реєстрації</dt>
                    <dd>{food.brand.countryCode ?? "Не вказано"}</dd>
                  </div>
                </dl>
                {food.brand.websiteUrl ? (
                  <a
                    className="detail-external-link"
                    href={food.brand.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Відкрити сайт бренду <ExternalLink aria-hidden="true" />
                  </a>
                ) : null}
              </section>
            ) : null}
          </div>
        ) : null}
        {tab === "nutrients" ? (
          <NutrientPanel
            nutrients={food.nutrients}
            valueKey="valuePer100g"
            caption="Значення наведені на 100 г продукту"
          />
        ) : null}
        {tab === "recipes" ? (
          <section className="food-details__panels">
            {food.relatedRecipes.length ? (
              <>
                <h2 className="detail-section-title">Рецепти з цим продуктом</h2>
                <ul className="related-recipe-cards">
                  {food.relatedRecipes.map((recipe) => (
                    <RelatedRecipeCard key={recipe.id} recipe={recipe} returnTo={selfPath} />
                  ))}
                </ul>
              </>
            ) : (
              <div className="detail-empty-state">
                <span aria-hidden="true">📖</span>
                <h2>Рецептів поки немає</h2>
                <p>Цей продукт ще не використовується в опублікованих рецептах.</p>
                <button
                  type="button"
                  disabled
                  title="Створення користувацьких рецептів буде додано окремо"
                >
                  Створити рецепт
                </button>
                <small>Створення власних рецептів з’явиться в наступному етапі.</small>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </>
  );
}

function RecipeDetails({
  food,
  returnTo,
  selfPath,
  onFavorite,
}: {
  readonly food: Extract<FoodDetailsContract, { kind: "recipe" }>;
  readonly returnTo: string;
  readonly selfPath: string;
  readonly onFavorite: () => void;
}) {
  const [tab, setTab] = useState<"overview" | "ingredients" | "steps" | "nutrients">("overview");
  const [selectedImage, setSelectedImage] = useState<{
    readonly url: string;
    readonly alt: string;
  } | null>(null);
  const servingWeight = divide(food.yieldWeightG, food.baseServings);
  const macros = food.nutrients.filter((item) => MACRO_CODES.includes(item.code as never));
  const galleryImages = food.images.flatMap((image) =>
    image.imageUrl
      ? [{ id: image.id, url: image.imageUrl, alt: image.altText ?? image.title ?? food.title }]
      : [],
  );
  const showMedia = galleryImages.length > 2 || food.videos.length > 0;

  return (
    <>
      <DetailHero
        returnTo={returnTo}
        favorite={food.isFavorite}
        onFavorite={onFavorite}
        imageUrl={food.imageUrl}
        fallback={recipeTypeEmoji(food.recipeType?.code)}
        imageAlt={food.title}
      />
      <div className="food-details__sheet">
        <header className="food-details__title">
          <h1 id="food-details-title">{food.title}</h1>
          {food.summary ? <p>{food.summary}</p> : null}
        </header>
        <DetailTabs
          value={tab}
          onChange={(value) => setTab(value as typeof tab)}
          tabs={[
            ["overview", "Огляд"],
            ["ingredients", "Інгредієнти"],
            ["steps", "Кроки"],
            ["nutrients", "Нутрієнти"],
          ]}
        />
        {tab === "overview" ? (
          <div className="food-details__panels">
            <section className="recipe-fact-grid" aria-label="Загальна інформація">
              <Fact value={minutes(food.prepTimeMin)} label="Підготовка" />
              <Fact value={minutes(food.cookTimeMin)} label="Приготування" />
              <Fact
                value={food.difficulty ? DIFFICULTY[food.difficulty] : "—"}
                label="Складність"
              />
              <Fact value={String(food.baseServings ?? "—")} label="Порцій" />
              <Fact value={wholeGrams(servingWeight)} label="Вага порції" />
              <Fact value={wholeGrams(numberValue(food.yieldWeightG))} label="Вага страви" />
            </section>
            <section className="detail-card">
              <div className="detail-card__heading">
                <h2>Макронутрієнти</h2>
                <span>на 100 г</span>
              </div>
              <MacroCards nutrients={macros} valueKey="valuePer100g" />
            </section>
            <section className="detail-card">
              <h2>Додаткова інформація</h2>
              <dl className="detail-definition-list">
                <div>
                  <dt>Тип страви</dt>
                  <dd>{food.recipeType?.name ?? "Не вказано"}</dd>
                </div>
                <div>
                  <dt>Кухня</dt>
                  <dd>{food.cuisines.map((item) => item.name).join(", ") || "Не вказано"}</dd>
                </div>
                <div>
                  <dt>Дієтичні позначки</dt>
                  <dd>{food.dietaryTags.map((item) => item.name).join(", ") || "Немає"}</dd>
                </div>
              </dl>
            </section>
            {food.author ? <AuthorCard author={food.author} /> : null}
            {food.description ? (
              <section className="detail-card detail-description">
                <h2>Про рецепт</h2>
                <ExpandableText text={food.description} />
              </section>
            ) : null}
            {showMedia ? (
              <section className="detail-media-section">
                <h2>Медіа</h2>
                {galleryImages.length > 2 ? (
                  <div className="detail-photo-gallery" aria-label="Фотографії рецепта">
                    {galleryImages.map((image) => (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => setSelectedImage({ url: image.url, alt: image.alt })}
                        aria-label={"Збільшити фотографію: " + image.alt}
                      >
                        <img src={image.url} alt={image.alt} />
                      </button>
                    ))}
                  </div>
                ) : null}
                {food.videos.length ? (
                  <div className="detail-video-list">
                    <h3>Відео ({food.videos.length})</h3>
                    {food.videos.map((video) => (
                      <a key={video.id} href={video.externalUrl} target="_blank" rel="noreferrer">
                        <span className="detail-video-card__icon" aria-hidden="true">
                          <PlayCircle />
                        </span>
                        <span className="detail-video-card__content">
                          <strong>{video.title ?? "Переглянути відео"}</strong>
                          <small>{videoPlatformLabel(video.platform)}</small>
                        </span>
                        <ExternalLink aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}
            {food.sources.length ? (
              <section className="detail-card">
                <h2>Джерело</h2>
                <ul className="source-list">
                  {food.sources.map((source) => (
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
        ) : null}
        {tab === "ingredients" ? (
          <div className="food-details__panels">
            <section className="ingredient-summary" aria-label="Параметри рецепта">
              <Fact value={String(food.baseServings ?? "—")} label="Порцій" />
              <Fact value={wholeGrams(servingWeight)} label="Вага порції" />
              <Fact value={wholeGrams(numberValue(food.yieldWeightG))} label="Загальна вага" />
            </section>
            <section>
              <h2 className="detail-section-title">Інгредієнти ({food.ingredients.length})</h2>
              <ul className="ingredient-cards">
                {food.ingredients.map((ingredient) => (
                  <li key={ingredient.id}>
                    <Link
                      href={
                        "/food/product/" +
                        ingredient.productId +
                        "?returnTo=" +
                        encodeURIComponent(selfPath)
                      }
                    >
                      <DetailThumbnail
                        imageUrl={ingredient.imageUrl}
                        fallback={getCategoryEmoji(ingredient.category.code)}
                        alt={ingredient.productName}
                      />
                      <span className="ingredient-card__content">
                        <strong>{ingredient.productName}</strong>
                        <small className="ingredient-card__nutrition">
                          {nutritionSummary(ingredient.nutrition)}
                        </small>
                        <small>
                          <span aria-hidden="true">
                            {getCategoryEmoji(ingredient.category.code)}
                          </span>{" "}
                          {ingredient.category.name}
                        </small>
                      </span>
                      <span className="ingredient-card__amount">
                        {ingredient.gramWeight
                          ? formatNumber(ingredient.gramWeight) + " г"
                          : formatNumber(ingredient.quantity) + " " + (ingredient.unitSymbol ?? "")}
                        {ingredient.isOptional ? <small>опційно</small> : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
        {tab === "steps" ? (
          <section className="food-details__panels">
            <h2 className="detail-section-title">Кроки ({food.steps.length})</h2>
            <ol className="detail-steps">
              {food.steps.map((step) => (
                <li key={step.id}>
                  <span>{step.position}</span>
                  <div>
                    <p>{step.instruction}</p>
                    {step.timerSeconds ? (
                      <small>
                        <Clock3 aria-hidden="true" /> {Math.ceil(step.timerSeconds / 60)} хв
                      </small>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        {tab === "nutrients" ? (
          <NutrientPanel
            nutrients={food.nutrients}
            valueKey="valuePer100g"
            caption="Значення наведені на 100 г готової страви"
          />
        ) : null}
      </div>
      {selectedImage ? (
        <div
          className="detail-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Збільшена фотографія рецепта"
        >
          <button
            className="detail-lightbox__backdrop"
            type="button"
            aria-label="Закрити перегляд фотографії"
            onClick={() => setSelectedImage(null)}
          />
          <div className="detail-lightbox__content">
            <button type="button" aria-label="Закрити" onClick={() => setSelectedImage(null)}>
              <X aria-hidden="true" />
            </button>
            <img src={selectedImage.url} alt={selectedImage.alt} />
          </div>
        </div>
      ) : null}
    </>
  );
}

function DetailHero({
  returnTo,
  favorite,
  onFavorite,
  imageUrl,
  fallback,
  imageAlt,
}: {
  readonly returnTo: string;
  readonly favorite: boolean;
  readonly onFavorite: () => void;
  readonly imageUrl: string | null;
  readonly fallback: string;
  readonly imageAlt: string;
}) {
  return (
    <header className="food-details__hero">
      <nav className="food-details__nav" aria-label="Дії сторінки">
        <Link href={returnTo} aria-label="Повернутися до результатів пошуку">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <button
          type="button"
          aria-label={favorite ? "Видалити з обраного" : "Додати до обраного"}
          aria-pressed={favorite}
          onClick={onFavorite}
        >
          <Heart aria-hidden="true" fill={favorite ? "currentColor" : "none"} />
        </button>
      </nav>
      <div className="food-details__hero-fallback" aria-hidden="true">
        {fallback}
      </div>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={imageAlt}
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      ) : null}
    </header>
  );
}

function DetailTabs({
  value,
  onChange,
  tabs,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly tabs: readonly (readonly [string, string])[];
}) {
  return (
    <div className="detail-tabs" role="tablist" aria-label="Розділи детальної сторінки">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={value === key}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Fact({ value, label }: { readonly value: string; readonly label: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function wholeGrams(value: number | null): string {
  return value === null ? "—" : Math.round(value).toLocaleString("uk-UA") + " г";
}

function MacroCards({
  nutrients,
  valueKey,
}: {
  readonly nutrients: readonly FoodNutrient[];
  readonly valueKey: "valuePer100g" | "valuePerServing";
}) {
  const energy = numberValue(nutrients.find((item) => item.code === "energy_kcal")?.[valueKey]);
  return (
    <div className="macro-cards">
      {MACRO_CODES.map((code) => {
        const item = nutrients.find((nutrient) => nutrient.code === code);
        const value = numberValue(item?.[valueKey]);
        return (
          <div key={code} className={"macro-card macro-card--" + code}>
            <span>{item?.name ?? macroLabel(code)}</span>
            <strong>
              {value === null ? "—" : formatNumber(value)} {item ? unitLabel(item.unit) : ""}
            </strong>
            <Progress value={macroEnergyPercent(code, value, energy)} />
          </div>
        );
      })}
    </div>
  );
}

function NutrientPanel({
  nutrients,
  valueKey,
  caption,
}: {
  readonly nutrients: readonly FoodNutrient[];
  readonly valueKey: "valuePer100g" | "valuePerServing";
  readonly caption: string;
}) {
  const energy = numberValue(nutrients.find((item) => item.code === "energy_kcal")?.[valueKey]);
  const grouped = Object.entries(
    nutrients.reduce<Record<string, FoodNutrient[]>>((result, item) => {
      (result[item.group] ??= []).push(item);
      return result;
    }, {}),
  );
  return (
    <div className="food-details__panels nutrient-panel">
      <p className="nutrient-panel__caption">{caption}</p>
      {grouped.map(([group, items]) => (
        <section key={group}>
          <h2>{NUTRIENT_GROUPS[group] ?? group}</h2>
          <dl className="nutrient-list">
            {items.map((item) => {
              const value = numberValue(item[valueKey]);
              const showProgress = MACRO_CODES.includes(item.code as never);
              return (
                <div key={item.id}>
                  <dt>
                    <span>{item.name}</span>
                  </dt>
                  <dd>
                    {value === null ? "—" : formatNumber(value)} {unitLabel(item.unit)}
                  </dd>
                  {showProgress ? (
                    <Progress value={macroEnergyPercent(item.code, value, energy)} />
                  ) : null}
                </div>
              );
            })}
          </dl>
        </section>
      ))}
    </div>
  );
}

function Progress({ value }: { readonly value: number }) {
  return (
    <progress
      className="nutrient-progress"
      aria-label={formatNumber(value) + "% від загальної енергії"}
      max={100}
      value={value}
    />
  );
}

function AuthorCard({
  author,
}: {
  readonly author: NonNullable<Extract<FoodDetailsContract, { kind: "recipe" }>["author"]>;
}) {
  return (
    <section className="detail-card author-card">
      <div className="author-card__avatar" aria-hidden="true">
        {author.avatarUrl ? <img src={author.avatarUrl} alt="" /> : <UserRound />}
      </div>
      <div>
        <h2>{author.name}</h2>
        {author.bio ? <ExpandableText text={author.bio} /> : <p>Опис автора ще не додано.</p>}
        {author.links.length ? (
          <ul className="author-links" aria-label="Посилання автора">
            {author.links.map((link) => (
              <li key={link.id}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={authorLinkLabel(link.type)}
                >
                  {authorLinkIcon(link.type)}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function videoPlatformLabel(platform: string | null): string {
  const labels: Readonly<Record<string, string>> = {
    YOUTUBE: "YouTube",
    INSTAGRAM: "Instagram",
    TIKTOK: "TikTok",
    OTHER: "Зовнішній ресурс",
  };
  return platform ? (labels[platform] ?? platform) : "Зовнішній ресурс";
}

function ExpandableText({ text }: { readonly text: string }) {
  return (
    <details className="expandable-text">
      <summary>
        <span>{text}</span>
        <em>Читати далі</em>
      </summary>
      <p>{text}</p>
    </details>
  );
}

function RelatedRecipeCard({
  recipe,
  returnTo,
}: {
  readonly recipe: Extract<FoodDetailsContract, { kind: "product" }>["relatedRecipes"][number];
  readonly returnTo: string;
}) {
  return (
    <li>
      <Link href={"/food/recipe/" + recipe.id + "?returnTo=" + encodeURIComponent(returnTo)}>
        <DetailThumbnail
          imageUrl={recipe.imageUrl}
          fallback={recipeTypeEmoji(recipe.recipeType?.code)}
          alt={recipe.title}
        />
        <span>
          <strong>{recipe.title}</strong>
          <small>{nutritionSummary(recipe.nutrition)}</small>
          <small>{recipe.totalTimeMin ? recipe.totalTimeMin + " хв" : "Час не вказано"}</small>
          <span className="related-recipe-card__chips">
            {recipe.difficulty ? <small>{DIFFICULTY[recipe.difficulty]}</small> : null}
            {recipe.recipeType ? <small>{recipe.recipeType.name}</small> : null}
            {recipe.cuisines.map((name) => (
              <small key={name}>{name}</small>
            ))}
            {recipe.dietaryTags.map((name) => (
              <small key={name}>{name}</small>
            ))}
          </span>
          {recipe.author?.type !== "MEALMIND" && recipe.author ? (
            <small>Автор: {recipe.author.name}</small>
          ) : null}
        </span>
      </Link>
    </li>
  );
}

function DetailThumbnail({
  imageUrl,
  fallback,
  alt,
}: {
  readonly imageUrl: string | null;
  readonly fallback: string;
  readonly alt: string;
}) {
  return (
    <span className="detail-thumbnail">
      <span aria-hidden="true">{fallback}</span>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      ) : null}
    </span>
  );
}

function nutritionSummary(nutrition: {
  readonly energyKcal: number | null;
  readonly proteinG: number | null;
  readonly fatG: number | null;
  readonly carbohydrateG: number | null;
}): string {
  return (
    "🔥 " +
    formatNullable(nutrition.energyKcal) +
    " ккал · Б" +
    formatNullable(nutrition.proteinG) +
    " · Ж" +
    formatNullable(nutrition.fatG) +
    " · В" +
    formatNullable(nutrition.carbohydrateG)
  );
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

function unitLabel(unit: string): string {
  return (
    ({ KCAL: "ккал", G: "г", MG: "мг", MCG: "мкг", PERCENT: "%" } as Record<string, string>)[
      unit
    ] ?? unit.toLowerCase()
  );
}

function numberValue(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function formatNullable(value: number | null): string {
  return value === null ? "—" : formatNumber(value);
}

function formatNumber(value: number | string): string {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 }).format(numeric)
    : String(value);
}

function divide(total: string | null, count: number | null): number | null {
  if (!total || !count || count <= 0) return null;
  return Number(total) / count;
}

function minutes(value: number | null): string {
  return value === null ? "—" : value + " хв";
}

function recipeTypeEmoji(code?: string): string {
  const values: Record<string, string> = {
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
  return (code && values[code]) || "🍲";
}

function authorLinkLabel(type: string): string {
  return (
    (
      {
        INSTAGRAM: "Instagram автора",
        YOUTUBE: "YouTube автора",
        TIKTOK: "TikTok автора",
        WEBSITE: "Вебсайт автора",
        OTHER: "Інше посилання автора",
      } as Record<string, string>
    )[type] ?? "Посилання автора"
  );
}

function authorLinkIcon(type: string): ReactNode {
  if (type === "INSTAGRAM") return <ImageIcon aria-hidden="true" />;
  if (type === "YOUTUBE") return <PlayCircle aria-hidden="true" />;
  return <Globe aria-hidden="true" />;
}
