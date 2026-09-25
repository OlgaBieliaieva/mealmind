"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import { Button, Card, PageState } from "@/shared/ui";

import {
  getProductsAnalytics,
  type AnalyticsRankingItem,
  type ProductsAnalytics,
} from "../api/admin-analytics";
import { AnalyticsPeriodFilter } from "../components/analytics-period-filter";
import { MetricCard } from "../components/metric-card";
import { ProductsTimeSeriesChart } from "../components/products-time-series-chart";
import { parametersFromSearchParams } from "../model/analytics-period";

const integer = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 });

export function ProductsAnalyticsPage() {
  const searchParams = useSearchParams();
  const parameters = parametersFromSearchParams(searchParams);
  const api = getBrowserApiClient();
  const query = useQuery({
    queryKey: ["admin-analytics", "products", parameters],
    queryFn: () => getProductsAnalytics(api, parameters),
  });

  return (
    <section className="admin-page analytics-page" aria-labelledby="products-analytics-title">
      <header className="admin-page__header analytics-page__header">
        <div>
          <p className="admin-page__eyebrow">Огляд</p>
          <h1 id="products-analytics-title">Продукти</h1>
          <p className="admin-page__description">
            Стан каталогу, походження даних, динаміка створення та популярність.
          </p>
        </div>
        <AnalyticsPeriodFilter />
      </header>
      {query.isPending ? (
        <PageState kind="loading" title="Завантажуємо аналітику продуктів" />
      ) : null}
      {query.isError ? (
        <PageState
          kind="error"
          title="Не вдалося завантажити аналітику продуктів"
          actions={<Button onClick={() => void query.refetch()}>Повторити</Button>}
        />
      ) : null}
      {query.data ? <ProductsContent analytics={query.data.data} /> : null}
    </section>
  );
}

