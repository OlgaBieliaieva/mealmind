"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import { Button, Card, PageState } from "@/shared/ui";

import { getUsersAnalytics, type UsersAnalytics } from "../api/admin-analytics";
import { AnalyticsPeriodFilter } from "../components/analytics-period-filter";
import { MetricCard } from "../components/metric-card";
import { UsersTimeSeriesChart } from "../components/users-time-series-chart";
import { parametersFromSearchParams } from "../model/analytics-period";

const integer = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 });

export function UsersAnalyticsPage() {
  const searchParams = useSearchParams();
  const parameters = parametersFromSearchParams(searchParams);
  const api = getBrowserApiClient();
  const query = useQuery({
    queryKey: ["admin-analytics", "users", parameters],
    queryFn: () => getUsersAnalytics(api, parameters),
  });

  return (
    <section className="admin-page analytics-page" aria-labelledby="users-analytics-title">
      <header className="admin-page__header analytics-page__header">
        <div>
          <p className="admin-page__eyebrow">Огляд</p>
          <h1 id="users-analytics-title">Користувачі та сім’ї</h1>
          <p className="admin-page__description">
            Поточний стан облікових записів, сімей і профілів та історична динаміка їх створення.
            ADMIN-акаунти й створені ними сім’ї не входять до user/family показників.
          </p>
        </div>
        <AnalyticsPeriodFilter />
      </header>

      {query.isPending ? <PageState title="Завантажуємо аналітику" kind="loading" /> : null}
      {query.isError ? (
        <PageState
          title="Не вдалося завантажити аналітику"
          description="Повторіть запит. Якщо помилка не зникає, перевірте API session."
          kind="error"
          actions={<Button onClick={() => void query.refetch()}>Повторити</Button>}
        />
      ) : null}
      {query.data ? <UsersAnalyticsContent analytics={query.data.data} /> : null}
    </section>
  );
}

function UsersAnalyticsContent({ analytics }: { readonly analytics: UsersAnalytics }) {
  const period = `${formatDate(analytics.meta.from)} — ${formatDate(analytics.meta.to)}`;
  return (
    <div className="analytics-sections">
      <section aria-labelledby="users-state-title">
        <div className="analytics-section-heading">
          <div>
            <h2 id="users-state-title">Поточний стан</h2>
            <p>Активні записи не включають логічно видалені, архівні або ADMIN-сутності.</p>
          </div>
        </div>
        <div className="analytics-metric-grid">
          <MetricCard
            label="Активні користувачі"
            value={integer.format(analytics.totals.activeUsers)}
            secondary={`Видалені: ${integer.format(analytics.totals.deletedUsers)}`}
            description="Облікові записи з роллю USER і deletedAt = null."
          />
          <MetricCard
            label="Активні сім’ї"
            value={integer.format(analytics.totals.activeFamilies)}
            secondary={`Архівні: ${integer.format(analytics.totals.archivedFamilies)}`}
            description="Неархівні сім’ї, створені користувачами з роллю USER."
          />
          <MetricCard
            label="Активні профілі"
            value={integer.format(analytics.totals.activeProfiles)}
            secondary={`Архівні: ${integer.format(analytics.totals.archivedProfiles)}`}
            description="Профілі людей з archivedAt = null."
          />
          <MetricCard
            label="Завершили onboarding"
            value={percent(analytics.completion.onboarding.percent)}
            secondary={`${integer.format(analytics.completion.onboarding.completed)} із ${integer.format(analytics.completion.onboarding.total)}`}
            description="Частка серед активних користувачів."
          />
        </div>
      </section>

      <section aria-labelledby="family-structure-title">
        <div className="analytics-section-heading">
          <div>
            <h2 id="family-structure-title">Структура сімей</h2>
            <p>Середні значення враховують активні сім’ї USER-акаунтів, включно з порожніми.</p>
          </div>
        </div>
        <div className="analytics-metric-grid analytics-metric-grid--compact">
          <MetricCard
            label="Користувачів на сім’ю"
            value={nullableDecimal(analytics.averages.activeUsersPerFamily)}
            description="ACTIVE memberships користувачів із роллю USER у врахованих сім’ях."
          />
          <MetricCard
            label="Профілів на сім’ю"
            value={nullableDecimal(analytics.averages.activeProfilesPerFamily)}
            description="Неархівовані FamilyMember і PersonProfile у врахованих сім’ях."
          />
          <MetricCard
            label="Заповнені профілі"
            value={percent(analytics.completion.profiles.percent)}
            secondary={`${integer.format(analytics.completion.profiles.completed)} із ${integer.format(analytics.completion.profiles.total)}`}
            description="Частка серед активних профілів."
          />
        </div>
      </section>

      <section aria-labelledby="created-title">
        <div className="analytics-section-heading">
          <div>
            <h2 id="created-title">Створено за період</h2>
            <p>{period}. Порівняння з попереднім періодом такої самої тривалості.</p>
          </div>
        </div>
        <div className="analytics-metric-grid analytics-metric-grid--compact">
          <MetricCard
            label="Користувачі"
            value={integer.format(analytics.created.users.value)}
            secondary={comparison(analytics.created.users)}
            description="Лише роль USER; включає записи, видалені пізніше."
          />
          <MetricCard
            label="Сім’ї"
            value={integer.format(analytics.created.families.value)}
            secondary={comparison(analytics.created.families)}
            description="Сім’ї USER-акаунтів, включно з архівованими пізніше."
          />
          <MetricCard
            label="Профілі"
            value={integer.format(analytics.created.profiles.value)}
            secondary={comparison(analytics.created.profiles)}
            description="Історичні створення, включно з профілями, архівованими пізніше."
          />
        </div>
        <Card>
          <h3>Динаміка створення</h3>
          <p className="analytics-card-description">
            Графік показує історичні події без ADMIN-акаунтів та їхніх сімей. Архівування або
            видалення не переписує минулі періоди.
          </p>
          <UsersTimeSeriesChart series={analytics.series} />
        </Card>
      </section>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

function percent(value: number | null) {
  return value === null ? "—" : `${decimal.format(value)}%`;
}

function nullableDecimal(value: number | null) {
  return value === null ? "—" : decimal.format(value);
}

function comparison(metric: {
  readonly previousValue: number;
  readonly delta: number;
  readonly deltaPercent: number | null;
}) {
  const sign = metric.delta > 0 ? "+" : "";
  const percentValue =
    metric.deltaPercent === null
      ? "без бази порівняння"
      : `${sign}${decimal.format(metric.deltaPercent)}%`;
  return `Попередній: ${integer.format(metric.previousValue)} · ${sign}${integer.format(metric.delta)} · ${percentValue}`;
}
