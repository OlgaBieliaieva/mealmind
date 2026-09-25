"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import { Button, PageState } from "@/shared/ui";

import { getOverviewAnalytics, type OverviewAnalytics } from "../api/admin-analytics";
import { AnalyticsPeriodFilter } from "../components/analytics-period-filter";
import { MetricCard } from "../components/metric-card";
import { parametersFromSearchParams } from "../model/analytics-period";

const integer = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });

export function OverviewAnalyticsPage() {
  const parameters = parametersFromSearchParams(useSearchParams());
  const query = useQuery({
    queryKey: ["admin-analytics", "overview", parameters],
    queryFn: () => getOverviewAnalytics(getBrowserApiClient(), parameters),
  });

  return (
    <section className="admin-page analytics-page" aria-labelledby="analytics-title">
      <header className="admin-page__header analytics-page__header">
        <div>
          <p className="admin-page__eyebrow">Аналітика</p>
          <h1 id="analytics-title">Огляд MealMind</h1>
          <p className="admin-page__description">
            Ключові показники платформи та активність за вибраний період.
          </p>
        </div>
        <AnalyticsPeriodFilter />
      </header>

      {query.isPending ? <PageState title="Завантажуємо огляд" kind="loading" /> : null}
      {query.isError ? (
        <PageState
          title="Не вдалося завантажити огляд"
          description="Повторіть запит. Якщо помилка не зникає, перевірте API session."
          kind="error"
          actions={<Button onClick={() => void query.refetch()}>Повторити</Button>}
        />
      ) : null}
      {query.data ? <OverviewContent analytics={query.data.data} /> : null}
    </section>
  );
}

function OverviewContent({ analytics }: { readonly analytics: OverviewAnalytics }) {
  const period = `${formatDate(analytics.meta.from)} — ${formatDate(analytics.meta.to)}`;
  return (
    <div className="analytics-sections">
      <section aria-labelledby="overview-audience-title">
        <div className="analytics-section-heading">
          <div>
            <h2 id="overview-audience-title">Користувачі та сім’ї</h2>
            <p>Поточна активна база та історичні створення за період {period}.</p>
          </div>
        </div>
        <div className="analytics-metric-grid">
          <MetricLink href="/analytics/users" label="Активні користувачі" value={analytics.users.active} description="Облікові записи з deletedAt = null." />
          <MetricLink href="/analytics/users" label="Нові користувачі" value={analytics.users.created} description="Створені за період, навіть якщо їх видалили пізніше." />
          <MetricLink href="/analytics/users" label="Активні сім’ї" value={analytics.families.active} description="Сім’ї з archivedAt = null." />
          <MetricLink href="/analytics/users" label="Нові сім’ї" value={analytics.families.created} description="Створені за період, навіть якщо їх архівували пізніше." />
        </div>
      </section>

      <section aria-labelledby="overview-catalog-title">
        <div className="analytics-section-heading">
          <div>
            <h2 id="overview-catalog-title">Каталог</h2>
            <p>Загальна кількість включає архівні записи; операційні черги — лише неархівні.</p>
          </div>
        </div>
        <div className="analytics-metric-grid">
          <MetricLink href="/analytics/products" label="Продукти" value={analytics.products.total} description="Усі продукти за весь час, включно з архівними." />
          <MetricLink href="/products?includeArchived=false&verificationStatus=UNVERIFIED" label="Очікують перевірки" value={analytics.products.awaitingVerification} description="Неархівні продукти зі статусом UNVERIFIED." />
          <MetricLink href="/analytics/recipes" label="Рецепти" value={analytics.recipes.total} description="Усі рецепти за весь час, включно з архівними." />
          <MetricLink href="/recipes?includeArchived=false&status=DRAFT" label="Чернетки рецептів" value={analytics.recipes.drafts} description="Неархівні рецепти зі статусом DRAFT." />
        </div>
      </section>

      <section aria-labelledby="overview-activity-title">
        <div className="analytics-section-heading">
          <div>
            <h2 id="overview-activity-title">Активність</h2>
            <p>Події в межах {period}; календарні дати інтерпретуються у {analytics.meta.timezone}.</p>
          </div>
        </div>
        <div className="analytics-metric-grid analytics-metric-grid--compact">
          <MetricCard label="Заплановані тижні" value={integer.format(analytics.activity.scheduledMealPlans)} description="MealPlan, дата початку тижня якого входить у період." />
          <MetricCard label="Завершені приготування" value={integer.format(analytics.activity.completedCookingSessions)} description="CookingSession зі статусом COMPLETED і completedAt у періоді." />
          <MetricCard label="Підтверджені споживання" value={integer.format(analytics.activity.confirmedConsumptionEntries)} description="ConsumptionEntry зі статусом CONFIRMED і consumedAt у періоді." />
        </div>
      </section>
    </div>
  );
}

function MetricLink({ href, label, value, description }: { readonly href: string; readonly label: string; readonly value: number; readonly description: string }) {
  return (
    <Link className="analytics-action-metric" href={href}>
      <MetricCard label={label} value={integer.format(value)} description={description} />
      <span>Докладніше →</span>
    </Link>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00Z`));
}