function ProductsContent({ analytics }: { readonly analytics: ProductsAnalytics }) {
  const createdFrom = new Date(
    new Date(analytics.meta.generatedAt).getTime() - 86_400_000,
  ).toISOString();
  const period = `${formatDate(analytics.meta.from)} — ${formatDate(analytics.meta.to)}`;
  return (
    <div className="analytics-sections">
      <section aria-labelledby="products-hot-title">
        <div className="analytics-section-heading">
          <div>
            <h2 id="products-hot-title">Стан каталогу</h2>
            <p>Загальна кількість включає всі статуси; action KPI виключають архівні записи.</p>
          </div>
        </div>
        <div className="analytics-metric-grid">
          <MetricCard
            label="Усі продукти"
            value={integer.format(analytics.totals.all)}
            description="Усі продукти, включно з ARCHIVED."
          />
          <ActionMetric
            href={`/products?includeArchived=false&createdFrom=${encodeURIComponent(createdFrom)}`}
            label="Нові за 24 години"
            value={analytics.totals.createdLast24Hours}
            description="Створені протягом 24 годин до моменту формування звіту."
          />
          <ActionMetric
            href="/products?includeArchived=false&verificationStatus=UNVERIFIED"
            label="Очікують верифікації"
            value={analytics.totals.awaitingVerification}
            description="Неархівні продукти зі статусом UNVERIFIED."
          />
          <ActionMetric
            href="/products?includeArchived=false&status=DRAFT"
            label="Чернетки"
            value={analytics.totals.drafts}
            description="Неархівні продукти зі статусом DRAFT."
          />
        </div>
      </section>

      <section aria-labelledby="products-breakdowns-title">
        <div className="analytics-section-heading">
          <div>
            <h2 id="products-breakdowns-title">Структура всього каталогу</h2>
            <p>
              Кожен breakdown включає продукти всіх статусів і сходиться із загальною кількістю.
            </p>
          </div>
        </div>
        <div className="analytics-breakdown-grid analytics-breakdown-grid--four">
          <BreakdownCard
            title="За типом"
            values={[
              ["Базові", analytics.breakdowns.types.GENERIC, "/products?type=GENERIC"],
              ["Брендовані", analytics.breakdowns.types.BRANDED, "/products?type=BRANDED"],
            ]}
          />
          <BreakdownCard
            title="За статусом"
            values={[
              ["Чернетки", analytics.breakdowns.statuses.DRAFT, "/products?status=DRAFT"],
              ["Активні", analytics.breakdowns.statuses.ACTIVE, "/products?status=ACTIVE"],
              ["Архівні", analytics.breakdowns.statuses.ARCHIVED, "/products?status=ARCHIVED"],
            ]}
          />
          <BreakdownCard
            title="За верифікацією"
            values={[
              [
                "Не перевірено",
                analytics.breakdowns.verification.UNVERIFIED,
                "/products?verificationStatus=UNVERIFIED",
              ],
              [
                "Перевірено",
                analytics.breakdowns.verification.VERIFIED,
                "/products?verificationStatus=VERIFIED",
              ],
              [
                "Відхилено",
                analytics.breakdowns.verification.REJECTED,
                "/products?verificationStatus=REJECTED",
              ],
            ]}
          />
          <BreakdownCard
            title="За станом їжі"
            values={[
              [
                "Не визначено",
                analytics.breakdowns.foodStates.UNSPECIFIED,
                "/products?foodState=UNSPECIFIED",
              ],
              ["Сирі", analytics.breakdowns.foodStates.RAW, "/products?foodState=RAW"],
              ["Приготовані", analytics.breakdowns.foodStates.COOKED, "/products?foodState=COOKED"],
              [
                "Оброблені",
                analytics.breakdowns.foodStates.PROCESSED,
                "/products?foodState=PROCESSED",
              ],
              [
                "Готові до споживання",
                analytics.breakdowns.foodStates.READY_TO_EAT,
                "/products?foodState=READY_TO_EAT",
              ],
            ]}
          />
        </div>
      </section>

      <section aria-labelledby="products-source-title">
        <div className="analytics-section-heading">
          <div>
            <h2 id="products-source-title">Походження продуктів</h2>
            <p>
              Один продукт враховується один раз за primary source; відсутній primary source
              показано окремо.
            </p>
          </div>
        </div>
        <BreakdownCard
          title="За джерелом"
          values={[
            ["USDA", analytics.breakdowns.sources.USDA, "/products?sourceProvider=USDA"],
            [
              "MealMind admin",
              analytics.breakdowns.sources.MEALMIND_ADMIN,
              "/products?sourceProvider=MEALMIND_ADMIN",
            ],
            [
              "MealMind user",
              analytics.breakdowns.sources.MEALMIND_USER,
              "/products?sourceProvider=MEALMIND_USER",
            ],
            [
              "Без primary source",
              analytics.breakdowns.sources.UNASSIGNED,
              "/products?sourceProvider=UNASSIGNED",
            ],
          ]}
        />
      </section>

      <section aria-labelledby="products-created-title">
        <div className="analytics-section-heading">
          <div>
            <h2 id="products-created-title">Створено за період</h2>
            <p>{period}. Історичні створення включають записи, архівовані пізніше.</p>
          </div>
        </div>
        <div className="analytics-metric-grid analytics-metric-grid--compact">
          <MetricCard
            label="Додано продуктів"
            value={integer.format(analytics.created.value)}
            secondary={comparison(analytics.created)}
            description="Порівняння з попереднім періодом такої самої тривалості."
          />
        </div>
        <Card>
          <h3>Динаміка створення</h3>
          <ProductsTimeSeriesChart series={analytics.series} />
        </Card>
      </section>

      <section aria-labelledby="products-rankings-title">
        <div className="analytics-section-heading">
          <div>
            <h2 id="products-rankings-title">Популярність і наповнення</h2>
            <p>Рейтинги включають лише неархівні продукти; максимум 10 позицій.</p>
          </div>
        </div>
        <div className="analytics-ranking-grid">
          <RankingCard
            title="Категорії"
            empty="Немає продуктів у категоріях."
            items={analytics.rankings.categories}
            href={(item) => `/products?categoryId=${item.id}`}
          />
          <RankingCard
            title="Бренди"
            empty="Немає брендованих продуктів."
            items={analytics.rankings.brands}
            href={(item) => `/products?brandId=${item.id}`}
          />
          <RankingCard
            title="У вибраному сімей"
            empty="Продукти ще не додавали до вибраного."
            items={analytics.rankings.favorites}
            href={(item) => `/products/${item.id}`}
          />
        </div>
      </section>
    </div>
  );
}

function ActionMetric({
  href,
  label,
  value,
  description,
}: {
  readonly href: string;
  readonly label: string;
  readonly value: number;
  readonly description: string;
}) {
  return (
    <Link className="analytics-action-metric" href={href}>
      <MetricCard label={label} value={integer.format(value)} description={description} />
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
  empty,
  items,
  href,
}: {
  readonly title: string;
  readonly empty: string;
  readonly items: readonly AnalyticsRankingItem[];
  readonly href: (item: AnalyticsRankingItem) => string;
}) {
  return (
    <Card>
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="analytics-empty">{empty}</p>
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

function comparison(metric: ProductsAnalytics["created"]) {
  const sign = metric.delta > 0 ? "+" : "";
  const percent =
    metric.deltaPercent === null
      ? "без бази порівняння"
      : `${sign}${decimal.format(metric.deltaPercent)}%`;
  return `Попередній: ${integer.format(metric.previousValue)} · ${sign}${integer.format(metric.delta)} · ${percent}`;
}
