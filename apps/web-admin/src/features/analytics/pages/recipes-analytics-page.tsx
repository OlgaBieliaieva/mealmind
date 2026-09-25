"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import { Button, Card, PageState } from "@/shared/ui";

import {
  getRecipesAnalytics,
  type AnalyticsRankingItem,
  type RecipesAnalytics,
} from "../api/admin-analytics";
import { AnalyticsPeriodFilter } from "../components/analytics-period-filter";
import { MetricCard } from "../components/metric-card";
import { ProductsTimeSeriesChart } from "../components/products-time-series-chart";
import { parametersFromSearchParams } from "../model/analytics-period";

const integer = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 });

export function RecipesAnalyticsPage() {
  const searchParams = useSearchParams();
  const parameters = parametersFromSearchParams(searchParams);
  const api = getBrowserApiClient();
  const query = useQuery({
    queryKey: ["admin-analytics", "recipes", parameters],
    queryFn: () => getRecipesAnalytics(api, parameters),
  });

  return (
    <section className="admin-page analytics-page" aria-labelledby="recipes-analytics-title">
      <header className="admin-page__header analytics-page__header">
        <div>
          <p className="admin-page__eyebrow">Огляд</p>
          <h1 id="recipes-analytics-title">Рецепти</h1>
          <p className="admin-page__description">
            Стан каталогу рецептів, авторство, тематичне наповнення та популярність.
          </p>
        </div>
        <AnalyticsPeriodFilter />
      </header>
      {query.isPending ? (
        <PageState kind="loading" title="Завантажуємо аналітику рецептів" />
      ) : null}
      {query.isError ? (
        <PageState
          kind="error"
          title="Не вдалося завантажити аналітику рецептів"
          actions={<Button onClick={() => void query.refetch()}>Повторити</Button>}
        />
      ) : null}
      {query.data ? <RecipesContent analytics={query.data.data} /> : null}
    </section>
  );
}

