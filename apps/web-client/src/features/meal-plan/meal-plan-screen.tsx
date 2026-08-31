"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreVertical,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
  Users,
  Utensils,
  ChevronDown,
  ChevronUp,
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
  deleteMealEntry,
  deleteMealEntryParticipant,
  getMealPlanWeek,
  setMealEntryPrepared,
  type AggregatedMealPlanEntry,
  type NutritionAggregate,
  type NutrientAmount,
  type NutrientTargetAmount,
  type MemberFood,
  type MemberMealNutrition,
  type MemberDayNutrition,
} from "@/shared/api/meal-plans";
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

function roundedNutrientValue(value: number): number {
  return Math.round(value * 10) / 10;
}

function targetReference(target: NutrientTargetAmount | undefined): number | null {
  if (!target) return null;
  if (target.targetValue !== null) return target.targetValue;
  if (target.minimumValue !== null && target.maximumValue !== null) {
    return (target.minimumValue + target.maximumValue) / 2;
  }
  return target.minimumValue ?? target.maximumValue;
}

function targetDescription(target: NutrientTargetAmount): string {
  const unit = unitLabel(target.unit);

  if (target.targetValue !== null) {
    return `${roundedNutrientValue(target.targetValue)} ${unit}`;
  }

  if (target.minimumValue !== null && target.maximumValue !== null) {
    return (
      `${roundedNutrientValue(target.minimumValue)}–` +
      `${roundedNutrientValue(target.maximumValue)} ${unit}`
    );
  }

  if (target.minimumValue !== null) {
    return `від ${roundedNutrientValue(target.minimumValue)} ${unit}`;
  }

  if (target.maximumValue !== null) {
    return `до ${roundedNutrientValue(target.maximumValue)} ${unit}`;
  }

  return `${roundedNutrientValue(target.value)} ${unit}`;
}

export function MealPlanScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const anchorDate = searchParams.get("date") ?? today();
  const view = searchParams.get("view") === "member" ? "member" : "meal";
  const isMulti = searchParams.get("multi") === "true";
  const selectedParam = searchParams.get("days");
  const requestedDays = isMulti ? (selectedParam?.split(",").filter(Boolean) ?? []) : [anchorDate];

  const query = useQuery({
    queryKey: ["meal-plan", "week", anchorDate, requestedDays.join(",")],
    queryFn: ({ signal }) =>
      getMealPlanWeek(getBrowserApiClient(), anchorDate, requestedDays, signal),
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
            aria-label="За прийомами їжі"
            aria-pressed={view === "meal"}
            onClick={() => updateParams({ view: "meal" })}
          >
            <Utensils />
          </button>
          <button
            type="button"
            aria-label="За людьми"
            aria-pressed={view === "member"}
            onClick={() => updateParams({ view: "member" })}
          >
            <Users />
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
          ) : (
            <MealView
              aggregatedMeals={data.aggregatedMeals}
              selectedMealTypeId={searchParams.get("meal")}
              onSelectMealType={(mealTypeId) => updateParams({ meal: mealTypeId })}
              role={data.role}
              selfMemberId={data.selfMemberId}
              returnTo={returnTo}
              date={anchorDate}
            />
          )
        ) : (
          <MemberView
            members={data.members}
            returnTo={returnTo}
            date={anchorDate}
            role={data.role}
            selfMemberId={data.selfMemberId}
            selectedMemberId={searchParams.get("member")}
            onSelectMember={(memberId) => updateParams({ member: memberId })}
          />
        )}
      </div>
      <PlanAddMenu
        href={discoverHref(returnTo, undefined, anchorDate)}
        shoppingHref={shoppingListHref(data.planId, anchorDate, selectedDays)}
      />
    </section>
  );
}

