"use client";

import { useState, type FormEvent } from "react";

import type { MealTypeReference } from "@/shared/api/meal-types";

import type { OwnProfile } from "@/shared/api/family";

import { Button, Modal, Typography } from "@/shared/ui";

interface MealTypesFormProps {
  readonly open: boolean;

  readonly profile: OwnProfile;

  readonly mealTypes: readonly MealTypeReference[];

  readonly isPending: boolean;

  readonly onClose: () => void;

  readonly onSubmit: (mealTypeIds: readonly string[]) => void;
}

const mealTypeKindLabels = {
  MAIN_MEAL: "Основні прийоми їжі",

  SNACK: "Перекуси",

  FLEXIBLE: "Додаткові прийоми",
} as const;

export function MealTypesForm({
  open,
  profile,
  mealTypes,
  isPending,
  onClose,
  onSubmit,
}: MealTypesFormProps) {
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(
    profile.mealTypes.map((mealType) => mealType.id),
  );

  const selectedIdSet = new Set(selectedIds);

  const groupedMealTypes = ["MAIN_MEAL", "SNACK", "FLEXIBLE"] as const;

  function toggleMealType(mealTypeId: string): void {
    setSelectedIds((current) =>
      current.includes(mealTypeId)
        ? current.filter((id) => id !== mealTypeId)
        : [...current, mealTypeId],
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    onSubmit(selectedIds);
  }

  return (
    <Modal
      open={open}
      title="Прийоми їжі"
      description="Оберіть прийоми їжі, для яких MealMind має створювати персональний план харчування."
      onClose={() => {
        if (!isPending) {
          onClose();
        }
      }}
      footer={
        <>
          <Button type="button" variant="secondary" disabled={isPending} onClick={onClose}>
            Скасувати
          </Button>

          <Button type="submit" form="meal-types-form" isLoading={isPending}>
            Зберегти
          </Button>
        </>
      }
    >
      <form
        id="meal-types-form"
        className="profile-edit-form profile-meal-types-form"
        onSubmit={handleSubmit}
      >
        {groupedMealTypes.map((kind) => {
          const items = mealTypes.filter((mealType) => mealType.kind === kind);

          if (items.length === 0) {
            return null;
          }

          return (
            <fieldset key={kind} className="profile-meal-types-group">
              <legend>
                <Typography as="h3" variant="item-title">
                  {mealTypeKindLabels[kind]}
                </Typography>
              </legend>

              <div className="profile-meal-types-list">
                {items.map((mealType) => {
                  const checked = selectedIdSet.has(mealType.id);

                  return (
                    <label key={mealType.id} className="profile-meal-type-option">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isPending}
                        onChange={() => {
                          toggleMealType(mealType.id);
                        }}
                      />

                      <span className="profile-meal-type-option__content">
                        <Typography variant="body">{mealType.nameUa}</Typography>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}

        {selectedIds.length === 0 ? (
          <Typography variant="supporting">
            Якщо не вибрати жодного прийому їжі, MealMind не матиме персональних слотів для
            планування харчування.
          </Typography>
        ) : null}
      </form>
    </Modal>
  );
}
