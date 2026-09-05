"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { sanitizeReturnTo } from "@/features/auth/safe-return-to";
import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import { addManualConsumption, readDiary } from "@/shared/api/consumption";
import { getFoodDetails, type FoodKind } from "@/shared/api/food";
import { getCategoryEmoji } from "@/shared/lib/category-emoji";
import { getRecipeTypeEmoji } from "@/shared/lib/recipe-type-emoji";
import { Button, PageState } from "@/shared/ui";

export function ConsumptionAddFlow({ kind, id }: { readonly kind: FoodKind; readonly id: string }) {
  const parameters = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const initialDate = parameters.get("date") ?? new Date().toISOString().slice(0, 10);
  const returnTo = sanitizeReturnTo(parameters.get("returnTo"), `/diary?date=${initialDate}`);
  const [date, setDate] = useState(initialDate);
  const [memberId, setMemberId] = useState(parameters.get("memberId") ?? "");
  const [mealTypeId, setMealTypeId] = useState("");
  const [quantity, setQuantity] = useState(100);
  const food = useQuery({
    queryKey: ["food-details", kind, id],
    queryFn: () => getFoodDetails(getBrowserApiClient(), kind, id),
  });
  const diary = useQuery({
    queryKey: ["consumption", "diary", date, "add"],
    queryFn: ({ signal }) => readDiary(getBrowserApiClient(), date, signal),
  });
  const effectiveMember = diary.data?.data.members.some((member) => member.memberId === memberId)
    ? memberId
    : (diary.data?.data.selfMemberId ?? diary.data?.data.members[0]?.memberId ?? "");
  const availableMealTypes =
    diary.data?.data.members.find((member) => member.memberId === effectiveMember)?.mealTypes ?? [];
  const effectiveMealType = availableMealTypes.some((mealType) => mealType.id === mealTypeId)
    ? mealTypeId
    : (availableMealTypes[0]?.id ?? "");
  const add = useMutation({
    mutationFn: () =>
      addManualConsumption(getBrowserApiClient(), {
        memberId: effectiveMember,
        date,
        kind,
        foodId: id,
        mealTypeId: effectiveMealType,
        quantityGrams: quantity,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["consumption"] });
      router.push(`/diary?date=${date}&member=${effectiveMember}`);
    },
  });
  if (food.isPending || diary.isPending)
    return <PageState kind="loading" title="Готуємо додавання до щоденника" />;
  if (food.isError || diary.isError)
    return (
      <PageState
        kind="error"
        title="Не вдалося відкрити додавання"
        actions={
          <Button
            onClick={() => {
              void food.refetch();
              void diary.refetch();
            }}
          >
            Повторити
          </Button>
        }
      />
    );

  const data = food.data.data;
  const name = data.kind === "product" ? data.name : data.title;
  const members = diary.data.data.members.filter((member) => member.canEdit);
  return (
    <section className="advanced-plan" aria-labelledby="diary-add-title">
      <header>
        <Link href={returnTo} aria-label="Повернутися до щоденника">
          <ArrowLeft />
        </Link>
        <div>
          <h1 id="diary-add-title">Додати до щоденника</h1>
          <p>Зафіксуйте дату, члена родини та фактично спожиту порцію</p>
        </div>
      </header>
      <article className="advanced-plan__food">
        <span aria-hidden="true">
          <span>
            {data.kind === "product"
              ? getCategoryEmoji(data.category.code)
              : getRecipeTypeEmoji(data.recipeType?.code)}
          </span>
          {data.imageUrl ? (
            // Signed URLs походять із приватного bucket і не мають сталого host.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.imageUrl}
              alt={name}
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
            />
          ) : null}
        </span>
        <div>
          <strong>{name}</strong>
          <small>{data.kind === "recipe" ? "Рецепт" : data.category.name}</small>
        </div>
      </article>
      {diary.data.data.role === "OWNER" ? (
        <div className="advanced-plan__tabs" role="tablist" aria-label="Члени родини">
          {members.map((member) => (
            <button
              key={member.memberId}
              type="button"
              role="tab"
              aria-selected={member.memberId === effectiveMember}
              onClick={() => setMemberId(member.memberId)}
            >
              {member.name}
              {member.memberId === effectiveMember ? <Check aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}
      <section className="advanced-plan__member">
        <h2>{members.find((member) => member.memberId === effectiveMember)?.name ?? "Щоденник"}</h2>
        <p>До щоденника додається один факт за одну дату. Минулі дати доступні.</p>
        <fieldset>
          <legend>Дата споживання</legend>
          <label className="diary-add-date">
            <span className="sr-only">Дата споживання</span>
            <input
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
        </fieldset>
        <fieldset>
          <legend>Прийом їжі</legend>
          <div className="advanced-plan__meals">
            {availableMealTypes.map((mealType) => (
              <button
                key={mealType.id}
                type="button"
                aria-pressed={mealType.id === effectiveMealType}
                onClick={() => setMealTypeId(mealType.id)}
              >
                {mealType.name}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Фактично спожита порція</legend>
          <div className="advanced-plan__quantity">
            <button
              type="button"
              aria-label="Зменшити порцію"
              onClick={() => setQuantity((value) => Math.max(1, value - 25))}
            >
              <Minus />
            </button>
            <label>
              <span className="sr-only">Порція у грамах</span>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
              />{" "}
              г
            </label>
            <button
              type="button"
              aria-label="Збільшити порцію"
              onClick={() => setQuantity((value) => value + 25)}
            >
              <Plus />
            </button>
          </div>
          <div className="advanced-plan__presets">
            {[50, 100, 150, 200].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={quantity === value}
                onClick={() => setQuantity(value)}
              >
                {value} г
              </button>
            ))}
          </div>
        </fieldset>
      </section>
      <aside className="advanced-plan__summary" aria-live="polite">
        <strong>Буде додано: 1 запис</strong>
        <span>
          {name} · {quantity} г
        </span>
        <span>
          {availableMealTypes.find((mealType) => mealType.id === effectiveMealType)?.name ??
            "Прийом їжі не обрано"}
        </span>
        <span>
          {new Intl.DateTimeFormat("uk-UA", { dateStyle: "long" }).format(
            new Date(`${date}T12:00:00`),
          )}
        </span>
      </aside>
      {add.isError ? (
        <p className="advanced-plan__error" role="alert">
          Не вдалося додати запис. Перевірте дані й повторіть.
        </p>
      ) : null}
      <footer>
        <button
          type="button"
          className="advanced-plan__reset"
          disabled={add.isPending}
          onClick={() => router.push(returnTo)}
        >
          Скасувати
        </button>
        <button
          type="button"
          disabled={
            !effectiveMember || !effectiveMealType || !date || quantity <= 0 || add.isPending
          }
          onClick={() => add.mutate()}
        >
          {add.isPending ? "Додаємо…" : "Додати (1)"}
        </button>
      </footer>
    </section>
  );
}
