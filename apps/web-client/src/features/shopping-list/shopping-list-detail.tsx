"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleAlert,
  ListRestart,
  PackagePlus,
  Plus,
  RotateCcw,
  Save,
  ShoppingBasket,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import { listReferenceData } from "@/shared/api/reference-data";
import {
  addCustomShoppingItem,
  readShoppingList,
  regenerateShoppingList,
  setShoppingItemStatus,
  setShoppingListStatus,
  updateShoppingItem,
  type ShoppingListDetail,
  type ShoppingListItem,
} from "@/shared/api/shopping-lists";
import { getCategoryEmoji } from "@/shared/lib/category-emoji";

import { periodLabel, StatusBadge } from "./shopping-lists-screen";

function periodDates(start: string, end: string): readonly string[] {
  const values: string[] = [];
  const cursor = new Date(`${start}T00:00:00.000Z`);
  while (cursor.toISOString().slice(0, 10) <= end) {
    values.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return values;
}

export function ShoppingListDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const queryKey = ["shopping-lists", id] as const;
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => readShoppingList(getBrowserApiClient(), id, signal),
  });
  const units = useQuery({
    queryKey: ["reference", "measurement-units", "shopping"],
    queryFn: ({ signal }) =>
      listReferenceData(
        getBrowserApiClient(),
        { resource: "measurement-units", pageSize: 100 },
        signal,
      ),
  });
  const setDetail = (detail: ShoppingListDetail) => {
    queryClient.setQueryData(queryKey, { data: detail });
    void queryClient.invalidateQueries({ queryKey: ["shopping-lists"], exact: true });
  };
  const data = query.data?.data;
  const lifecycle = useMutation({
    mutationFn: (status: "OPEN" | "COMPLETED" | "ARCHIVED") => {
      if (!data) throw new Error("List unavailable");
      return setShoppingListStatus(getBrowserApiClient(), id, data.revision, status);
    },
    onSuccess: (response) => setDetail(response.data),
  });
  const regenerate = useMutation({
    mutationFn: () => {
      if (!data) throw new Error("List unavailable");
      return regenerateShoppingList(getBrowserApiClient(), id, data.revision);
    },
    onSuccess: (response) => {
      setDetail(response.data);
      toast.success("Створено нову версію списку");
    },
  });

  if (query.isPending)
    return (
      <div className="shopping-state">
        <h1>Завантажуємо список…</h1>
      </div>
    );
  if (query.isError || !data) {
    return (
      <div className="shopping-state">
        <h1>Список недоступний</h1>
        <button onClick={() => void query.refetch()}>Повторити</button>
      </div>
    );
  }

  const visibleItems = data.items.filter((item) => item.status !== "REMOVED");
  const pending = visibleItems.filter((item) => item.status !== "PURCHASED").length;
  const planHref = `/plan?date=${data.periodStart}&multi=true&days=${periodDates(
    data.periodStart,
    data.periodEnd,
  ).join(",")}&view=meal`;
  const productPickerHref = `/plan/discover?mode=shopping-product&shoppingListId=${id}&revision=${data.revision}&tab=product&returnTo=${encodeURIComponent(`/shop/${id}`)}`;

  return (
    <section className="shopping-page shopping-detail">
      <header className="shopping-subpage-header">
        <Link href="/shop" aria-label="Назад до списків">
          <ArrowLeft />
        </Link>
        <div>
          <span className="shopping-page__eyebrow">{data.familyName}</span>
          <h1>Список покупок</h1>
          <p>
            {periodLabel(data.periodStart, data.periodEnd)} · версія {data.version}
          </p>
          <Link className="shopping-plan-link" href={planHref}>
            Переглянути план за цей період
          </Link>
        </div>
        <StatusBadge status={data.status} />
      </header>

      <section className="shopping-summary" aria-label="Готовність списку">
        <div>
          <strong>
            {data.purchasedCount} з {data.itemCount}
          </strong>
          <span>придбано</span>
        </div>
        <progress
          className="shopping-summary__progress"
          aria-label="Готовність списку"
          max="100"
          value={data.itemCount ? Math.round((data.purchasedCount / data.itemCount) * 100) : 0}
        />
      </section>

      {data.stale && data.status !== "ARCHIVED" ? (
        <div className="shopping-warning" role="status">
          <CircleAlert />
          <div>
            <strong>План змінився після створення списку</strong>
            <p>Поточні ручні зміни не буде перенесено до нової версії.</p>
          </div>
          {data.status === "OPEN" ? (
            <button
              type="button"
              disabled={regenerate.isPending}
              onClick={() =>
                toast("Створити нову версію та архівувати поточну?", {
                  action: { label: "Створити", onClick: () => regenerate.mutate() },
                  cancel: { label: "Скасувати", onClick: () => undefined },
                })
              }
            >
              <ListRestart /> Оновити
            </button>
          ) : null}
        </div>
      ) : null}

      {data.warnings.length ? (
        <details className="shopping-warning-details">
          <summary>Зауваження до формування ({data.warnings.length})</summary>
          <ul>
            {data.warnings.map((warning, index) => (
              <li key={`${warning.code}-${index}`}>
                {warning.sourceName ? <strong>{warning.sourceName}: </strong> : null}
                {warning.message}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {data.status === "OPEN" ? (
        <div className="shopping-add-actions">
          <Link href={productPickerHref}>
            <PackagePlus /> Додати з каталогу
          </Link>
          <CustomItemForm
            list={data}
            units={(units.data?.data.items ?? []).map((unit) => ({
              id: unit.id,
              symbol: typeof unit.symbol === "string" ? unit.symbol : "",
              name: typeof unit.nameUa === "string" ? unit.nameUa : "",
            }))}
            onSuccess={setDetail}
          />
        </div>
      ) : null}

      <ShoppingGroups list={data} onChange={setDetail} />

      {data.status === "OPEN" ? (
        <button
          type="button"
          className="shopping-complete-button"
          disabled={lifecycle.isPending}
          onClick={() => {
            if (pending === 0) {
              lifecycle.mutate("COMPLETED");
              return;
            }
            toast(`Ще не придбано ${pending} поз.`, {
              description: "Список можна завершити, але непозначені позиції залишаться в історії.",
              action: { label: "Все одно завершити", onClick: () => lifecycle.mutate("COMPLETED") },
              cancel: { label: "Повернутися", onClick: () => undefined },
            });
          }}
        >
          <Check /> Завершити покупки
        </button>
      ) : data.status === "COMPLETED" ? (
        <div className="shopping-lifecycle-actions">
          <button
            type="button"
            className="shopping-complete-button shopping-complete-button--secondary"
            disabled={lifecycle.isPending}
            onClick={() => lifecycle.mutate("OPEN")}
          >
            <RotateCcw /> Відкрити список знову
          </button>
          <button
            type="button"
            disabled={lifecycle.isPending}
            onClick={() =>
              toast("Архівувати завершений список?", {
                action: { label: "Архівувати", onClick: () => lifecycle.mutate("ARCHIVED") },
                cancel: { label: "Скасувати", onClick: () => undefined },
              })
            }
          >
            Архівувати
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ShoppingGroups({
  list,
  onChange,
}: {
  readonly list: ShoppingListDetail;
  readonly onChange: (detail: ShoppingListDetail) => void;
}) {
  const groups = useMemo(() => {
    const grouped = new Map<
      string,
      { label: string; code: string | null; items: ShoppingListItem[] }
    >();
    for (const item of list.items.filter((value) => value.status !== "REMOVED")) {
      const key = item.groupCategory?.code ?? "custom";
      const current = grouped.get(key) ?? {
        label: item.groupCategory?.name ?? "Власні позиції",
        code: item.groupCategory?.code ?? null,
        items: [],
      };
      current.items.push(item);
      grouped.set(key, current);
    }
    return [...grouped.values()].sort((a, b) => a.label.localeCompare(b.label, "uk"));
  }, [list.items]);
  const removed = list.items.filter((item) => item.status === "REMOVED");

  if (!groups.length && !removed.length) {
    return (
      <div className="shopping-state">
        <span>🧺</span>
        <h2>Список порожній</h2>
      </div>
    );
  }

  return (
    <div className="shopping-groups">
      {groups.map((group) => (
        <details key={group.label} open className="shopping-category">
          <summary>
            <span aria-hidden="true">{group.code ? getCategoryEmoji(group.code) : "✍️"}</span>
            <strong>{group.label}</strong>
            <small>{group.items.length}</small>
            <ChevronDown />
          </summary>
          <ul>
            {group.items.map((item) => (
              <ShoppingItemRow key={item.id} list={list} item={item} onChange={onChange} />
            ))}
          </ul>
        </details>
      ))}
      {removed.length ? (
        <details className="shopping-category shopping-category--removed">
          <summary>
            <Trash2 />
            <strong>Видалені позиції</strong>
            <small>{removed.length}</small>
            <ChevronDown />
          </summary>
          <ul>
            {removed.map((item) => (
              <ShoppingItemRow key={item.id} list={list} item={item} onChange={onChange} />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function ShoppingItemRow({
  list,
  item,
  onChange,
}: {
  readonly list: ShoppingListDetail;
  readonly item: ShoppingListItem;
  readonly onChange: (detail: ShoppingListDetail) => void;
}) {
  const editable = list.status === "OPEN";
  const [quantityDraft, setQuantityDraft] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  const quantity =
    quantityDraft ??
    (item.requestedQuantity === null ? "" : String(Math.round(item.requestedQuantity)));

  const notes = notesDraft ?? item.notes ?? "";

  const update = useMutation({
    mutationFn: (input: Parameters<typeof updateShoppingItem>[3]) =>
      updateShoppingItem(getBrowserApiClient(), list.id, item.id, input),
    onSuccess: (response) => {
      setQuantityDraft(null);
      setNotesDraft(null);
      onChange(response.data);
    },
  });
  const status = useMutation({
    mutationFn: (next: ShoppingListItem["status"]) =>
      setShoppingItemStatus(getBrowserApiClient(), list.id, item.id, list.revision, next),
    onSuccess: (response) => onChange(response.data),
  });
  const changed =
    item.requestedQuantity !== null &&
    quantity !== "" &&
    Number(quantity) !== item.requestedQuantity;

  return (
    <li
      className={
        item.status === "PURCHASED" ? "shopping-item shopping-item--purchased" : "shopping-item"
      }
    >
      <label className="shopping-item__check">
        <input
          type="checkbox"
          checked={item.status === "PURCHASED"}
          disabled={!editable || status.isPending || item.status === "REMOVED"}
          onChange={(event) => status.mutate(event.target.checked ? "PURCHASED" : "PENDING")}
        />
        <span aria-hidden="true">✓</span>
      </label>
      <div className="shopping-item__content">
        <strong>{item.name}</strong>
        {item.category && item.category.name !== item.groupCategory?.name ? (
          <small>{item.category.name}</small>
        ) : null}
        {item.derivedQuantity !== null && item.unit ? (
          <small>
            Розраховано: {formatQuantity(item.derivedQuantity)} {item.unit.symbol}
          </small>
        ) : null}
        {item.notes ? <small>{item.notes}</small> : null}
        {item.sources.length ? (
          <details className="shopping-sources">
            <summary>Джерела ({item.sources.length})</summary>
            <ul>
              {item.sources.map((source, index) => (
                <li key={index}>
                  {source.date}
                  {source.recipeTitle ? ` · ${source.recipeTitle}` : " · продукт із плану"}
                  {" · "}
                  {formatQuantity(source.contributedQuantity)} {item.unit?.symbol}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        {editable && item.status === "PENDING" ? (
          <details className="shopping-item-edit">
            <summary>Примітка</summary>
            <div>
              <input
                value={notes}
                maxLength={1000}
                aria-label={`Примітка для ${item.name}`}
                onChange={(event) => setNotesDraft(event.target.value)}
              />
              <button
                type="button"
                disabled={update.isPending || notes === (item.notes ?? "")}
                onClick={() =>
                  update.mutate({
                    expectedRevision: list.revision,
                    notes: notes.trim() || null,
                  })
                }
              >
                Зберегти
              </button>
            </div>
          </details>
        ) : null}
      </div>
      <div className="shopping-item__actions">
        {item.status === "REMOVED" ? (
          <button
            type="button"
            disabled={!editable || status.isPending}
            onClick={() => status.mutate("PENDING")}
          >
            <RotateCcw /> Відновити
          </button>
        ) : (
          <>
            {item.requestedQuantity !== null && item.unit ? (
              <div className="shopping-quantity">
                <input
                  type="number"
                  min="1"
                  step="1"
                  aria-label={`Кількість ${item.name}`}
                  value={quantity}
                  disabled={!editable || item.status !== "PENDING"}
                  onChange={(event) => setQuantityDraft(event.target.value)}
                />
                <span>{item.unit.symbol}</span>
                {changed ? (
                  <button
                    type="button"
                    aria-label={`Зберегти кількість ${item.name}`}
                    disabled={update.isPending || Number(quantity) <= 0}
                    onClick={() =>
                      update.mutate({
                        expectedRevision: list.revision,
                        requestedQuantity: Number(quantity),
                      })
                    }
                  >
                    <Save />
                  </button>
                ) : null}
                {item.derivedQuantity !== null &&
                item.requestedQuantity !== item.derivedQuantity &&
                editable &&
                item.status === "PENDING" ? (
                  <button
                    type="button"
                    aria-label={`Повернути розраховану кількість ${item.name}`}
                    onClick={() =>
                      update.mutate({ expectedRevision: list.revision, resetQuantity: true })
                    }
                  >
                    <ListRestart />
                  </button>
                ) : null}
              </div>
            ) : null}
            {editable ? (
              <button
                type="button"
                className="shopping-item__remove"
                aria-label={`Видалити ${item.name}`}
                disabled={status.isPending}
                onClick={() => status.mutate("REMOVED")}
              >
                <Trash2 />
              </button>
            ) : null}
          </>
        )}
      </div>
    </li>
  );
}

function CustomItemForm({
  list,
  units,
  onSuccess,
}: {
  readonly list: ShoppingListDetail;
  readonly units: readonly {
    readonly id: string;
    readonly symbol: string;
    readonly name: string;
  }[];
  readonly onSuccess: (detail: ShoppingListDetail) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitId, setUnitId] = useState("");
  const [notes, setNotes] = useState("");
  const add = useMutation({
    mutationFn: () =>
      addCustomShoppingItem(getBrowserApiClient(), list.id, {
        expectedRevision: list.revision,
        name,
        ...(quantity ? { quantity: Number(quantity), measurementUnitId: unitId } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      }),
    onSuccess: (response) => {
      onSuccess(response.data);
      setName("");
      setQuantity("");
      setUnitId("");
      setNotes("");
      setOpen(false);
    },
  });

  return (
    <div className="shopping-custom">
      <button type="button" onClick={() => setOpen((value) => !value)}>
        <Plus /> Додати власну позицію
      </button>
      {open ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            add.mutate();
          }}
        >
          <label>
            Назва
            <input
              value={name}
              maxLength={240}
              required
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <div className="shopping-custom__quantity">
            <label>
              Кількість
              <input
                type="number"
                min="0.001"
                step="0.001"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </label>
            <label>
              Одиниця
              <select
                value={unitId}
                required={Boolean(quantity)}
                onChange={(event) => setUnitId(event.target.value)}
              >
                <option value="">Без одиниці</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.symbol})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Примітка
            <input
              value={notes}
              maxLength={1000}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          {add.isError ? <p role="alert">Не вдалося додати позицію.</p> : null}
          <button
            type="submit"
            disabled={!name.trim() || Boolean(quantity) !== Boolean(unitId) || add.isPending}
          >
            <ShoppingBasket /> Додати
          </button>
        </form>
      ) : null}
    </div>
  );
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 }).format(Math.round(value));
}