function MealView({
  aggregatedMeals,
  selectedMealTypeId,
  onSelectMealType,
  role,
  selfMemberId,
  returnTo,
  date,
}: {
  readonly aggregatedMeals: MealPlanWeek["aggregatedMeals"];

  readonly selectedMealTypeId: string | null;

  readonly onSelectMealType: (id: string) => void;

  readonly role: "OWNER" | "MEMBER";

  readonly selfMemberId: string | null;

  readonly returnTo: string;
  readonly date: string;
}) {
  const mealTypeGroups = aggregatedMeals.byMealType
    .filter((group) => group.entries.length > 0)
    .sort(
      (a, b) =>
        a.mealType.sortOrder - b.mealType.sortOrder || a.mealType.id.localeCompare(b.mealType.id),
    );

  const active =
    selectedMealTypeId && mealTypeGroups.some((group) => group.mealType.id === selectedMealTypeId)
      ? selectedMealTypeId
      : "all";

  const entries =
    active === "all"
      ? aggregatedMeals.all
      : (mealTypeGroups.find((group) => group.mealType.id === active)?.entries ?? []);
  const nutrition =
    active === "all"
      ? aggregatedMeals.nutrition
      : (mealTypeGroups.find((group) => group.mealType.id === active)?.nutrition ??
        aggregatedMeals.nutrition);

  if (aggregatedMeals.all.length === 0) {
    return (
      <PlanEmpty
        icon="🍽️"
        title="На обрані дати план ще не створено"
        description="Перейдіть до пошуку, щоб знайти і додати страви до плану."
        searchHref={discoverHref(returnTo, undefined, date)}
      />
    );
  }

  return (
    <>
      <div className="plan-tabs" role="tablist" aria-label="Прийоми їжі">
        <button
          type="button"
          role="tab"
          aria-selected={active === "all"}
          onClick={() => onSelectMealType("all")}
        >
          <span>Всі</span>
          <span className="plan-tabs__count">({aggregatedMeals.all.length})</span>
        </button>

        {mealTypeGroups.map((group) => (
          <button
            key={group.mealType.id}
            type="button"
            role="tab"
            aria-selected={active === group.mealType.id}
            onClick={() => onSelectMealType(group.mealType.id)}
          >
            <span>{group.mealType.name}</span>
            <span className="plan-tabs__count">({group.entries.length})</span>
          </button>
        ))}
      </div>

      <MealNutritionSummary nutrition={nutrition} />

      <ul className="planned-food-list">
        {entries.map((entry) => (
          <AggregatedPlannedFoodCard
            key={entry.key}
            entry={entry}
            role={role}
            selfMemberId={selfMemberId}
            returnTo={returnTo}
          />
        ))}
      </ul>
    </>
  );
}

