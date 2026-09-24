import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Огляд" };

export default function AnalyticsPage() {
  return (
    <section className="admin-page analytics-page" aria-labelledby="analytics-title">
      <header className="admin-page__header">
        <p className="admin-page__eyebrow">Аналітика</p>
        <h1 id="analytics-title">Огляд MealMind</h1>
        <p className="admin-page__description">
          Загальний огляд буде сформовано з перевірених доменних показників.
        </p>
      </header>
      <Link className="analytics-overview-link" href="/analytics/users">
        <strong>Користувачі та сім’ї</strong>
        <span>Поточний стан, completion та історична динаміка.</span>
      </Link>
    </section>
  );
}
