"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import { getMealPlanWeek } from "@/shared/api/meal-plans";
import { generateShoppingList } from "@/shared/api/shopping-lists";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatShoppingDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}.${month}.${year}` : value;
}

function isConsecutive(values: readonly string[]): boolean {
  const dates = [...new Set(values)].sort();
  return dates.every((value, index) => index === 0 || value === addDays(dates[index - 1]!, 1));
}

export function ShoppingListGeneration() {
  const parameters = useSearchParams();
  const router = useRouter();
  const requestedDates = (parameters.get("dates") ?? "").split(",").filter(Boolean).sort();
  const validPrefill = requestedDates.length > 0 && isConsecutive(requestedDates);
  const anchor = parameters.get("date") ?? requestedDates[0] ?? today();
  const [periodStart, setPeriodStart] = useState(validPrefill ? requestedDates[0]! : anchor);
  const [days, setDays] = useState(validPrefill ? requestedDates.length : 1);
  const plan = useQuery({
    queryKey: ["meal-plan", "shopping-context", periodStart],
    queryFn: ({ signal }) => getMealPlanWeek(getBrowserApiClient(), periodStart, undefined, signal),
  });
  const periodEnd = useMemo(() => addDays(periodStart, days - 1), [periodStart, days]);
  const planId = plan.data?.data.planId ?? parameters.get("planId") ?? null;
  const generate = useMutation({
    mutationFn: () => {
      if (!planId) throw new Error("Meal plan is unavailable");
      return generateShoppingList(getBrowserApiClient(), {
        mealPlanId: planId,
        periodStart,
        periodEnd,
      });
    },
    onSuccess: (response) => router.replace(`/shop/${response.data.id}`),
  });
  const weekStart = plan.data?.data.weekStart;
  const weekEnd = plan.data?.data.weekEnd;
  const minimumDate = plan.data?.data.timeZone
    ? localDate(new Date(), plan.data.data.timeZone)
    : today();
  const valid =
    Boolean(planId) &&
    Boolean(weekStart) &&
    periodStart >= (weekStart ?? "") &&
    periodEnd <= (weekEnd ?? "") &&
    periodStart >= minimumDate;

  return (
    <section className="shopping-page shopping-generate">
      <header className="shopping-subpage-header">
        <Link href="/shop" aria-label="Назад до списків">
          <ArrowLeft />
        </Link>
        <div>
          <h1>Створити список</h1>
          <p>Оберіть послідовний період одного тижневого плану.</p>
        </div>
      </header>

      {!validPrefill && requestedDates.length > 1 ? (
        <p className="shopping-notice">
          Вибрані в плані дні не є послідовними. Ми не додаємо пропущені дні автоматично — виберіть
          початок і тривалість нижче.
        </p>
      ) : null}

      <form
        className="shopping-form-card"
        onSubmit={(event) => {
          event.preventDefault();
          generate.mutate();
        }}
      >
        <span className="shopping-form-card__icon">
          <CalendarDays />
        </span>
        <label>
          Початок періоду
          <input
            type="date"
            min={minimumDate}
            value={periodStart}
            onChange={(event) => setPeriodStart(event.target.value)}
          />
        </label>
        <label>
          Кількість днів
          <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <div className="shopping-period-preview">
          <span>Період списку</span>
          <strong>
            {formatShoppingDate(periodStart)} — {formatShoppingDate(periodEnd)}
          </strong>
        </div>
        {!plan.isPending && !valid ? (
          <p role="alert">Період має бути сьогодні або пізніше в межах одного тижневого плану.</p>
        ) : null}
        {generate.isError ? (
          <p role="alert">
            Не вдалося створити список. Можливо, для цього періоду вже є відкритий список.
          </p>
        ) : null}
        <button type="submit" disabled={!valid || generate.isPending}>
          {generate.isPending ? "Формуємо…" : "Створити список покупок"}
        </button>
      </form>
    </section>
  );
}

function localDate(value: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const result = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${result.year}-${result.month}-${result.day}`;
}