function AggregatedPlannedFoodCard({
  entry,
  role,
  selfMemberId,
  returnTo,
}: {
  readonly entry: AggregatedMealPlanEntry;

  readonly role: "OWNER" | "MEMBER";

  readonly selfMemberId: string | null;

  readonly returnTo: string;
}) {
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);

  const allPrepared =
    entry.sources.length > 0 && entry.sources.every((source) => source.preparedAt !== null);

  const remove = useMutation({
    mutationFn: async () => {
      await Promise.all(
        entry.sources.map((source) =>
          role === "MEMBER" && selfMemberId
            ? deleteMealEntryParticipant(
                getBrowserApiClient(),
                source.entryId,
                selfMemberId,
                source.revision,
              )
            : deleteMealEntry(getBrowserApiClient(), source.entryId, source.revision),
        ),
      );
    },

    onSuccess: async () =>
      queryClient.invalidateQueries({
        queryKey: ["meal-plan"],
      }),

    onError: () =>
      toast.error("Не вдалося видалити одну або кілька позицій. Оновіть план і повторіть дію."),
  });

  const prepared = useMutation({
    mutationFn: async () => {
      await Promise.all(
        entry.sources.map((source) =>
          setMealEntryPrepared(
            getBrowserApiClient(),
            source.entryId,
            source.revision,
            !allPrepared,
          ),
        ),
      );
    },

    onSuccess: async () =>
      queryClient.invalidateQueries({
        queryKey: ["meal-plan"],
      }),

    onError: () => toast.error("Не вдалося оновити стан готовності."),
  });

  const dayCount = entry.dates.length;

  return (
    <li className="planned-food-card">
      <Link
        className="planned-food-card__image"
        href={`/food/${entry.kind}/${entry.foodId}?returnTo=${encodeURIComponent(returnTo)}`}
      >
        {entry.imageUrl ? (
          <Image src={entry.imageUrl} alt="" width={72} height={72} unoptimized />
        ) : (
          <span aria-hidden="true">
            {entry.kind === "recipe" ? "🍲" : getCategoryEmoji(entry.categoryCode)}
          </span>
        )}
      </Link>

      <div className="planned-food-card__content">
        <Link href={`/food/${entry.kind}/${entry.foodId}?returnTo=${encodeURIComponent(returnTo)}`}>
          <strong>{entry.name}</strong>
        </Link>

        <p>
          {entry.kind === "recipe"
            ? [
                entry.recipeType?.name,

                entry.totalTimeMin ? `${entry.totalTimeMin} хв` : null,

                difficultyLabel(entry.difficulty),
              ]
                .filter(Boolean)
                .join(" · ")
            : (entry.categoryName ?? "Продукт")}
        </p>

        <p>
          {entry.totalPortions} порц. · {Math.round(entry.totalWeightGrams)} г
          {dayCount > 1 ? ` · ${dayCount} дн.` : ""}
        </p>

        <div className="planned-food-card__avatars" aria-label="Заплановано для: ">
          {entry.participants.map((participant) => (
            <span
              key={participant.memberId}
              title={`${participant.name}: ${participant.portions} порц., ${Math.round(participant.quantityInGrams)} г`}
            >
              {participant.name.slice(0, 1).toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      <div className="planned-food-card__actions">
        <button
          type="button"
          aria-label={`Дії для ${entry.name}`}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <MoreVertical />
        </button>

        {menuOpen ? (
          <div className="planned-food-card__menu">
            <Link
              href={`/food/${entry.kind}/${entry.foodId}?returnTo=${encodeURIComponent(returnTo)}`}
            >
              <Eye />
              Переглянути
            </Link>

            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => {
                setMenuOpen(false);

                toast(`Видалити «${entry.name}» з усіх відображених позицій плану?`, {
                  action: {
                    label: "Видалити",
                    onClick: () => remove.mutate(),
                  },

                  cancel: {
                    label: "Скасувати",
                    onClick: () => undefined,
                  },
                });
              }}
            >
              <Trash2 />
              Видалити
            </button>
          </div>
        ) : null}

        <label
          className="prepared-toggle"
          title={
            allPrepared
              ? "Позначити всі позиції як неготові"
              : "Позначити всі позиції як приготовані"
          }
        >
          <input
            type="checkbox"
            aria-label={
              allPrepared
                ? "Скасувати позначку для всіх позицій"
                : "Позначити всі позиції як приготовані"
            }
            checked={allPrepared}
            disabled={prepared.isPending}
            onChange={() => prepared.mutate()}
          />

          <span aria-hidden="true">✓</span>
        </label>
      </div>
    </li>
  );
}

function MemberView({
  members,
  returnTo,
  date,
  role,
  selfMemberId,
  selectedMemberId,
  onSelectMember,
}: {
  readonly members: MealPlanWeek["members"];
  readonly returnTo: string;
  readonly date: string;
  readonly role: "OWNER" | "MEMBER";
  readonly selfMemberId: string | null;
  readonly selectedMemberId: string | null;
  readonly onSelectMember: (id: string) => void;
}) {
  const allowed =
    role === "MEMBER" ? members.filter((item) => item.memberId === selfMemberId) : members;
  const active =
    role === "MEMBER"
      ? selfMemberId
      : selectedMemberId && allowed.some((item) => item.memberId === selectedMemberId)
        ? selectedMemberId
        : "all";
  return (
    <div className="member-view">
      {role === "OWNER" ? (
        <div className="plan-tabs" role="tablist" aria-label="Члени сім’ї">
          <button
            type="button"
            role="tab"
            aria-selected={active === "all"}
            onClick={() => onSelectMember("all")}
          >
            Всі
          </button>
          {allowed.map((member) => (
            <button
              key={member.memberId}
              type="button"
              role="tab"
              aria-selected={active === member.memberId}
              onClick={() => onSelectMember(member.memberId)}
            >
              {member.name}
            </button>
          ))}
        </div>
      ) : null}
      {active === "all" ? (
        <FamilyOverview members={allowed} onSelectMember={onSelectMember} />
      ) : (
        allowed
          .filter((item) => item.memberId === active)
          .map((member) => (
            <MemberDetails
              key={member.memberId}
              member={member}
              returnTo={returnTo}
              date={date}
              role={role}
              selfMemberId={selfMemberId}
            />
          ))
      )}
    </div>
  );
}

function FamilyOverview({
  members,
  onSelectMember,
}: {
  readonly members: MealPlanWeek["members"];
  readonly onSelectMember: (id: string) => void;
}) {
  const rows = members.map((member) => ({
    member,
    entryCount: member.details.days.reduce((sum, day) => sum + day.entryCount, 0),
    mealCount: member.details.days.reduce((sum, day) => sum + day.mealCount, 0),
  }));
  const withPlan = rows.filter((row) => row.entryCount > 0).length;
  const assessable = rows.filter(
    (row) =>
      row.entryCount > 0 &&
      row.member.targets.length > 0 &&
      row.member.planned.length > 0 &&
      row.member.completeness === "complete",
  );
  const attention = assessable.filter((row) => row.member.assessment.signals.length > 0).length;
  const balanced = assessable.length - attention;
  return (
    <>
      <section className="family-overview">
        <h2>Огляд родини</h2>
        <div>
          <SummaryMetric label="Членів родини" value={members.length} />
          <SummaryMetric label="Мають план" value={withPlan} />
          <SummaryMetric label="Потребують уваги" value={attention} />
          <SummaryMetric label="У межах балансу" value={balanced} />
        </div>
      </section>
      <div className="family-member-summaries">
        {rows.map(({ member, entryCount, mealCount }) => (
          <button
            type="button"
            key={member.memberId}
            className="family-member-summary"
            onClick={() => onSelectMember(member.memberId)}
          >
            <header>
              <span className="member-avatar">{member.name.slice(0, 1).toUpperCase()}</span>
              <span>
                <strong>{member.name}</strong>
                <small>
                  {entryCount} позицій · {mealCount} прийомів їжі
                </small>
              </span>
              <ChevronRight />
            </header>
            <EnergyCoverage
              assessment={member.assessment}
              hasTargets={member.targets.length > 0}
              hasPlannedNutrition={member.planned.length > 0}
              complete={member.completeness === "complete"}
            />
            {member.targets.length > 0 && member.assessment.signals.length ? (
              <div className="nutrition-signals">
                {member.assessment.signals.map((signal) => (
                  <span key={signal}>{signal}</span>
                ))}
              </div>
            ) : null}
          </button>
        ))}
      </div>
    </>
  );
}

function MemberDetails({
  member,
  returnTo,
  date,
  role,
  selfMemberId,
}: {
  readonly member: MealPlanWeek["members"][number];
  readonly returnTo: string;
  readonly date: string;
  readonly role: "OWNER" | "MEMBER";
  readonly selfMemberId: string | null;
}) {
  const entryCount = member.details.days.reduce((sum, day) => sum + day.entryCount, 0);
  const hasPlan = entryCount > 0;

  if (!hasPlan) {
    return (
      <section className="member-summary-card">
        <MemberHeader member={member} entryCount={0} />

        <div className="member-card__empty">
          <p>Для цього учасника план ще не створено.</p>
          <SearchLink href={discoverHref(returnTo, member.memberId, date)} />
        </div>
      </section>
    );
  }

  const multiDay = member.details.days.length > 1;
  const selectedDay = member.details.days[0] ?? null;

  return (
    <div className="member-details">
      <section className="member-summary-card">
        <MemberHeader member={member} entryCount={entryCount} />

        <NutritionAssessmentPanel
          nutrition={{
            planned: member.planned,
            targets: member.targets,
            completeness: member.completeness,
            assessment: member.assessment,
          }}
          periodLabel={
            multiDay
              ? `За ${member.details.days.length} дн.`
              : selectedDay
                ? `За ${dateLabel(selectedDay.date, {
                    day: "numeric",
                    month: "long",
                  })}`
                : "За обраний період"
          }
        />
      </section>

      {multiDay ? (
        <section className="member-details__section">
          <h3>По днях</h3>

          <div className="member-day-list">
            {member.details.days.map((day) => (
              <MemberDayCard
                key={day.date}
                day={day}
                memberId={member.memberId}
                returnTo={returnTo}
                role={role}
                selfMemberId={selfMemberId}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="member-details__section">
          <h3>За прийомами їжі</h3>

          {selectedDay && selectedDay.meals.length > 0 ? (
            <MemberMealList
              meals={selectedDay.meals}
              dailyEnergyTarget={targetReference(
                selectedDay.nutrition.targets.find((item) => item.code === "energy_kcal"),
              )}
              memberId={member.memberId}
              returnTo={returnTo}
              role={role}
              selfMemberId={selfMemberId}
            />
          ) : (
            <p className="member-details__empty-section">
              На обрану дату немає запланованих прийомів їжі.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function MemberMealList({
  meals,
  dailyEnergyTarget,
  memberId,
  returnTo,
  role,
  selfMemberId,
}: {
  readonly meals: readonly MemberMealNutrition[];
  readonly dailyEnergyTarget: number | null;
  readonly memberId: string;
  readonly returnTo: string;
  readonly role: "OWNER" | "MEMBER";
  readonly selfMemberId: string | null;
}) {
  return (
    <div className="member-meal-list">
      {meals.map((meal) => (
        <MemberMealCard
          key={meal.mealType.id}
          meal={meal}
          dailyEnergyTarget={dailyEnergyTarget}
          memberId={memberId}
          returnTo={returnTo}
          role={role}
          selfMemberId={selfMemberId}
        />
      ))}
    </div>
  );
}

function MemberHeader({
  member,
  entryCount,
}: {
  readonly member: MealPlanWeek["members"][number];

  readonly entryCount: number;
}) {
  return (
    <header className="member-summary-card__header">
      <span className="member-avatar">{member.name.slice(0, 1).toUpperCase()}</span>

      <div>
        <h2>{member.name}</h2>

        <p>
          {member.details.days.length} дн. · {entryCount} позицій
        </p>
      </div>
    </header>
  );
}

function NutritionAssessmentPanel({
  nutrition,
  periodLabel,
}: {
  readonly nutrition: {
    readonly planned: readonly NutrientAmount[];

    readonly targets: readonly NutrientTargetAmount[];

    readonly completeness: string;

    readonly assessment: MealPlanWeek["members"][number]["assessment"];
  };

  readonly periodLabel: string;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const energy = nutrition.planned.find((item) => item.code === "energy_kcal")?.value ?? 0;

  const energyTargetDetails = nutrition.targets.find((item) => item.code === "energy_kcal");
  const energyTarget = targetReference(energyTargetDetails);
  const hasTargets = nutrition.targets.length > 0;
  const hasPlannedNutrition = nutrition.planned.length > 0;
  const complete = nutrition.completeness === "complete";
  const status = !hasPlannedNutrition
    ? "Немає даних для оцінки"
    : !hasTargets
      ? "Цільові показники не задані"
      : !complete
        ? "Оцінка обмежена"
        : nutrition.assessment.signals.length
          ? "Потребує уваги"
          : "У межах балансу";

  return (
    <div className="nutrition-assessment">
      <header className="nutrition-assessment__header">
        <div>
          <span>Загальна оцінка</span>
          <strong>{periodLabel}</strong>
        </div>

        <button
          type="button"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((value) => !value)}
        >
          {detailsOpen ? "Згорнути" : "Деталі"}

          {detailsOpen ? <ChevronUp /> : <ChevronDown />}
        </button>
      </header>

      <div className="nutrition-assessment__headline">
        <span
          className={
            !hasTargets || !hasPlannedNutrition || !complete
              ? "nutrition-status nutrition-status--neutral"
              : nutrition.assessment.signals.length
                ? "nutrition-status nutrition-status--warning"
                : "nutrition-status nutrition-status--ok"
          }
        >
          {status}
        </span>

        <strong>
          {roundedNutrientValue(energy)} ккал
          {energyTargetDetails ? ` / ${targetDescription(energyTargetDetails)}` : ""}
        </strong>
      </div>

      <EnergyProgress
        energy={energy}
        target={energyTarget}
        coverage={nutrition.assessment.energyCoveragePercent}
      />

      {hasPlannedNutrition ? <MacroPercentages assessment={nutrition.assessment} /> : null}

      {!hasTargets ? (
        <p className="nutrition-targets-missing">
          Додайте цільові показники у профілі, щоб отримати персональну оцінку плану.
        </p>
      ) : null}

      {hasTargets && hasPlannedNutrition && !complete ? (
        <p className="nutrition-targets-missing">
          Для надійного порівняння потрібні енергія та всі основні макронутрієнти. Доступні значення
          плану показано без висновку про баланс.
        </p>
      ) : null}

      {hasTargets && complete && nutrition.assessment.signals.length ? (
        <div className="nutrition-assessment__signals">
          <p>{nutrition.assessment.signals.length} сигнали</p>

          <div className="nutrition-signals">
            {nutrition.assessment.signals.map((signal) => (
              <span key={signal}>{signal}</span>
            ))}
          </div>
        </div>
      ) : null}

      {detailsOpen && (nutrition.planned.length > 0 || nutrition.targets.length > 0) ? (
        <NutrientDetails planned={nutrition.planned} targets={nutrition.targets} />
      ) : null}
    </div>
  );
}

function EnergyProgress({
  energy,
  target,
  coverage,
}: {
  readonly energy: number;
  readonly target: number | null;
  readonly coverage: number | null;
}) {
  return (
    <div className="energy-coverage">
      <span>
        Енергія
        <strong>{coverage !== null ? `${coverage}%` : `${Math.round(energy)} ккал`}</strong>
      </span>

      {target !== null && coverage !== null ? (
        <progress max="100" value={Math.min(100, coverage)}>
          {coverage}%
        </progress>
      ) : null}
    </div>
  );
}

function MacroPercentages({
  assessment,
}: {
  readonly assessment: MealPlanWeek["members"][number]["assessment"];
}) {
  return (
    <div className="macro-percentages">
      <span>Б {assessment.macroEnergyPercent.protein ?? 0}%</span>

      <span>Ж {assessment.macroEnergyPercent.fat ?? 0}%</span>

      <span>В {assessment.macroEnergyPercent.carbohydrate ?? 0}%</span>
    </div>
  );
}

function NutrientDetails({
  planned,
  targets,
}: {
  readonly planned: readonly NutrientAmount[];

  readonly targets: readonly NutrientTargetAmount[];
}) {
  const plannedByCode = new Map(planned.map((item) => [item.code, item]));
  const targetByCode = new Map(targets.map((item) => [item.code, item]));
  const rows = [...planned, ...targets.filter((target) => !plannedByCode.has(target.code))];

  return (
    <div className="nutrient-details">
      <h4>Деталізація нутрієнтів</h4>

      <div className="nutrient-details__chips">
        {rows.map((item) => {
          const plannedAmount = plannedByCode.get(item.code);
          const target = targetByCode.get(item.code);

          return (
            <span key={item.code}>
              {item.name}:{" "}
              {plannedAmount
                ? `${roundedNutrientValue(plannedAmount.value)} ${unitLabel(plannedAmount.unit)}`
                : "—"}
              {target ? ` / ${targetDescription(target)}` : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function MealNutritionSummary({ nutrition }: { readonly nutrition: NutritionAggregate }) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (nutrition.planned.length === 0) {
    return (
      <section className="meal-nutrition-summary">
        <strong>Поживність плану</strong>
        <p>Для вибраних позицій поки немає нутрієнтних даних.</p>
      </section>
    );
  }

  const values = new Map(nutrition.planned.map((item) => [item.code, item.value]));
  const nutrients = [
    ["Енергія", values.get("energy_kcal"), "ккал"],
    ["Білки", values.get("protein"), "г"],
    ["Жири", values.get("total_fat"), "г"],
    ["Вуглеводи", values.get("carbohydrate"), "г"],
  ] as const;

  return (
    <section className="meal-nutrition-summary">
      <header>
        <div>
          <strong>Поживність плану</strong>
          <small>Сумарно для вибраних порцій без порівняння персональних цілей.</small>
        </div>
        <button
          type="button"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((value) => !value)}
        >
          {detailsOpen ? "Згорнути" : "Деталі"}
          {detailsOpen ? <ChevronUp /> : <ChevronDown />}
        </button>
      </header>
      <div className="meal-nutrition-summary__values">
        {nutrients.map(([label, value, unit]) => (
          <span key={label}>
            <small>{label}</small>
            <strong>{value === undefined ? "—" : Math.round(value * 10) / 10}</strong>
            <small>{value === undefined ? "" : unit}</small>
          </span>
        ))}
      </div>
      {detailsOpen ? <NutrientDetails planned={nutrition.planned} targets={[]} /> : null}
    </section>
  );
}

function MemberDayCard({
  day,
  memberId,
  returnTo,
  role,
  selfMemberId,
}: {
  readonly day: MemberDayNutrition;
  readonly memberId: string;
  readonly returnTo: string;
  readonly role: "OWNER" | "MEMBER";
  readonly selfMemberId: string | null;
}) {
  const [open, setOpen] = useState(false);

  const energy = day.nutrition.planned.find((item) => item.code === "energy_kcal")?.value ?? 0;

  const formattedDate = dateLabel(day.date, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <article className="member-day-card" aria-label={`План на ${formattedDate}`}>
      <button
        type="button"
        className="member-day-card__header"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          <strong>{formattedDate}</strong>

          <small>
            {day.mealCount} прийом(и) їжі · {day.entryCount} позицій
          </small>
        </span>

        <span className="member-day-card__energy">
          {Math.round(energy)} ккал
          {open ? <ChevronUp /> : <ChevronDown />}
        </span>
      </button>

      {open ? (
        <div className="member-day-card__body">
          <NutritionAssessmentPanel
            nutrition={day.nutrition}
            periodLabel={`За ${dateLabel(day.date, {
              day: "numeric",
              month: "long",
            })}`}
          />

          <div className="member-day-card__meals">
            <h4>За прийомами їжі</h4>

            {day.meals.length > 0 ? (
              <MemberMealList
                meals={day.meals}
                dailyEnergyTarget={targetReference(
                  day.nutrition.targets.find((item) => item.code === "energy_kcal"),
                )}
                memberId={memberId}
                returnTo={returnTo}
                role={role}
                selfMemberId={selfMemberId}
              />
            ) : (
              <p className="member-details__empty-section">
                На цей день немає запланованих прийомів їжі.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function MemberMealCard({
  meal,
  dailyEnergyTarget,
  memberId,
  returnTo,
  role,
  selfMemberId,
}: {
  readonly meal: MemberMealNutrition;
  readonly dailyEnergyTarget: number | null;

  readonly memberId: string;
  readonly returnTo: string;

  readonly role: "OWNER" | "MEMBER";

  readonly selfMemberId: string | null;
}) {
  const [open, setOpen] = useState(false);

  const energy = meal.nutrition.planned.find((item) => item.code === "energy_kcal")?.value ?? 0;

  const protein = meal.nutrition.planned.find((item) => item.code === "protein")?.value ?? 0;

  const fat = meal.nutrition.planned.find((item) => item.code === "total_fat")?.value ?? 0;

  const carbs = meal.nutrition.planned.find((item) => item.code === "carbohydrate")?.value ?? 0;
  const dailyEnergyPercent =
    dailyEnergyTarget !== null && dailyEnergyTarget > 0
      ? Math.round((energy / dailyEnergyTarget) * 100)
      : null;

  return (
    <section className="member-meal-section" aria-label={meal.mealType.name}>
      <button
        type="button"
        className="member-meal-section__summary"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          <strong>
            {meal.mealType.name}

            {open ? <ChevronUp /> : <ChevronDown />}
          </strong>

          <small>
            {meal.entryCount} позицій · {meal.preparedCount}/{meal.entryCount} готово
          </small>
        </span>

        <span className="member-meal-section__energy">
          <span>
            <strong>{Math.round(energy)} ккал</strong>

            {dailyEnergyPercent !== null ? (
              <small>{dailyEnergyPercent}% добової норми</small>
            ) : null}
          </span>
          <small>
            Б {Math.round(protein)} · Ж {Math.round(fat)} · В {Math.round(carbs)}
          </small>
        </span>
      </button>

      {open ? (
        <ul className="member-meal-section__foods">
          {meal.entries.map((entry) => (
            <MemberFoodCard
              key={`${entry.entryId}:${entry.date}`}
              entry={entry}
              memberId={memberId}
              returnTo={returnTo}
              role={role}
              selfMemberId={selfMemberId}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
function MemberFoodCard({
  entry,
  memberId,
  returnTo,
}: {
  readonly entry: MemberFood;
  readonly memberId: string;
  readonly returnTo: string;

  readonly role: "OWNER" | "MEMBER";

  readonly selfMemberId: string | null;
}) {
  const queryClient = useQueryClient();

  const [menuOpen, setMenuOpen] = useState(false);

  const remove = useMutation({
    /*
     * У MemberView видаляємо саме
     * participant, а не весь shared entry.
     */
    mutationFn: () =>
      deleteMealEntryParticipant(getBrowserApiClient(), entry.entryId, memberId, entry.revision),

    onSuccess: async () =>
      queryClient.invalidateQueries({
        queryKey: ["meal-plan"],
      }),

    onError: () => toast.error("Не вдалося видалити позицію."),
  });

  const edit =
    `/plan/add/${entry.kind}/${entry.foodId}?` +
    new URLSearchParams({
      date: entry.date,
      memberId,
      returnTo,
      mode: "edit",
    });

  return (
    <li className="member-food-card">
      <Link
        className="member-food-card__image"
        href={`/food/${entry.kind}/${entry.foodId}?returnTo=${encodeURIComponent(returnTo)}`}
      >
        {entry.imageUrl ? (
          <Image src={entry.imageUrl} alt="" width={88} height={88} unoptimized />
        ) : (
          <span aria-hidden="true">
            {entry.kind === "recipe" ? "🍲" : getCategoryEmoji(entry.categoryCode)}
          </span>
        )}
      </Link>

      <div className="member-food-card__content">
        <Link href={`/food/${entry.kind}/${entry.foodId}?returnTo=${encodeURIComponent(returnTo)}`}>
          <strong>{entry.name}</strong>
        </Link>

        <p>
          {entry.kind === "recipe" ? entry.recipeType?.name : entry.categoryName}

          {entry.energyPer100g !== null ? ` · ${Math.round(entry.energyPer100g)} ккал / 100 г` : ""}
        </p>

        <p>
          Порція: {Math.round(entry.portionGrams)} г
          {entry.portionEnergyKcal !== null ? ` · ${Math.round(entry.portionEnergyKcal)} ккал` : ""}
        </p>

        <p>
          Б {Math.round(entry.macros.protein ?? 0)} · Ж {Math.round(entry.macros.fat ?? 0)} · В{" "}
          {Math.round(entry.macros.carbohydrate ?? 0)}
        </p>
      </div>

      <div className="member-food-card__actions">
        <button
          type="button"
          aria-label={`Дії для ${entry.name}`}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <MoreVertical />
        </button>

        {menuOpen ? (
          <div className="planned-food-card__menu">
            <Link
              href={`/food/${entry.kind}/${entry.foodId}?returnTo=${encodeURIComponent(returnTo)}`}
            >
              <Eye />
              Переглянути
            </Link>

            <Link href={edit}>
              <SlidersHorizontal />
              Редагувати
            </Link>

            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => {
                setMenuOpen(false);

                toast(`Видалити «${entry.name}» для цього члена родини?`, {
                  action: {
                    label: "Видалити",

                    onClick: () => remove.mutate(),
                  },

                  cancel: {
                    label: "Скасувати",

                    onClick: () => undefined,
                  },
                });
              }}
            >
              <Trash2 />
              Видалити
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function PlanAddMenu({
  href,
  shoppingHref,
}: {
  readonly href: string;
  readonly shoppingHref: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="plan-add-button"
        aria-label="Дії з планом"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        +
      </button>
      {open ? (
        <div className="plan-add-menu">
          <Link href={href}>
            <Utensils /> Додати страви до плану
          </Link>
          <Link href={shoppingHref}>
            <ShoppingCart /> Створити список покупок
          </Link>
          <button
            type="button"
            onClick={() =>
              toast.info("Перенесення плану до щоденника буде доступне у наступному етапі.")
            }
          >
            <BookOpen /> Додати план до щоденника
          </button>
        </div>
      ) : null}
    </>
  );
}

function difficultyLabel(value: string | null): string | null {
  return value
    ? (({ EASY: "Легко", MEDIUM: "Середньо", HARD: "Складно" } as Record<string, string>)[value] ??
        value)
    : null;
}
function SummaryMetric({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function EnergyCoverage({
  assessment,
  hasTargets,
  hasPlannedNutrition,
  complete,
}: {
  readonly assessment: MealPlanWeek["members"][number]["assessment"];
  readonly hasTargets: boolean;
  readonly hasPlannedNutrition: boolean;
  readonly complete: boolean;
}) {
  if (!hasPlannedNutrition) {
    return <p className="nutrition-targets-missing">Нутрієнтні дані плану поки відсутні.</p>;
  }

  if (!hasTargets) {
    return (
      <p className="nutrition-targets-missing">
        Цільові показники не задані — оцінка відповідності не виконується.
      </p>
    );
  }

  if (!complete) {
    return (
      <p className="nutrition-targets-missing">
        Доступні нутрієнти показано без оцінки відповідності.
      </p>
    );
  }

  const value = assessment.energyCoveragePercent ?? 0;
  return (
    <div className="energy-coverage">
      <span>
        Енергія <strong>{value}%</strong>
      </span>
      <progress max="100" value={Math.min(100, value)}>
        {value}%
      </progress>
    </div>
  );
}

function discoverHref(returnTo: string, memberId?: string, date?: string): string {
  const params = new URLSearchParams({ returnTo, mode: "select" });
  if (memberId) params.set("memberId", memberId);
  if (date) params.set("date", date);
  return "/plan/discover?" + params.toString();
}

function shoppingListHref(
  planId: string | null,
  date: string,
  selectedDates: readonly string[],
): string {
  const query = new URLSearchParams({ date });
  if (planId) query.set("planId", planId);
  if (selectedDates.length) query.set("dates", selectedDates.join(","));
  return `/shop/new?${query.toString()}`;
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

type MealPlanWeek = Awaited<ReturnType<typeof getMealPlanWeek>>["data"];
