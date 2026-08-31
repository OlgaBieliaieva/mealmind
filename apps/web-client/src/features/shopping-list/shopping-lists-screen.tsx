"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import { listShoppingLists, type ShoppingListSummary } from "@/shared/api/shopping-lists";

const MONTH_FORMAT = new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric" });
const DATE_FORMAT = new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short" });

export function ShoppingListsScreen() {
  const query = useQuery({
    queryKey: ["shopping-lists"],
    queryFn: ({ signal }) => listShoppingLists(getBrowserApiClient(), signal),
  });
  const groups = useMemo(() => groupByMonth(query.data?.data ?? []), [query.data]);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  return (
    <section className="shopping-page">
      <header className="shopping-page__header">
        <div>
          <span className="shopping-page__eyebrow">Сімейні покупки</span>
          <h1>Списки покупок</h1>
          <p>Збережені списки на основі вашого плану харчування.</p>
        </div>
        <Link className="shopping-primary-button" href="/shop/new">
          <Plus aria-hidden="true" /> Створити
        </Link>
      </header>

      {query.isPending ? <ShoppingState title="Завантажуємо списки…" /> : null}
      {query.isError ? (
        <ShoppingState
          title="Не вдалося завантажити списки"
          action={<button onClick={() => void query.refetch()}>Повторити</button>}
        />
      ) : null}
      {!query.isPending && !query.isError && groups.length === 0 ? (
        <ShoppingState
          title="Списків ще немає"
          description="Створіть перший список із поточного або майбутнього плану."
          action={<Link href="/shop/new">Створити список</Link>}
        />
      ) : null}

      <div className="shopping-months">
        {groups.map((group) => {
          const closed = collapsed.has(group.key);
          return (
            <section key={group.key} className="shopping-month">
              <button
                type="button"
                className="shopping-month__toggle"
                aria-expanded={!closed}
                onClick={() =>
                  setCollapsed((current) => {
                    const next = new Set(current);
                    if (next.has(group.key)) next.delete(group.key);
                    else next.add(group.key);
                    return next;
                  })
                }
              >
                {closed ? <ChevronRight /> : <ChevronDown />}
                <span>{group.label}</span>
                <small>{group.items.length}</small>
              </button>
              {!closed ? (
                <ul className="shopping-list-cards">
                  {group.items.map((list) => (
                    <ShoppingListCard key={list.id} list={list} />
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>

      <Link className="shopping-fab" href="/shop/new" aria-label="Створити список покупок">
        <Plus aria-hidden="true" />
      </Link>
    </section>
  );
}

function ShoppingListCard({ list }: { readonly list: ShoppingListSummary }) {
  const visibleCount = list.itemCount;
  const percent = visibleCount ? Math.round((list.purchasedCount / visibleCount) * 100) : 0;
  return (
    <li>
      <Link href={`/shop/${list.id}`}>
        <span className="shopping-list-card__icon" aria-hidden="true">
          <ShoppingCart />
        </span>
        <span className="shopping-list-card__content">
          <span className="shopping-list-card__topline">
            <strong>{periodLabel(list.periodStart, list.periodEnd)}</strong>
            <StatusBadge status={list.status} />
          </span>
          <span>
            Придбано {list.purchasedCount} з {visibleCount}
            {list.version > 1 ? ` · версія ${list.version}` : ""}
          </span>
          <progress
            className="shopping-list-card__progress"
            aria-label={`Готовність ${percent}%`}
            max="100"
            value={percent}
          >
            {percent}%
          </progress>
        </span>
        <ChevronRight aria-hidden="true" />
      </Link>
    </li>
  );
}

export function StatusBadge({ status }: { readonly status: ShoppingListSummary["status"] }) {
  return (
    <span className={`shopping-status shopping-status--${status.toLowerCase()}`}>
      {status === "OPEN" ? "Відкритий" : status === "COMPLETED" ? "Завершений" : "Архів"}
    </span>
  );
}

export function periodLabel(start: string, end: string): string {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  return start === end
    ? DATE_FORMAT.format(startDate)
    : `${DATE_FORMAT.format(startDate)} — ${DATE_FORMAT.format(endDate)}`;
}

function groupByMonth(items: readonly ShoppingListSummary[]) {
  const groups = new Map<string, ShoppingListSummary[]>();
  for (const item of items) {
    const key = item.periodStart.slice(0, 7);
    const current = groups.get(key) ?? [];
    current.push(item);
    groups.set(key, current);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([key, values]) => ({
      key,
      label: capitalize(MONTH_FORMAT.format(new Date(`${key}-01T00:00:00`))),
      items: [...values].sort(
        (left, right) =>
          right.periodStart.localeCompare(left.periodStart) ||
          right.periodEnd.localeCompare(left.periodEnd) ||
          right.generatedAt.localeCompare(left.generatedAt),
      ),
    }));
}

function capitalize(value: string): string {
  return value ? value[0]!.toLocaleUpperCase("uk-UA") + value.slice(1) : value;
}

function ShoppingState({
  title,
  description,
  action,
}: {
  readonly title: string;
  readonly description?: string;
  readonly action?: React.ReactNode;
}) {
  return (
    <div className="shopping-state">
      <span aria-hidden="true">🛒</span>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}
