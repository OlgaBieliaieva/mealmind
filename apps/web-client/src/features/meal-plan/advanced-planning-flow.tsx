"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

import { sanitizeReturnTo } from "@/features/auth/safe-return-to";
import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import { getFoodDetails, type FoodDetails, type FoodKind } from "@/shared/api/food";
import {
  createMealEntries,
  getPlanningContext,
  type BatchMealEntry,
  type PlanningContext,
} from "@/shared/api/meal-plans";
import { getCategoryEmoji } from "@/shared/lib/category-emoji";
import { getRecipeTypeEmoji } from "@/shared/lib/recipe-type-emoji";
import { Button, PageState } from "@/shared/ui";

interface MemberDraft {
  readonly days: readonly string[];
  readonly mealTypeIds: readonly string[];
  readonly quantityGrams: number;
}
type Draft = Readonly<Record<string, MemberDraft>>;

export function AdvancedPlanningFlow({
  kind,
  id,
}: {
  readonly kind: FoodKind;
  readonly id: string;
}) {
  const params = useSearchParams();
  const date = params.get("date") ?? new Date().toISOString().slice(0, 10);
  const returnTo = sanitizeReturnTo(params.get("returnTo"), "/plan");
  const requestedDays = params.get("days");
  const editMode = params.get("mode") === "edit";
  const initialDays = useMemo(
    () => requestedDays?.split(",").filter(Boolean) ?? [date],
    [date, requestedDays],
  );
  const contextQuery = useQuery({
    queryKey: ["meal-plan", "planning-context", date],
    queryFn: ({ signal }) => getPlanningContext(getBrowserApiClient(), date, signal),
  });
  const foodQuery = useQuery({
    queryKey: ["food-details", kind, id],
    queryFn: () => getFoodDetails(getBrowserApiClient(), kind, id),
  });
  if (contextQuery.isPending || foodQuery.isPending)
    return <PageState kind="loading" title="Готуємо простір планування" />;
  if (contextQuery.isError || foodQuery.isError)
    return (
      <PageState
        kind="error"
        title="Не вдалося відкрити планування"
        actions={
          <Button
            onClick={() => {
              void contextQuery.refetch();
              void foodQuery.refetch();
            }}
          >
            Повторити
          </Button>
        }
      />
    );
  const context = contextQuery.data.data;
  const food = foodQuery.data.data;
  const storageKey =
    planningDraftKey(context.familyId, context.weekStart, kind, id) + (editMode ? ":edit" : "");

  return (
    <LoadedPlanningFlow
      key={storageKey}
      kind={kind}
      id={id}
      date={date}
      returnTo={returnTo}
      initialDays={initialDays}
      context={context}
      food={food}
      storageKey={storageKey}
      editMode={editMode}
    />
  );
}

