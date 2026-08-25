"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Search, Users, Utensils } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { uk } from "react-day-picker/locale";

import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import { getMealPlanWeek, type NutrientAmount } from "@/shared/api/meal-plans";
import { getCategoryEmoji } from "@/shared/lib/category-emoji";
import { Button, PageState } from "@/shared/ui";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function moveDate(date: string, days: number): string {
  const result = new Date(date + "T00:00:00.000Z");
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function dateLabel(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("uk-UA", options).format(new Date(date + "T12:00:00"));
}

function calendarDate(date: string): Date {
  return new Date(date + "T12:00:00");
}

function dateFromCalendar(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function unitLabel(unit: string): string {
  return (
    ({ KCAL: "ккал", G: "г", MG: "мг", MCG: "мкг", PERCENT: "%" } as Record<string, string>)[
      unit
    ] ?? unit.toLowerCase()
  );
}

export function MealPlanScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const anchorDate = searchParams.get("date") ?? today();
  const view = searchParams.get("view") === "member" ? "member" : "meal";
  const isMulti = searchParams.get("multi") === "true";
  const selectedParam = searchParams.get("days");

  const query = useQuery({
    queryKey: ["meal-plan", "week", anchorDate],
    queryFn: ({ signal }) => getMealPlanWeek(getBrowserApiClient(), anchorDate, signal),
  });

  const updateParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([key, value]) =>
      value === null ? next.delete(key) : next.set(key, value),
    );
    router.replace(`/plan?${next.toString()}`, { scroll: false });
  };

  const data = query.data?.data;
  const selectedDays = useMemo(() => {
    const available = new Set(data?.days.map((day) => day.date) ?? []);
    const requested = selectedParam?.split(",").filter((date) => available.has(date)) ?? [];
    if (!isMulti) return [available.has(anchorDate) ? anchorDate : (data?.weekStart ?? anchorDate)];
    return requested;
  }, [anchorDate, data, isMulti, selectedParam]);

  if (query.isPending) return <PageState kind="loading" title="Завантажуємо план харчування" />;
  if (query.isError || !data) {
    return (
      <PageState
        kind="error"
        title="Не вдалося завантажити план"
        description="Перевірте з’єднання та спробуйте ще раз."
        actions={<Button onClick={() => void query.refetch()}>Повторити</Button>}
      />
    );
  }

  const visibleDays = data.days.filter((day) => selectedDays.includes(day.date));
  const weekHasEntries = data.days.some((day) => day.meals.some((meal) => meal.entries.length > 0));
  const returnTo = "/plan?" + searchParams.toString();

  return (
    <section className="plan-screen" aria-labelledby="plan-title">
      <header className="plan-header">
        <div className="plan-header__top">
          <div>
            <p className="plan-header__eyebrow">{data.familyName}</p>
            <h1 id="plan-title">План харчування</h1>
          </div>
          <div className="plan-calendar">
            <button
              type="button"
              className="plan-calendar__trigger"
              aria-label="Обрати дату в календарі"
              aria-expanded={calendarOpen}
              aria-controls="plan-day-picker"
              onClick={() => setCalendarOpen((open) => !open)}
            >
              <CalendarDays aria-hidden="true" />
            </button>
            {calendarOpen ? (
              <div
                id="plan-day-picker"
                className="plan-calendar__popover"
                onKeyDown={(event) => {
                  if (event.key === "Escape") setCalendarOpen(false);
                }}
              >
                <DayPicker
                  mode="single"
                  locale={uk}
                  selected={calendarDate(anchorDate)}
                  defaultMonth={calendarDate(anchorDate)}
                  weekStartsOn={data.weekStartsOn === "SUNDAY" ? 0 : 1}
                  captionLayout="dropdown"
                  startMonth={new Date(new Date().getFullYear() - 2, 0)}
                  endMonth={new Date(new Date().getFullYear() + 3, 11)}
                  onSelect={(selected) => {
                    if (!selected) return;
                    updateParams({ date: dateFromCalendar(selected), days: null });
                    setCalendarOpen(false);
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="plan-week-navigation">
          <button
            type="button"
            aria-label="Попередній тиждень"
            onClick={() => updateParams({ date: moveDate(data.weekStart, -7), days: null })}
          >
            <ChevronLeft />
          </button>
          <button type="button" onClick={() => updateParams({ date: today(), days: null })}>
            <strong>
              {dateLabel(data.weekStart, { day: "numeric", month: "short" })} —{" "}
              {dateLabel(data.weekEnd, { day: "numeric", month: "short" })}
            </strong>
            <span>Сьогодні</span>
          </button>
          <button
            type="button"
            aria-label="Наступний тиждень"
            onClick={() => updateParams({ date: moveDate(data.weekStart, 7), days: null })}
          >
            <ChevronRight />
          </button>
        </div>

        <div className="plan-days" role="group" aria-label="Дні тижня">
          {data.days.map((day) => {
            const selected = selectedDays.includes(day.date);
            return (
              <button
                key={day.date}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  if (!isMulti) return updateParams({ date: day.date });
                  const next = selected
                    ? selectedDays.filter((date) => date !== day.date)
                    : [...selectedDays, day.date];
                  updateParams({
                    date: day.date,
                    days: next.length ? next.join(",") : null,
                  });
                }}
              >
                <span>{dateLabel(day.date, { weekday: "short" }).replace(".", "")}</span>
                <strong>{dateLabel(day.date, { day: "numeric" })}</strong>
              </button>
            );
          })}
        </div>
      </header>

      <div className="plan-controls">
        <label className="plan-multi-toggle">
          <input
            type="checkbox"
            checked={isMulti}
            onChange={(event) =>
              updateParams({ multi: event.target.checked ? "true" : null, days: null })
            }
          />
          <span>Кілька днів</span>
        </label>
        <div className="plan-view-switch" role="group" aria-label="Представлення плану">
          <button
            type="button"
            aria-pressed={view === "meal"}
            onClick={() => updateParams({ view: "meal" })}
          >
            <Utensils /> За прийомами
          </button>
          <button
            type="button"
            aria-pressed={view === "member"}
            onClick={() => updateParams({ view: "member" })}
          >
            <Users /> За людьми
          </button>
        </div>
      </div>

      <div className="plan-content">
        {view === "meal" ? (
          !selectedDays.length ? (
            <PlanEmpty
              icon="📅"
              title="Оберіть дні тижня"
              description="Позначте один або кілька днів, які хочете переглянути."
            />
          ) : !weekHasEntries ? (
            <PlanEmpty
              icon="🥗"
              title="План ще не створено"
              description="Перейдіть до пошуку, щоб знайти продукти та рецепти для сімейного плану."
              searchHref={discoverHref(returnTo)}
            />
          ) : (
            <>
              <SearchLink href={discoverHref(returnTo)} />
              {visibleDays.map((day) => (
                <section className="plan-day" key={day.date}>
                  <h2>{dateLabel(day.date, { weekday: "long", day: "numeric", month: "long" })}</h2>
                  {day.meals.map((meal) => (
                    <div className="plan-meal" key={meal.mealType.id}>
                      <h3>{meal.mealType.name}</h3>
                      {meal.entries.length ? (
                        <ul>
                          {meal.entries.map((entry) => (
                            <li key={entry.id}>
                              <Link href={`/food/${entry.kind}/${entry.foodId}`}>
                                <span className="food-emoji" aria-hidden="true">
                                  {entry.kind === "recipe"
                                    ? "🍲"
                                    : getCategoryEmoji(entry.categoryCode)}
                                </span>
                                <span>
                                  <strong>{entry.name}</strong>
                                  <small>
                                    {entry.participants
                                      .map((item) => `${item.name} · ${item.quantity} ${item.unit}`)
                                      .join(" · ") || "Учасників не вказано"}
                                  </small>
                                </span>
                                <ChevronRight aria-hidden="true" />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="plan-meal__empty">Нічого не заплановано</p>
                      )}
                    </div>
                  ))}
                </section>
              ))}
            </>
          )
        ) : (
          <MemberView members={data.members} days={visibleDays} returnTo={returnTo} />
        )}
      </div>
    </section>
  );
}

function MemberView({
  members,
  days,
  returnTo,
}: {
  readonly members: MealPlanWeek["members"];
  readonly days: MealPlanWeek["days"];
  readonly returnTo: string;
}) {
  return (
    <div className="member-view">
      {members.map((member) => {
        const entries = days.flatMap((day) =>
          day.meals.flatMap((meal) =>
            meal.entries.filter((entry) =>
              entry.participants.some((participant) => participant.memberId === member.memberId),
            ),
          ),
        );
        return (
          <section className="member-card" key={member.memberId}>
            <header>
              <span className="member-avatar" aria-hidden="true">
                {member.name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <h2>{member.name}</h2>
                <p>{entries.length} позицій у плані</p>
              </div>
            </header>
            {entries.length ? (
              <>
                <NutritionSummary
                  consumed={member.consumed}
                  targets={member.targets}
                  completeness={member.completeness}
                />
                <ul className="member-food-list">
                  {entries.map((entry) => (
                    <li key={entry.id}>
                      <span aria-hidden="true">
                        {entry.kind === "recipe" ? "🍲" : getCategoryEmoji(entry.categoryCode)}
                      </span>
                      {entry.name}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="member-card__empty">
                <p>Для цього учасника план ще не створено.</p>
                <SearchLink href={discoverHref(returnTo, member.memberId)} />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function discoverHref(returnTo: string, memberId?: string): string {
  const params = new URLSearchParams({ returnTo });
  if (memberId) params.set("memberId", memberId);
  return "/plan/discover?" + params.toString();
}

function SearchLink({ href }: { readonly href: string }) {
  return (
    <Link className="plan-search-link" href={href}>
      <Search aria-hidden="true" /> Перейти до пошуку їжі
    </Link>
  );
}

function PlanEmpty({
  icon,
  title,
  description,
  searchHref,
}: {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly searchHref?: string;
}) {
  return (
    <div className="plan-empty">
      <span aria-hidden="true">{icon}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {searchHref ? <SearchLink href={searchHref} /> : null}
    </div>
  );
}

function NutritionSummary({
  consumed,
  targets,
  completeness,
}: {
  readonly consumed: readonly NutrientAmount[];
  readonly targets: readonly NutrientAmount[];
  readonly completeness: string;
}) {
  const targetByCode = new Map(targets.map((item) => [item.code, item]));
  const rows = consumed.length ? consumed : targets;
  if (!rows.length)
    return <p className="nutrition-unavailable">Норми та нутрієнтні дані поки недоступні.</p>;
  return (
    <div className="nutrition-summary">
      {rows.map((item) => {
        const value = consumed.find((current) => current.code === item.code)?.value ?? 0;
        const target = targetByCode.get(item.code)?.value ?? null;
        const percent = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
        return (
          <div key={item.code}>
            <span>
              {item.name}
              <strong>
                {Math.round(value)} {unitLabel(item.unit)}
                {target ? ` / ${Math.round(target)}` : ""}
              </strong>
            </span>
            <progress max="100" value={percent}>
              {percent}%
            </progress>
          </div>
        );
      })}
      <small>
        {completeness === "partial"
          ? "Розрахунок частковий: деякі нутрієнтні дані відсутні."
          : "Розраховано за запланованими порціями."}
      </small>
    </div>
  );
}

type MealPlanWeek = Awaited<ReturnType<typeof getMealPlanWeek>>["data"];
