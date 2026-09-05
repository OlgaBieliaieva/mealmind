"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Rows3 } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { uk } from "react-day-picker/locale";

import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import { readDashboard, type DashboardMember, type DiaryTarget } from "@/shared/api/consumption";
import { Button, PageState } from "@/shared/ui";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function calendarDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function moveDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function moveMonth(value: string, months: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  const originalDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(originalDay, lastDay));
  return date.toISOString().slice(0, 10);
}

function dateLabel(value: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("uk-UA", options).format(calendarDate(value));
}

function weekDates(anchor: string): readonly string[] {
  const date = new Date(`${anchor}T00:00:00.000Z`);
  const start = moveDate(anchor, -((date.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => moveDate(start, index));
}

function monthDates(anchor: string): readonly string[] {
  const date = new Date(`${anchor}T00:00:00.000Z`);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) =>
    new Date(Date.UTC(year, month, index + 1)).toISOString().slice(0, 10),
  );
}

function dateFromCalendar(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AnalyticalDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const requestedDate = searchParams.get("date");
  const anchorDate = requestedDate && DATE_PATTERN.test(requestedDate) ? requestedDate : today();
  const view = searchParams.get("view") === "month" ? "month" : "week";
  const isMulti = searchParams.get("multi") === "true";
  const visibleDays = useMemo(() => weekDates(anchorDate), [anchorDate]);
  const selectedDates = useMemo(() => {
    if (!isMulti) return view === "month" ? monthDates(anchorDate) : visibleDays;
    const available = new Set(visibleDays);
    const requested = (searchParams.get("days") ?? "")
      .split(",")
      .filter((date) => available.has(date));
    return requested.length ? [...new Set(requested)].sort() : [anchorDate];
  }, [anchorDate, isMulti, searchParams, view, visibleDays]);
  const query = useQuery({
    queryKey: ["consumption", "dashboard", selectedDates.join(",")],
    queryFn: ({ signal }) => readDashboard(getBrowserApiClient(), selectedDates, signal),
  });

  const updateParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([key, value]) =>
      value === null ? next.delete(key) : next.set(key, value),
    );
    router.replace(`/analytics?${next.toString()}`, { scroll: false });
  };

  if (query.isPending) return <PageState kind="loading" title="Завантажуємо аналітику" />;
  if (query.isError)
    return (
      <PageState
        kind="error"
        title="Не вдалося завантажити аналітику"
        actions={<Button onClick={() => void query.refetch()}>Повторити</Button>}
      />
    );

  const data = query.data.data;
  const requestedMember = searchParams.get("member");
  const activeMember =
    data.members.find((member) => member.memberId === requestedMember) ??
    data.members.find((member) => member.memberId === data.selfMemberId) ??
    data.members[0];
  const navigationStep = view === "month" && !isMulti ? "month" : "week";
  const navigationLabel =
    view === "month" && !isMulti
      ? dateLabel(anchorDate, { month: "long", year: "numeric" })
      : `${dateLabel(visibleDays[0]!, { day: "numeric", month: "short" })} — ${dateLabel(
          visibleDays[6]!,
          { day: "numeric", month: "short" },
        )}`;

  const movePeriod = (direction: -1 | 1) =>
    updateParams({
      date:
        navigationStep === "month"
          ? moveMonth(anchorDate, direction)
          : moveDate(visibleDays[0]!, direction * 7),
      days: null,
    });

  return (
    <section className="plan-screen analytics-screen" aria-labelledby="dashboard-title">
      <header className="plan-header">
        <div className="plan-header__top">
          <div>
            <p className="plan-header__eyebrow">{data.familyName}</p>
            <h1 id="dashboard-title">Прогрес</h1>
          </div>
          <div className="plan-calendar">
            <button
              type="button"
              className="plan-calendar__trigger"
              aria-label="Обрати дату в календарі"
              aria-expanded={calendarOpen}
              aria-controls="analytics-day-picker"
              onClick={() => setCalendarOpen((open) => !open)}
            >
              <CalendarDays aria-hidden="true" />
            </button>
            {calendarOpen ? (
              <div
                id="analytics-day-picker"
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
                  weekStartsOn={1}
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
            aria-label={navigationStep === "month" ? "Попередній місяць" : "Попередній тиждень"}
            onClick={() => movePeriod(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button type="button" onClick={() => updateParams({ date: today(), days: null })}>
            <strong>{navigationLabel}</strong>
            <span>Сьогодні</span>
          </button>
          <button
            type="button"
            aria-label={navigationStep === "month" ? "Наступний місяць" : "Наступний тиждень"}
            onClick={() => movePeriod(1)}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>

        <div className="plan-days" role="group" aria-label="Дні тижня">
          {visibleDays.map((day) => {
            const selected = isMulti ? selectedDates.includes(day) : true;
            return (
              <button
                key={day}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  if (!isMulti) return updateParams({ date: day });
                  const next = selected
                    ? selectedDates.filter((date) => date !== day)
                    : [...selectedDates, day].sort();
                  if (!next.length) return;
                  updateParams({ date: day, days: next.join(",") });
                }}
              >
                <span>{dateLabel(day, { weekday: "short" }).replace(".", "")}</span>
                <strong>{dateLabel(day, { day: "numeric" })}</strong>
              </button>
            );
          })}
        </div>
      </header>

      <div className="plan-controls analytics-controls">
        <label className="plan-multi-toggle">
          <input
            type="checkbox"
            checked={isMulti}
            onChange={(event) =>
              updateParams({
                multi: event.target.checked ? "true" : null,
                days: null,
              })
            }
          />
          <span>Кілька днів</span>
        </label>
        <div className="plan-view-switch" role="group" aria-label="Період аналітики">
          <button
            type="button"
            aria-label="Тиждень"
            aria-pressed={!isMulti && view === "week"}
            onClick={() => updateParams({ view: "week", multi: null, days: null })}
          >
            <Rows3 aria-hidden="true" />
            <span>Тиждень</span>
          </button>
          <button
            type="button"
            aria-label="Місяць"
            aria-pressed={!isMulti && view === "month"}
            onClick={() => updateParams({ view: "month", multi: null, days: null })}
          >
            <CalendarRange aria-hidden="true" />
            <span>Місяць</span>
          </button>
        </div>
      </div>

      <div className="plan-content">
        <div className="member-view analytics-member-view">
          {data.role === "OWNER" ? (
            <div className="plan-tabs" role="tablist" aria-label="Члени сім’ї">
              {data.members.map((member) => (
                <button
                  key={member.memberId}
                  type="button"
                  role="tab"
                  aria-selected={activeMember?.memberId === member.memberId}
                  onClick={() => updateParams({ member: member.memberId })}
                >
                  {member.name}
                </button>
              ))}
            </div>
          ) : null}
          {activeMember ? (
            <DashboardMemberView
              member={activeMember}
              periodStart={data.periodStart}
              periodEnd={data.periodEnd}
              daysCount={data.dates.length}
            />
          ) : (
            <PageState kind="empty" title="У сім’ї немає активних профілів" />
          )}
        </div>
      </div>
    </section>
  );
}

function DashboardMemberView({
  member,
  periodStart,
  periodEnd,
  daysCount,
}: {
  readonly member: DashboardMember;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly daysCount: number;
}) {
  return (
    <div className="analytics-member">
      <header className="analytics-member__header">
        <span className="member-avatar">{member.name.slice(0, 1).toUpperCase()}</span>
        <div>
          <h2>{member.name}</h2>
          <p>
            {dateLabel(periodStart, { day: "numeric", month: "short" })} —{" "}
            {dateLabel(periodEnd, { day: "numeric", month: "short", year: "numeric" })} ·{" "}
            {daysCount} дн.
          </p>
        </div>
      </header>
      <div className="analytics-grid">
        <AdherenceCard member={member} />
        <MacroDistribution member={member} />
        <NutritionProgress member={member} />
        <WeightProgress member={member} />
      </div>
    </div>
  );
}

function AdherenceCard({ member }: { readonly member: DashboardMember }) {
  const percent = member.summary.adherencePercent;
  return (
    <section className="analytics-card analytics-adherence" aria-labelledby="adherence-title">
      <header>
        <div>
          <p>План харчування</p>
          <h3 id="adherence-title">Дотримання плану</h3>
        </div>
        <strong>{percent === null ? "—" : `${percent}%`}</strong>
      </header>
      <progress max="100" value={percent ?? 0}>
        {percent ?? 0}%
      </progress>
      {member.summary.plannedCount ? (
        <>
          <p>
            {member.summary.confirmedCount + member.summary.changedCount} із{" "}
            {member.summary.plannedCount} готових позицій підтверджено
          </p>
          <small>
            Змінено {member.summary.changedCount} · пропущено {member.summary.skippedCount} · поза
            планом {member.summary.addedCount}
          </small>
        </>
      ) : (
        <p>За вибраний період немає готових позицій плану.</p>
      )}
    </section>
  );
}

function MacroDistribution({ member }: { readonly member: DashboardMember }) {
  const actual = new Map(member.nutrients.map((nutrient) => [nutrient.code, nutrient.value]));
  const proteinKcal = (actual.get("protein") ?? 0) * 4;
  const fatKcal = (actual.get("total_fat") ?? 0) * 9;
  const carbohydrateKcal = (actual.get("carbohydrate") ?? 0) * 4;
  const total = proteinKcal + fatKcal + carbohydrateKcal;
  const protein = total ? Math.round((proteinKcal / total) * 100) : 0;
  const fat = total ? Math.round((fatKcal / total) * 100) : 0;
  const carbohydrate = total ? Math.max(0, 100 - protein - fat) : 0;
  const proteinEnd = protein;
  const fatEnd = protein + fat;
  return (
    <section className="analytics-card analytics-macros" aria-labelledby="macros-title">
      <header>
        <div>
          <p>Фактичне споживання</p>
          <h3 id="macros-title">Розподіл макронутрієнтів</h3>
        </div>
      </header>
      {total ? (
        <div className="analytics-macros__content">
          <svg
            className="analytics-macros__chart"
            role="img"
            aria-label={`Білки ${protein}%, жири ${fat}%, вуглеводи ${carbohydrate}%`}
            viewBox="0 0 42 42"
          >
            <circle className="track" cx="21" cy="21" r="15.9155" pathLength="100" />
            <circle
              className="protein"
              cx="21"
              cy="21"
              r="15.9155"
              pathLength="100"
              strokeDasharray={`${protein} ${100 - protein}`}
            />
            <circle
              className="fat"
              cx="21"
              cy="21"
              r="15.9155"
              pathLength="100"
              strokeDasharray={`${fat} ${100 - fat}`}
              strokeDashoffset={-proteinEnd}
            />
            <circle
              className="carbohydrate"
              cx="21"
              cy="21"
              r="15.9155"
              pathLength="100"
              strokeDasharray={`${carbohydrate} ${100 - carbohydrate}`}
              strokeDashoffset={-fatEnd}
            />
            <text x="21" y="22.5" textAnchor="middle">
              Б/Ж/В
            </text>
          </svg>
          <ul>
            <MacroLegend label="Білки" value={protein} className="protein" />
            <MacroLegend label="Жири" value={fat} className="fat" />
            <MacroLegend label="Вуглеводи" value={carbohydrate} className="carbohydrate" />
          </ul>
        </div>
      ) : (
        <p>За вибраний період немає підтверджених даних про макронутрієнти.</p>
      )}
      <small>Частка енергетичної цінності: білки й вуглеводи 4 ккал/г, жири 9 ккал/г.</small>
    </section>
  );
}

function MacroLegend({
  label,
  value,
  className,
}: {
  readonly label: string;
  readonly value: number;
  readonly className: string;
}) {
  return (
    <li className={className}>
      <span>{label}</span>
      <strong>{value}%</strong>
    </li>
  );
}

function NutritionProgress({ member }: { readonly member: DashboardMember }) {
  const actual = new Map(member.nutrients.map((nutrient) => [nutrient.code, nutrient.value]));
  return (
    <section className="analytics-card analytics-nutrition" aria-labelledby="nutrition-title">
      <header>
        <div>
          <p>Факт і персональні орієнтири</p>
          <h3 id="nutrition-title">Цільові нутрієнти</h3>
        </div>
      </header>
      {member.targets.length ? (
        <div className="analytics-targets">
          {member.targets.map((target) => {
            const value = actual.get(target.code) ?? 0;
            const reference = targetReference(target);
            const percent =
              reference !== null && reference > 0 ? Math.round((value / reference) * 100) : 0;
            return (
              <article key={target.code}>
                <span>{target.name}</span>
                <strong>
                  {formatValue(value)} {unitLabel(target.unit)}
                </strong>
                <small>{targetDescription(target)}</small>
                <progress
                  max="100"
                  value={Math.min(100, percent)}
                  aria-label={`${target.name}: ${percent}% цілі`}
                >
                  {percent}%
                </progress>
              </article>
            );
          })}
        </div>
      ) : (
        <p>Цілі нутрієнтів не налаштовано. Додайте їх у профілі, щоб бачити прогрес.</p>
      )}
    </section>
  );
}

function WeightProgress({ member }: { readonly member: DashboardMember }) {
  const { startKg, endKg, changeKg } = member.weight;
  return (
    <section className="analytics-card analytics-weight" aria-labelledby="weight-title">
      <header>
        <div>
          <p>Динаміка профілю</p>
          <h3 id="weight-title">Вага за період</h3>
        </div>
      </header>
      {startKg !== null && endKg !== null && changeKg !== null ? (
        <div className="analytics-weight__values">
          <div>
            <span>На початок</span>
            <strong>{formatValue(startKg)} кг</strong>
          </div>
          <div>
            <span>На кінець</span>
            <strong>{formatValue(endKg)} кг</strong>
          </div>
          <div className={changeKg > 0 ? "increase" : changeKg < 0 ? "decrease" : ""}>
            <span>Різниця</span>
            <strong>
              {changeKg > 0 ? "+" : ""}
              {formatValue(changeKg)} кг
            </strong>
          </div>
        </div>
      ) : (
        <p>Дані про вагу не додано до профілю.</p>
      )}
    </section>
  );
}

function targetReference(target: DiaryTarget): number | null {
  if (target.targetValue !== null) return target.targetValue;
  if (target.minimumValue !== null && target.maximumValue !== null)
    return (target.minimumValue + target.maximumValue) / 2;
  return target.minimumValue ?? target.maximumValue;
}

function targetDescription(target: DiaryTarget): string {
  const unit = unitLabel(target.unit);
  if (target.minimumValue !== null && target.maximumValue !== null)
    return `${formatValue(target.minimumValue)}–${formatValue(target.maximumValue)} ${unit}`;
  if (target.targetValue !== null) return `ціль ${formatValue(target.targetValue)} ${unit}`;
  if (target.minimumValue !== null) return `від ${formatValue(target.minimumValue)} ${unit}`;
  return target.maximumValue !== null
    ? `до ${formatValue(target.maximumValue)} ${unit}`
    : "орієнтир не задано";
}

function unitLabel(value: string): string {
  return (
    ({ KCAL: "ккал", G: "г", MG: "мг", MCG: "мкг", PERCENT: "%" } as Record<string, string>)[
      value
    ] ?? value.toLowerCase()
  );
}

function formatValue(value: number): string {
  return new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 }).format(value);
}
