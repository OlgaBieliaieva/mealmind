"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  MoreVertical,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  SkipForward,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { uk } from "react-day-picker/locale";
import { toast } from "sonner";

import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import {
  confirmPlannedConsumption,
  readDiary,
  restorePlannedConsumption,
  skipPlannedConsumption,
  updateConsumptionEntry,
  voidConsumption,
  type DiaryDay,
  type DiaryItem,
  type DiaryMember,
} from "@/shared/api/consumption";
import { Button, PageState } from "@/shared/ui";
import { getCategoryEmoji } from "@/shared/lib/category-emoji";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function moveDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function weekDates(anchor: string): readonly string[] {
  const date = new Date(`${anchor}T00:00:00.000Z`);
  const start = moveDate(anchor, -((date.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => moveDate(start, index));
}
function calendarDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}
function dateFromCalendar(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function dateLabel(value: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("uk-UA", options).format(calendarDate(value));
}

export function ConsumptionDiaryScreen() {
  const parameters = useSearchParams();
  const router = useRouter();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const date = parameters.get("date") ?? today();
  const selectedMember = parameters.get("member");
  const query = useQuery({
    queryKey: ["consumption", "diary", date],
    queryFn: ({ signal }) => readDiary(getBrowserApiClient(), date, signal),
  });
  const replace = (nextDate: string, member = selectedMember) => {
    const next = new URLSearchParams({ date: nextDate });
    if (member && member !== "all") next.set("member", member);
    router.replace(`/diary?${next.toString()}`, { scroll: false });
  };

  if (query.isPending) return <PageState kind="loading" title="Завантажуємо щоденник" />;
  if (query.isError)
    return (
      <PageState
        kind="error"
        title="Не вдалося завантажити щоденник"
        actions={<Button onClick={() => void query.refetch()}>Повторити</Button>}
      />
    );

  const data = query.data.data;
  const activeId = data.role === "MEMBER" ? data.selfMemberId : selectedMember;
  const active = activeId
    ? (data.members.find((member) => member.memberId === activeId) ?? null)
    : null;
  const days = weekDates(date);
  const returnTo = `/diary?${parameters.toString()}`;

  return (
    <section className="plan-screen diary-screen" aria-labelledby="diary-title">
      <header className="plan-header">
        <div className="plan-header__top">
          <div>
            <p className="plan-header__eyebrow">{data.familyName}</p>
            <h1 id="diary-title">Щоденник харчування</h1>
          </div>
          <div className="plan-calendar">
            <button
              type="button"
              className="plan-calendar__trigger"
              aria-label="Обрати дату в календарі"
              aria-expanded={calendarOpen}
              aria-controls="diary-day-picker"
              onClick={() => setCalendarOpen((open) => !open)}
            >
              <CalendarDays aria-hidden="true" />
            </button>
            {calendarOpen ? (
              <div
                id="diary-day-picker"
                className="plan-calendar__popover"
                onKeyDown={(event) => {
                  if (event.key === "Escape") setCalendarOpen(false);
                }}
              >
                <DayPicker
                  mode="single"
                  locale={uk}
                  selected={calendarDate(date)}
                  defaultMonth={calendarDate(date)}
                  weekStartsOn={1}
                  captionLayout="dropdown"
                  startMonth={new Date(new Date().getFullYear() - 2, 0)}
                  endMonth={new Date()}
                  disabled={{ after: new Date() }}
                  onSelect={(selected) => {
                    if (!selected) return;
                    replace(dateFromCalendar(selected));
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
            onClick={() => replace(moveDate(date, -7))}
          >
            <ChevronLeft />
          </button>
          <button type="button" onClick={() => replace(today())}>
            <strong>
              {dateLabel(days[0]!, { day: "numeric", month: "short" })} —{" "}
              {dateLabel(days[6]!, { day: "numeric", month: "short" })}
            </strong>
            <span>Сьогодні</span>
          </button>
          <button
            type="button"
            aria-label="Наступний тиждень"
            onClick={() => replace(moveDate(date, 7))}
          >
            <ChevronRight />
          </button>
        </div>
        <div className="plan-days" role="group" aria-label="Дні тижня">
          {days.map((day) => (
            <button
              key={day}
              type="button"
              aria-pressed={day === date}
              onClick={() => replace(day)}
            >
              <span>{dateLabel(day, { weekday: "short" }).replace(".", "")}</span>
              <strong>{dateLabel(day, { day: "numeric" })}</strong>
            </button>
          ))}
        </div>
      </header>

      <div className="plan-content">
        <div className="member-view">
          {data.role === "OWNER" ? (
            <div className="plan-tabs" role="tablist" aria-label="Члени сім’ї">
              <button
                type="button"
                role="tab"
                aria-selected={!active}
                onClick={() => replace(date, null)}
              >
                Всі
              </button>
              {data.members.map((member) => (
                <button
                  key={member.memberId}
                  type="button"
                  role="tab"
                  aria-selected={active?.memberId === member.memberId}
                  onClick={() => replace(date, member.memberId)}
                >
                  {member.name}
                </button>
              ))}
            </div>
          ) : null}
          {!active ? (
            <FamilyDiaryOverview
              members={data.members}
              onSelect={(memberId) => replace(date, memberId)}
            />
          ) : (
            <MemberDiary member={active} day={data} returnTo={returnTo} />
          )}
        </div>
      </div>
      {(active?.canEdit ?? data.members.some((member) => member.canEdit)) ? (
        <Link
          className="plan-add-button"
          href={discoveryHref(
            date,
            active?.memberId ?? data.selfMemberId ?? data.members[0]?.memberId ?? "",
          )}
          aria-label="Додати їжу до щоденника"
        >
          <Plus aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  );
}

function FamilyDiaryOverview({
  members,
  onSelect,
}: {
  readonly members: readonly DiaryMember[];
  readonly onSelect: (memberId: string) => void;
}) {
  const confirmed = members.reduce(
    (sum, member) => sum + member.summary.confirmedCount + member.summary.changedCount,
    0,
  );
  const pending = members.reduce((sum, member) => sum + member.summary.pendingCount, 0);
  return (
    <>
      <section className="family-overview">
        <h2>Огляд родини</h2>
        <div>
          <SummaryMetric label="Членів родини" value={members.length} />
          <SummaryMetric label="Підтверджено" value={confirmed} />
          <SummaryMetric label="Очікує" value={pending} />
          <SummaryMetric
            label="Пропущено"
            value={members.reduce((sum, member) => sum + member.summary.skippedCount, 0)}
          />
          <SummaryMetric
            label="Поза планом"
            value={members.reduce((sum, member) => sum + member.summary.addedCount, 0)}
          />
          <SummaryMetric
            label="Відхилення"
            value={members.reduce((sum, member) => sum + member.summary.deviationCount, 0)}
          />
        </div>
      </section>
      <div className="family-member-summaries">
        {members.map((member) => (
          <button
            type="button"
            key={member.memberId}
            className="family-member-summary"
            onClick={() => onSelect(member.memberId)}
          >
            <header>
              <span className="member-avatar">{member.name.slice(0, 1).toUpperCase()}</span>
              <span>
                <strong>{member.name}</strong>
                <small>{member.summary.plannedCount} позицій за день</small>
              </span>
              <ChevronRight />
            </header>
            <Adherence member={member} />
          </button>
        ))}
      </div>
    </>
  );
}

function MemberDiary({
  member,
  day,
  returnTo,
}: {
  readonly member: DiaryMember;
  readonly day: DiaryDay;
  readonly returnTo: string;
}) {
  const groups = useMemo(() => {
    const values = new Map<string, { label: string; sortOrder: number; items: DiaryItem[] }>();
    for (const item of member.items) {
      const key = item.mealType?.id ?? "manual";
      const group = values.get(key) ?? {
        label: item.mealType?.name ?? "Поза планом",
        sortOrder: item.mealType?.sortOrder ?? 999,
        items: [],
      };
      group.items.push(item);
      values.set(key, group);
    }
    return [...values.values()].sort((left, right) => left.sortOrder - right.sortOrder);
  }, [member.items]);
  return (
    <div className="member-details">
      <section className="member-summary-card">
        <header className="member-summary-card__header">
          <span className="member-avatar">{member.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <h2>{member.name}</h2>
            <p>Фактичне споживання за {dateLabel(day.date, { day: "numeric", month: "long" })}</p>
          </div>
        </header>
        <div className="diary-member-summary">
          <Adherence member={member} />
          <p className="diary-deviations">
            Відхилення від плану: <strong>{member.summary.deviationCount}</strong> · додано{" "}
            {member.summary.addedCount} · змінено {member.summary.changedCount} · пропущено{" "}
            {member.summary.skippedCount}
          </p>
          <NutritionProgress member={member} />
        </div>
      </section>
      <section className="member-details__section">
        <h3>За прийомами їжі</h3>
        {groups.length ? (
          <div className="member-meal-list">
            {groups.map((group) => (
              <DiaryMealGroup
                key={group.label}
                group={group}
                member={member}
                day={day}
                returnTo={returnTo}
              />
            ))}
          </div>
        ) : (
          <div className="member-card__empty diary-empty">
            <BookOpen />
            <p>
              Записів за цей день немає. Приготовані позиції плану з’являться тут для підтвердження.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function DiaryMealGroup({
  group,
  member,
  day,
  returnTo,
}: {
  readonly group: { label: string; items: DiaryItem[] };
  readonly member: DiaryMember;
  readonly day: DiaryDay;
  readonly returnTo: string;
}) {
  const [open, setOpen] = useState(true);
  const confirmed = group.items.filter(
    (item) => item.status === "CONFIRMED" || item.status === "CHANGED",
  ).length;
  return (
    <section className="member-meal-section" aria-label={group.label}>
      <button
        type="button"
        className="member-meal-section__summary"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          <strong>
            {group.label}
            {open ? <ChevronUp /> : <ChevronDown />}
          </strong>
          <small>
            {group.items.length} позицій · {confirmed}/{group.items.length} спожито
          </small>
        </span>
      </button>
      {open ? (
        <ul className="member-meal-section__foods">
          {group.items.map((item) => (
            <DiaryItemRow
              key={item.key}
              item={item}
              member={member}
              day={day}
              returnTo={returnTo}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function DiaryItemRow({
  item,
  member,
  day,
  returnTo,
}: {
  readonly item: DiaryItem;
  readonly member: DiaryMember;
  readonly day: DiaryDay;
  readonly returnTo: string;
}) {
  const client = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editQuantity, setEditQuantity] = useState(
    Math.round(item.actualQuantityGrams ?? item.plannedQuantityGrams ?? 100),
  );
  const [editMealTypeId, setEditMealTypeId] = useState(item.mealType?.id ?? "");
  const setDay = (value: DiaryDay) =>
    client.setQueryData(["consumption", "diary", day.date], { data: value });
  const acceptDay = (value: DiaryDay) => {
    setDay(value);
    void client.invalidateQueries({ queryKey: ["consumption", "dashboard"] });
  };
  const mutationOptions = {
    onError: () => toast.error("Не вдалося оновити запис щоденника."),
  };
  const confirm = useMutation({
    mutationFn: () =>
      confirmPlannedConsumption(
        getBrowserApiClient(),
        item.participantId!,
        item.plannedQuantityGrams ?? undefined,
      ),
    onSuccess: (response) => acceptDay(response.data),
    ...mutationOptions,
  });
  const unconfirm = useMutation({
    mutationFn: () =>
      voidConsumption(getBrowserApiClient(), item.entryId!, item.revision!, day.date),
    onSuccess: (response) => acceptDay(response.data),
    ...mutationOptions,
  });
  const skip = useMutation({
    mutationFn: () => skipPlannedConsumption(getBrowserApiClient(), item.participantId!, day.date),
    onSuccess: (response) => acceptDay(response.data),
    ...mutationOptions,
  });
  const restore = useMutation({
    mutationFn: () =>
      restorePlannedConsumption(getBrowserApiClient(), item.participantId!, day.date),
    onSuccess: (response) => acceptDay(response.data),
    ...mutationOptions,
  });
  const update = useMutation({
    mutationFn: () =>
      updateConsumptionEntry(getBrowserApiClient(), item.entryId!, {
        expectedRevision: item.revision!,
        quantityGrams: editQuantity,
        mealTypeId: editMealTypeId,
        date: day.date,
      }),
    onSuccess: (response) => {
      setEditOpen(false);
      acceptDay(response.data);
    },
    ...mutationOptions,
  });
  const checked = item.status === "CONFIRMED" || item.status === "CHANGED";
  const skipped = item.status === "SKIPPED";
  const pending =
    confirm.isPending ||
    unconfirm.isPending ||
    skip.isPending ||
    restore.isPending ||
    update.isPending;
  const detailsHref = `/food/${item.kind}/${item.foodId}?returnTo=${encodeURIComponent(returnTo)}`;
  const checkboxTitle = skipped
    ? "Страву пропущено — відновіть її через меню"
    : checked
      ? "Скасувати підтвердження споживання"
      : "Підтвердити споживання";
  return (
    <li
      className={`member-food-card diary-food-card diary-food-card--${item.status.toLowerCase()} ${item.source === "MANUAL" ? "diary-food-card--manual" : ""}`}
    >
      <Link
        className="member-food-card__image"
        href={detailsHref}
        aria-label={`Переглянути ${item.name}`}
      >
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt="" width={88} height={88} unoptimized />
        ) : (
          <span aria-hidden="true">
            {item.kind === "recipe" ? "🍲" : getCategoryEmoji(item.categoryCode)}
          </span>
        )}
      </Link>
      <div className="member-food-card__content">
        <Link href={detailsHref}>
          <strong>{item.name}</strong>
        </Link>
        {item.source === "MANUAL" ? <span className="diary-source-badge">Поза планом</span> : null}
        <p>
          {item.kind === "recipe" ? item.recipeType?.name : item.categoryName}
          {item.energyPer100g !== null ? ` · ${Math.round(item.energyPer100g)} ккал / 100 г` : ""}
        </p>
        {item.plannedQuantityGrams !== null ? (
          <p>
            Заплановано: {Math.round(item.plannedQuantityGrams)} г
            {item.plannedEnergyKcal !== null ? ` · ${Math.round(item.plannedEnergyKcal)} ккал` : ""}
          </p>
        ) : null}
        <p>
          Фактично:{" "}
          {item.actualQuantityGrams === null ? (
            "—"
          ) : (
            <>
              {Math.round(item.actualQuantityGrams)} г
              {item.actualEnergyKcal !== null ? ` · ${Math.round(item.actualEnergyKcal)} ккал` : ""}
            </>
          )}
        </p>
        {item.actualQuantityGrams !== null ? (
          <p>
            Б {Math.round(item.macros.protein ?? 0)} · Ж {Math.round(item.macros.fat ?? 0)} · В{" "}
            {Math.round(item.macros.carbohydrate ?? 0)}
          </p>
        ) : null}
      </div>
      <div className="member-food-card__actions">
        <button
          type="button"
          aria-label={`Дії для ${item.name}`}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <MoreVertical />
        </button>
        {menuOpen ? (
          <div className="planned-food-card__menu">
            {item.source === "MEAL_PLAN" ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setMenuOpen(false);
                  if (skipped) restore.mutate();
                  else skip.mutate();
                }}
              >
                {skipped ? <RotateCcw /> : <SkipForward />}
                {skipped ? "Відновити" : "Пропустити"}
              </button>
            ) : null}
            {checked ? (
              <button
                type="button"
                onClick={() => {
                  setEditQuantity(
                    Math.round(item.actualQuantityGrams ?? item.plannedQuantityGrams ?? 100),
                  );
                  setEditMealTypeId(item.mealType?.id ?? member.mealTypes[0]?.id ?? "");
                  setMenuOpen(false);
                  setEditOpen(true);
                }}
              >
                <SlidersHorizontal />
                Змінити
              </button>
            ) : null}
          </div>
        ) : null}
        <label
          className={`prepared-toggle diary-consumption-toggle diary-consumption-toggle--${item.status.toLowerCase()}`}
          title={checkboxTitle}
        >
          <input
            type="checkbox"
            aria-label={`${checkboxTitle}: ${item.name}`}
            checked={checked}
            disabled={
              !member.canEdit || pending || skipped || (item.source === "MANUAL" && !checked)
            }
            onChange={(event) => (event.target.checked ? confirm.mutate() : unconfirm.mutate())}
          />
          <span aria-hidden="true">{checked ? "✓" : skipped ? "—" : ""}</span>
        </label>
      </div>
      {editOpen ? (
        <div
          className="diary-edit-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={`Змінити ${item.name}`}
        >
          <div>
            <h3>Змінити факт споживання</h3>
            <label>
              Фактична порція, г
              <input
                type="number"
                min="1"
                step="1"
                value={editQuantity}
                onChange={(event) => setEditQuantity(Number(event.target.value))}
              />
            </label>
            <fieldset>
              <legend>Прийом їжі</legend>
              <div className="advanced-plan__meals">
                {member.mealTypes.map((mealType) => (
                  <button
                    key={mealType.id}
                    type="button"
                    aria-pressed={mealType.id === editMealTypeId}
                    onClick={() => setEditMealTypeId(mealType.id)}
                  >
                    {mealType.name}
                  </button>
                ))}
              </div>
            </fieldset>
            <footer>
              <button type="button" onClick={() => setEditOpen(false)}>
                Скасувати
              </button>
              <button
                type="button"
                disabled={editQuantity <= 0 || !editMealTypeId || update.isPending}
                onClick={() => update.mutate()}
              >
                {update.isPending ? "Зберігаємо…" : "Зберегти"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function Adherence({ member }: { readonly member: DiaryMember }) {
  return (
    <div className="diary-adherence">
      <span>
        Дотримання плану{" "}
        <strong>
          {member.summary.adherencePercent === null ? "—" : `${member.summary.adherencePercent}%`}
        </strong>
      </span>
      <progress max="100" value={member.summary.adherencePercent ?? 0}>
        {member.summary.adherencePercent ?? 0}%
      </progress>
    </div>
  );
}
function NutritionProgress({ member }: { readonly member: DiaryMember }) {
  const actual = new Map(member.nutrients.map((item) => [item.code, item]));
  const macroCodes = new Set(["protein", "total_fat", "carbohydrate"]);
  const targets = member.targets.filter((target) => macroCodes.has(target.code));
  return (
    <details className="diary-nutrients">
      <summary>
        <span>
          <strong>Факт і цільові макронутрієнти</strong>
          <small>{targets.length ? `${targets.length} показники` : "Цілі не налаштовані"}</small>
        </span>
        <ChevronDown aria-hidden="true" />
      </summary>
      {targets.length ? (
        <div>
          {targets.map((target) => {
            const value = actual.get(target.code)?.value ?? 0;
            const reference = target.targetValue ?? target.maximumValue ?? target.minimumValue;
            const percent = reference && reference > 0 ? Math.round((value / reference) * 100) : 0;
            return (
              <article key={target.code}>
                <span>{target.name}</span>
                <strong>
                  {Math.round(value)} {unitLabel(target.unit)}
                </strong>
                <small>{targetDescription(target)}</small>
                <progress
                  max="100"
                  value={Math.min(percent, 100)}
                  aria-label={`${target.name}: ${percent}% цілі`}
                >
                  {percent}%
                </progress>
              </article>
            );
          })}
        </div>
      ) : (
        <p>Цільові макронутрієнти ще не налаштовані.</p>
      )}
    </details>
  );
}
function targetDescription(target: DiaryMember["targets"][number]): string {
  const unit = unitLabel(target.unit);
  if (target.minimumValue !== null && target.maximumValue !== null)
    return `${target.minimumValue}–${target.maximumValue} ${unit}`;
  if (target.targetValue !== null) return `ціль ${target.targetValue} ${unit}`;
  if (target.minimumValue !== null) return `від ${target.minimumValue} ${unit}`;
  return target.maximumValue !== null ? `до ${target.maximumValue} ${unit}` : "без числової межі";
}
function unitLabel(unit: string): string {
  return ({ KCAL: "ккал", G: "г", MG: "мг", MCG: "мкг" } as Record<string, string>)[unit] ?? unit;
}
function discoveryHref(date: string, memberId: string): string {
  const returnTo = `/diary?date=${date}${memberId ? `&member=${memberId}` : ""}`;
  return `/plan/discover?${new URLSearchParams({ mode: "diary-select", date, ...(memberId ? { memberId } : {}), returnTo }).toString()}`;
}
function SummaryMetric({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
