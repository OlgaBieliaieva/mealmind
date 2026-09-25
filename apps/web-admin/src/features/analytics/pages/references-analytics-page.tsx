"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import { Button, Card, PageState } from "@/shared/ui";

import {
  getReferencesAnalytics,
  type AnalyticsReferenceResource,
  type ReferencesAnalytics,
} from "../api/admin-analytics";
import { MetricCard } from "../components/metric-card";

const labels: Readonly<Record<AnalyticsReferenceResource, string>> = {
  allergens: "Алергени",
  authors: "Автори рецептів",
  brands: "Бренди",
  cuisines: "Кухні",
  "dietary-tags": "Дієтичні теги",
  "meal-types": "Типи прийомів їжі",
  "measurement-units": "Одиниці вимірювання",
  nutrients: "Нутрієнти",
  "product-categories": "Категорії продуктів",
  "recipe-types": "Типи рецептів",
};

export function ReferencesAnalyticsPage() {
  const api = getBrowserApiClient();
  const query = useQuery({
    queryKey: ["admin-analytics", "references"],
    queryFn: () => getReferencesAnalytics(api),
  });

  return (
    <section className="admin-page analytics-page" aria-labelledby="references-analytics-title">
      <header className="admin-page__header">
        <p className="admin-page__eyebrow">Огляд</p>
        <h1 id="references-analytics-title">Довідники</h1>
        <p className="admin-page__description">
          Наповненість контрольованих значень і сигнали, які потребують перевірки адміністратором.
        </p>
      </header>
      {query.isPending ? <PageState kind="loading" title="Завантажуємо стан довідників" /> : null}
      {query.isError ? (
        <PageState
          kind="error"
          title="Не вдалося завантажити стан довідників"
          actions={<Button onClick={() => void query.refetch()}>Повторити</Button>}
        />
      ) : null}
      {query.data ? <ReferencesContent analytics={query.data.data} /> : null}
    </section>
  );
}

function ReferencesContent({ analytics }: { readonly analytics: ReferencesAnalytics }) {
  return (
    <div className="analytics-sections">
      <section aria-labelledby="reference-quality-title">
        <div className="analytics-section-heading">
          <div>
            <h2 id="reference-quality-title">Потребують уваги</h2>
            <p>Нульове використання є інформаційним сигналом, а не автоматичною помилкою.</p>
          </div>
        </div>
        <div className="analytics-metric-grid analytics-metric-grid--compact">
          <ActionMetric
            href="/reference/brands?includeInactive=false&verificationStatus=UNVERIFIED"
            label="Бренди без верифікації"
            value={analytics.quality.brandsAwaitingVerification}
            description="Неархівні бренди зі статусом перевірки UNVERIFIED."
          />
          <ActionMetric
            href="/reference/brands?status=DRAFT"
            label="Чернетки брендів"
            value={analytics.quality.draftBrands}
            description="Бренди зі статусом DRAFT."
          />
          <MetricCard
            label="Категорії без продуктів"
            value={String(analytics.quality.categoriesWithoutProducts)}
            description="Категорії, які зараз не використовуються продуктами."
          />
          <MetricCard
            label="Типи без рецептів"
            value={String(analytics.quality.recipeTypesWithoutRecipes)}
            description="Типи, які зараз не використовуються рецептами."
          />
          <MetricCard
            label="Кухні без рецептів"
            value={String(analytics.quality.cuisinesWithoutRecipes)}
            description="Кухні без зв’язків RecipeCuisine."
          />
          <MetricCard
            label="Теги без використання"
            value={String(analytics.quality.dietaryTagsWithoutUsage)}
            description="Теги без зв’язків із продуктами або рецептами."
          />
        </div>
      </section>

      <section aria-labelledby="reference-inventory-title">
        <div className="analytics-section-heading">
          <div>
            <h2 id="reference-inventory-title">Наповненість</h2>
            <p>Для Brands активними вважаються лише ACTIVE; для Authors — неархівні.</p>
          </div>
        </div>
        <Card padding="none">
          <div className="analytics-table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Довідник</th>
                  <th scope="col">Усього</th>
                  <th scope="col">Активні</th>
                  <th scope="col">Інші / неактивні</th>
                  <th scope="col">Дія</th>
                </tr>
              </thead>
              <tbody>
                {analytics.resources.map((item) => (
                  <tr key={item.resource}>
                    <th scope="row">{labels[item.resource]}</th>
                    <td>{item.total}</td>
                    <td>{item.active}</td>
                    <td>{item.inactive}</td>
                    <td>
                      <Link href={`/reference/${item.resource}`}>Відкрити</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="analytics-breakdown-grid" aria-label="Статуси брендів і типи авторів">
        <BreakdownCard
          title="Статуси брендів"
          values={{
            Чернетки: analytics.brands.statuses.DRAFT,
            Активні: analytics.brands.statuses.ACTIVE,
            Архівні: analytics.brands.statuses.ARCHIVED,
          }}
        />
        <BreakdownCard
          title="Верифікація брендів"
          values={{
            "Не перевірено": analytics.brands.verification.UNVERIFIED,
            Перевірено: analytics.brands.verification.VERIFIED,
            Відхилено: analytics.brands.verification.REJECTED,
          }}
        />
        <BreakdownCard
          title="Типи авторів"
          values={{
            MealMind: analytics.authors.types.MEALMIND,
            Експерти: analytics.authors.types.EXPERT,
            Блогери: analytics.authors.types.BLOGGER,
            Користувачі: analytics.authors.types.USER,
          }}
        />
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
      <MetricCard label={label} value={String(value)} description={description} />
      <span>Перейти до списку →</span>
    </Link>
  );
}

function BreakdownCard({
  title,
  values,
}: {
  readonly title: string;
  readonly values: Readonly<Record<string, number>>;
}) {
  return (
    <Card>
      <h3>{title}</h3>
      <dl className="analytics-breakdown">
        {Object.entries(values).map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