function LoadedPlanningFlow({
  kind,
  id,
  date,
  returnTo,
  initialDays,
  context,
  food,
  storageKey,
  editMode,
}: {
  readonly kind: FoodKind;
  readonly id: string;
  readonly date: string;
  readonly returnTo: string;
  readonly initialDays: readonly string[];
  readonly context: PlanningContext;
  readonly food: FoodDetails;
  readonly storageKey: string;
  readonly editMode: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const initialState = useMemo(
    () => readInitialDraft(context, food, initialDays, storageKey),
    [context, food, initialDays, storageKey],
  );
  const [draft, setDraft] = useState<Draft>(() => initialState.draft);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(
    () => context.members.find((member) => member.canPlan)?.id ?? null,
  );
  const [reviewing, setReviewing] = useState(false);
  const reviewTriggerRef = useRef<HTMLButtonElement>(null);
  const dirty = Object.values(draft).some(
    (member) => member.days.length && member.mealTypeIds.length,
  );

  useEffect(() => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft, storageKey]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  const entries = useMemo(() => buildEntries(kind, id, draft), [draft, id, kind]);
  const mutation = useMutation({
    mutationFn: () =>
      createMealEntries(
        getBrowserApiClient(),
        date,
        entries,
        editMode ? "UPSERT_PARTICIPANTS" : "REJECT",
      ),
    onSuccess: async () => {
      window.sessionStorage.removeItem(storageKey);
      await queryClient.invalidateQueries({ queryKey: ["meal-plan"] });
      router.push(returnTo);
    },
  });
  const members = context.members.filter((member) => member.canPlan);
  const activeMember = members.find((member) => member.id === activeMemberId) ?? members[0];

  return (
    <section className="advanced-plan" aria-labelledby="advanced-plan-title">
      <header>
        <Link href={returnTo} aria-label="Повернутися">
          <ArrowLeft />
        </Link>
        <div>
          <h1 id="advanced-plan-title">{editMode ? "Редагувати план" : "Додати в план"}</h1>
          <p>Налаштуйте, хто і коли буде споживати цю їжу</p>
        </div>
      </header>
      <article className="advanced-plan__food">
        <span aria-hidden="true">
          <span>
            {food.kind === "product"
              ? getCategoryEmoji(food.category.code)
              : getRecipeTypeEmoji(food.recipeType?.code)}
          </span>
          {food.imageUrl ? (
            // Signed URLs походять із приватного Supabase bucket і не мають сталого host.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={food.imageUrl}
              alt={food.kind === "product" ? food.name : food.title}
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
            />
          ) : null}
        </span>
        <div>
          <strong>{food.kind === "recipe" ? food.title : food.name}</strong>
          <small>
            {kind === "recipe" ? "Рецепт" : food.kind === "product" ? food.category.name : ""}
          </small>
        </div>
      </article>
      {initialState.restored ? (
        <p className="advanced-plan__notice" role="status">
          Відновлено незавершену чернетку.
        </p>
      ) : null}
      <div className="advanced-plan__tabs" role="tablist" aria-label="Члени родини">
        {members.map((member) => (
          <button
            key={member.id}
            type="button"
            role="tab"
            aria-selected={member.id === activeMember?.id}
            onClick={() => setActiveMemberId(member.id)}
          >
            {member.name}
            {draft[member.id]?.mealTypeIds.length ? <Check aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
      {activeMember ? (
        <MemberEditor
          context={context}
          member={activeMember}
          value={draft[activeMember.id]}
          onChange={(value) => setDraft((current) => ({ ...current, [activeMember.id]: value }))}
        />
      ) : (
        <PageState kind="empty" title="Немає доступних профілів" />
      )}
      <aside className="advanced-plan__summary" aria-live="polite">
        <strong>Буде створено: {entries.length}</strong>
        <span>
          {
            new Set(entries.flatMap((entry) => entry.participants.map((item) => item.memberId)))
              .size
          }{" "}
          учасників · {new Set(entries.map((entry) => entry.date)).size} днів
        </span>
        <span>
          Загальний обсяг:{" "}
          {entries.reduce(
            (sum, entry) =>
              sum + entry.participants.reduce((total, item) => total + item.quantityGrams, 0),
            0,
          )}{" "}
          г
        </span>
      </aside>
      {mutation.isError ? (
        <p className="advanced-plan__error" role="alert">
          Не вдалося зберегти план. Дані могли змінитися — перевірте вибір і повторіть.
        </p>
      ) : null}
      <footer>
        <button
          type="button"
          className="advanced-plan__reset"
          disabled={mutation.isPending}
          onClick={() => {
            if (dirty && !window.confirm("Скасувати чернетку планування?")) return;
            window.sessionStorage.removeItem(storageKey);
            router.push(returnTo);
          }}
        >
          Скасувати
        </button>
        <button
          ref={reviewTriggerRef}
          type="button"
          aria-label={editMode ? "Переглянути й зберегти" : "Переглянути й додати"}
          disabled={!entries.length || mutation.isPending}
          onClick={() => setReviewing(true)}
        >
          {editMode ? "Зберегти" : "Додати"} ({entries.length})
        </button>
      </footer>
      {reviewing ? (
        <ReviewDialog
          entries={entries}
          members={members}
          foodName={food.kind === "recipe" ? food.title : food.name}
          pending={mutation.isPending}
          returnFocusRef={reviewTriggerRef}
          onCancel={() => setReviewing(false)}
          onConfirm={() => mutation.mutate()}
        />
      ) : null}
    </section>
  );
}

function MemberEditor({
  context,
  member,
  value,
  onChange,
}: {
  readonly context: PlanningContext;
  readonly member: PlanningContext["members"][number];
  readonly value: MemberDraft | undefined;
  readonly onChange: (value: MemberDraft) => void;
}) {
  if (!value) return null;
  const toggle = (items: readonly string[], item: string) =>
    items.includes(item) ? items.filter((value) => value !== item) : [...items, item];
  return (
    <section className="advanced-plan__member" aria-labelledby={`member-${member.id}`}>
      <h2 id={`member-${member.id}`}>{member.name}</h2>
      <p>Оберіть дні, прийоми їжі та порцію окремо для цього профілю.</p>
      <fieldset>
        <legend>На які дні</legend>
        <div className="advanced-plan__days">
          {context.availableDays.map((day) => (
            <button
              key={day}
              type="button"
              aria-pressed={value.days.includes(day)}
              onClick={() => onChange({ ...value, days: toggle(value.days, day) })}
            >
              <span>
                {new Intl.DateTimeFormat("uk-UA", { weekday: "short" }).format(
                  new Date(day + "T12:00:00"),
                )}
              </span>
              <strong>{day.slice(-2)}</strong>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>У які прийоми їжі</legend>
        <div className="advanced-plan__meals">
          {member.mealTypes.map((meal) => (
            <button
              key={meal.id}
              type="button"
              aria-pressed={value.mealTypeIds.includes(meal.id)}
              onClick={() =>
                onChange({ ...value, mealTypeIds: toggle(value.mealTypeIds, meal.id) })
              }
            >
              {meal.name}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Розмір порції</legend>
        <div className="advanced-plan__quantity">
          <button
            type="button"
            aria-label="Зменшити порцію"
            onClick={() =>
              onChange({ ...value, quantityGrams: Math.max(1, value.quantityGrams - 10) })
            }
          >
            <Minus />
          </button>
          <PortionQuantityInput
            value={value.quantityGrams}
            onChange={(quantityGrams) => onChange({ ...value, quantityGrams })}
          />
          <button
            type="button"
            aria-label="Збільшити порцію"
            onClick={() =>
              onChange({ ...value, quantityGrams: Math.min(100000, value.quantityGrams + 10) })
            }
          >
            <Plus />
          </button>
        </div>
        <div className="advanced-plan__presets">
          {[50, 100, 150, 200].map((amount) => (
            <button
              key={amount}
              type="button"
              aria-pressed={value.quantityGrams === amount}
              onClick={() => onChange({ ...value, quantityGrams: amount })}
            >
              {amount} г
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  );
}

function PortionQuantityInput({
  value,
  onChange,
}: {
  readonly value: number;
  readonly onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const displayedValue = draft ?? String(value);

  return (
    <label>
      <span className="sr-only">Порція у грамах</span>
      <input
        type="number"
        aria-label="Порція у грамах"
        min="1"
        max="100000"
        value={displayedValue}
        onFocus={() => setDraft(String(value))}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);

          if (nextDraft === "") return;

          const nextValue = Number(nextDraft);
          if (Number.isFinite(nextValue) && nextValue >= 1 && nextValue <= 100000) {
            onChange(nextValue);
          }
        }}
        onBlur={() => {
          setDraft(null);
        }}
      />{" "}
      г
    </label>
  );
}

function readInitialDraft(
  context: PlanningContext,
  food: FoodDetails,
  initialDays: readonly string[],
  storageKey: string,
): { readonly draft: Draft; readonly restored: boolean } {
  const allowedDays = initialDays.filter((day) => context.availableDays.includes(day));
  const fallbackDays = allowedDays.length ? allowedDays : [context.availableDays[0]!];
  const defaultQuantity =
    food.kind === "recipe"
      ? Math.round((Number(food.yieldWeightG) || 100) / (food.baseServings || 1))
      : Math.round(Number(food.portions[0]?.gramWeight) || 100);
  const initial = Object.fromEntries(
    context.members
      .filter((member) => member.canPlan)
      .map((member) => [
        member.id,
        { days: fallbackDays, mealTypeIds: [], quantityGrams: defaultQuantity },
      ]),
  );
  const saved = window.sessionStorage.getItem(storageKey);
  if (!saved) return { draft: initial, restored: false };
  try {
    return { draft: { ...initial, ...(JSON.parse(saved) as Draft) }, restored: true };
  } catch {
    window.sessionStorage.removeItem(storageKey);
    return { draft: initial, restored: false };
  }
}

export function planningDraftKey(
  familyId: string,
  weekStart: string,
  kind: FoodKind,
  foodId: string,
): string {
  return `mealmind:planning:${familyId}:${weekStart}:${kind}:${foodId}`;
}

export function buildEntries(kind: FoodKind, foodId: string, draft: Draft): BatchMealEntry[] {
  const grouped = new Map<
    string,
    {
      date: string;
      mealTypeId: string;
      participants: { memberId: string; quantityGrams: number }[];
    }
  >();
  for (const [memberId, member] of Object.entries(draft))
    for (const date of member.days)
      for (const mealTypeId of member.mealTypeIds) {
        const key = `${date}:${mealTypeId}`;
        const entry = grouped.get(key) ?? { date, mealTypeId, participants: [] };
        entry.participants.push({ memberId, quantityGrams: member.quantityGrams });
        grouped.set(key, entry);
      }
  return [...grouped.values()].map((entry) => ({ ...entry, kind, foodId }));
}

function ReviewDialog({
  entries,
  members,
  foodName,
  pending,
  returnFocusRef,
  onCancel,
  onConfirm,
}: {
  readonly entries: readonly BatchMealEntry[];
  readonly members: PlanningContext["members"];
  readonly foodName: string;
  readonly pending: boolean;
  readonly returnFocusRef: RefObject<HTMLButtonElement | null>;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const returnFocusTarget = returnFocusRef.current;
    headingRef.current?.focus();
    return () => returnFocusTarget?.focus();
  }, [returnFocusRef]);

  return (
    <div
      className="planning-review"
      role="dialog"
      aria-modal="true"
      aria-labelledby="planning-review-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
    >
      <div>
        <h2 ref={headingRef} id="planning-review-title" tabIndex={-1}>
          Перевірте план
        </h2>
        <p>{foodName}</p>
        <ul>
          {entries.map((entry) => (
            <li key={`${entry.date}-${entry.mealTypeId}`}>
              <strong>
                {new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium" }).format(
                  new Date(entry.date + "T12:00:00"),
                )}
              </strong>
              <span>
                {entry.participants
                  .map(
                    (participant) =>
                      `${members.find((member) => member.id === participant.memberId)?.name}: ${participant.quantityGrams} г`,
                  )
                  .join(" · ")}
              </span>
            </li>
          ))}
        </ul>
        <div>
          <button type="button" onClick={onCancel}>
            Повернутися
          </button>
          <button type="button" disabled={pending} onClick={onConfirm}>
            {pending ? "Зберігаємо…" : "Підтвердити"}
          </button>
        </div>
      </div>
    </div>
  );
}