function RecipesContent({ analytics }: { readonly analytics: RecipesAnalytics }) {
  const period = `${formatDate(analytics.meta.from)} — ${formatDate(analytics.meta.to)}`;
  return (
    <div className="analytics-sections">
      <section aria-labelledby="recipes-state-title">
        <div className="analytics-section-heading">
          <div>
            <h2 id="recipes-state-title">Стан каталогу</h2>
            <p>Загальна кількість включає всю історію; action KPI виключають архівні записи.</p>
          </div>
        </div>
        <div className="analytics-metric-grid">
          <MetricCard
            label="Усі рецепти"
            value={integer.format(analytics.totals.all)}
            description="Усі рецепти, включно зі статусом ARCHIVED."
          />
          <MetricCard
            label="Створено за період"
            value={integer.format(analytics.created.value)}
            secondary={comparison(analytics.created)}
            description={period}
          />
          <ActionMetric
            href="/recipes?includeArchived=false&status=DRAFT"
            label="Чернетки"
            value={analytics.totals.drafts}
            description="Неархівні рецепти зі статусом DRAFT."
          />
          <ActionMetric
            href="/recipes?includeArchived=false&visibility=FAMILY"
            label="Лише для сім’ї"
            value={analytics.totals.familyOnly}
            description="Неархівні рецепти з visibility FAMILY."
          />
        </div>
      </section>

      <section aria-labelledby="recipes-breakdowns-title">
        <div className="analytics-section-heading">
          <div>
            <h2 id="recipes-breakdowns-title">Структура всього каталогу</h2>
            <p>Breakdown-и нижче включають рецепти всіх статусів.</p>
          </div>
        </div>
        <div className="analytics-breakdown-grid analytics-breakdown-grid--four">
          <BreakdownCard
            title="За статусом"
            values={[
              ["Чернетки", analytics.breakdowns.statuses.DRAFT, "/recipes?status=DRAFT"],
              ["Готові", analytics.breakdowns.statuses.READY, "/recipes?status=READY"],
              [
                "Опубліковані",
                analytics.breakdowns.statuses.PUBLISHED,
                "/recipes?status=PUBLISHED",
              ],
              ["Архівні", analytics.breakdowns.statuses.ARCHIVED, "/recipes?status=ARCHIVED"],
            ]}
          />
          <BreakdownCard
            title="За видимістю"
            values={[
              ["Сімейні", analytics.breakdowns.visibility.FAMILY, "/recipes?visibility=FAMILY"],
              ["Публічні", analytics.breakdowns.visibility.PUBLIC, "/recipes?visibility=PUBLIC"],
            ]}
          />
          <BreakdownCard
            title="За складністю"
            values={[
              ["Легкі", analytics.breakdowns.difficulties.EASY, "/recipes?difficulty=EASY"],
              ["Середні", analytics.breakdowns.difficulties.MEDIUM, "/recipes?difficulty=MEDIUM"],
              ["Складні", analytics.breakdowns.difficulties.HARD, "/recipes?difficulty=HARD"],
              [
                "Не вказано",
                analytics.breakdowns.difficulties.UNASSIGNED,
                "/recipes?difficulty=UNASSIGNED",
              ],
            ]}
          />
          <BreakdownCard
            title="Тип доменного автора"
            values={[
              [
                "MealMind",
                analytics.breakdowns.authorTypes.MEALMIND,
                "/recipes?authorType=MEALMIND",
              ],
              ["Експерт", analytics.breakdowns.authorTypes.EXPERT, "/recipes?authorType=EXPERT"],
              ["Блогер", analytics.breakdowns.authorTypes.BLOGGER, "/recipes?authorType=BLOGGER"],
              ["Користувач", analytics.breakdowns.authorTypes.USER, "/recipes?authorType=USER"],
              [
                "Без автора",
                analytics.breakdowns.authorTypes.UNASSIGNED,
                "/recipes?authorType=UNASSIGNED",
              ],
            ]}
          />
        </div>
      </section>

      <section aria-labelledby="recipe-creator-title">
        <div className="analytics-section-heading">
          <div>
            <h2 id="recipe-creator-title">Походження запису</h2>
            <p>
              <code>createdByUserId</code> показує, хто створив запис, і не замінює доменного автора
              рецепта.
            </p>
          </div>
        </div>
        <BreakdownCard
          title="За створювачем запису"
          values={[
            [
              "Створено користувачем",
              analytics.breakdowns.creatorOrigins.USER,
              "/recipes?creatorOrigin=USER",
            ],
            [
              "Система / імпорт",
              analytics.breakdowns.creatorOrigins.SYSTEM,
              "/recipes?creatorOrigin=SYSTEM",
            ],
          ]}
        />
      </section>

      <section aria-labelledby="recipes-created-title">
        <div className="analytics-section-heading">
          <div>
            <h2 id="recipes-created-title">Динаміка створення</h2>
            <p>{period}. Архівування пізніше не змінює історичні значення.</p>
          </div>
        </div>
        <Card>
          <ProductsTimeSeriesChart
            series={analytics.series}
            label="Рецепти"
            empty="За обраний період рецептів не створено."
          />
        </Card>
      </section>

      <section aria-labelledby="recipes-rankings-title">
        <div className="analytics-section-heading">
          <div>
            <h2 id="recipes-rankings-title">Наповнення та популярність</h2>
            <p>
              Лише неархівні рецепти; cuisine і dietary tag можуть враховувати один рецепт у кількох
              групах.
            </p>
          </div>
        </div>
        <div className="analytics-ranking-grid">
          <RankingCard
            title="Типи рецептів"
            items={analytics.rankings.recipeTypes}
            href={(item) => `/recipes?recipeTypeId=${item.id}`}
          />
          <RankingCard
            title="Кухні"
            items={analytics.rankings.cuisines}
            href={(item) => `/recipes?cuisineId=${item.id}`}
          />
          <RankingCard
            title="Дієтичні теги"
            items={analytics.rankings.dietaryTags}
            href={(item) => `/recipes?dietaryTagId=${item.id}`}
          />
          <RankingCard
            title="Автори"
            items={analytics.rankings.authors}
            href={(item) => `/recipes?authorId=${item.id}`}
          />
          <RankingCard
            title="У вибраному сімей"
            items={analytics.rankings.favorites}
            href={(item) => `/recipes/${item.id}`}
          />
        </div>
      </section>
    </div>
  );
}

function ActionMetric(props: {
  readonly href: string;
  readonly label: string;
  readonly value: number;
  readonly description: string;
}) {
  return (
    <Link className="analytics-action-metric" href={props.href}>
      <MetricCard
        label={props.label}
        value={integer.format(props.value)}
        description={props.description}
      />
      <span>Перейти до списку →</span>
    </Link>
  );
}

function BreakdownCard({
  title,
  values,
}: {
  readonly title: string;
  readonly values: readonly (readonly [string, number, string])[];
}) {
  return (
    <Card>
      <h3>{title}</h3>
      <dl className="analytics-breakdown">
        {values.map(([label, value, href]) => (
          <div key={label}>
            <dt>
              <Link href={href}>{label}</Link>
            </dt>
            <dd>{integer.format(value)}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function RankingCard({
  title,
  items,
  href,
}: {
  readonly title: string;
  readonly items: readonly AnalyticsRankingItem[];
  readonly href: (item: AnalyticsRankingItem) => string;
}) {
  return (
    <Card>
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="analytics-empty">Даних для рейтингу поки немає.</p>
      ) : (
        <ol className="analytics-ranking">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={href(item)}>{item.label}</Link>
              <span>{integer.format(item.value)}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

function comparison(metric: RecipesAnalytics["created"]) {
  const sign = metric.delta > 0 ? "+" : "";
  const percent =
    metric.deltaPercent === null
      ? "без бази порівняння"
      : `${sign}${decimal.format(metric.deltaPercent)}%`;
  return `Попередній: ${integer.format(metric.previousValue)} · ${sign}${integer.format(metric.delta)} · ${percent}`;
}
