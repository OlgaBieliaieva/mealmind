"use client";

import { useMemo, useState, type FormEvent } from "react";

import type { DietaryTagReference } from "@/shared/api/dietary-tags";
import type { OwnProfile } from "@/shared/api/family";

import { Button, Modal, Typography } from "@/shared/ui";

interface DietaryRestrictionsFormProps {
  readonly open: boolean;
  readonly profile: OwnProfile;
  readonly dietaryTags: readonly DietaryTagReference[];
  readonly isPending: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (dietaryTagIds: readonly string[]) => void;
}

const dietaryTagKindLabels: Readonly<Record<string, string>> = {
  DIET_PATTERN: "Тип харчування",
  FREE_FROM: "Виключення продуктів",
};

export function DietaryRestrictionsForm({
  open,
  profile,
  dietaryTags,
  isPending,
  onClose,
  onSubmit,
}: DietaryRestrictionsFormProps) {
  const initialSelectedIds = useMemo(
    () => profile.dietaryRestrictions.map((dietaryTag) => dietaryTag.id),
    [profile.dietaryRestrictions],
  );

  const [selectedIds, setSelectedIds] = useState<readonly string[]>(initialSelectedIds);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const groupedTags = useMemo(() => {
    const groups = new Map<string, DietaryTagReference[]>();

    for (const dietaryTag of dietaryTags) {
      const current = groups.get(dietaryTag.kind) ?? [];

      current.push(dietaryTag);

      groups.set(dietaryTag.kind, current);
    }

    return [...groups.entries()];
  }, [dietaryTags]);

  const isDirty = useMemo(() => {
    if (selectedIds.length !== initialSelectedIds.length) {
      return true;
    }

    const initialIdSet = new Set(initialSelectedIds);

    return selectedIds.some((id) => !initialIdSet.has(id));
  }, [initialSelectedIds, selectedIds]);

  function toggleDietaryTag(dietaryTagId: string): void {
    setSelectedIds((current) =>
      current.includes(dietaryTagId)
        ? current.filter((id) => id !== dietaryTagId)
        : [...current, dietaryTagId],
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!isDirty) {
      onClose();
      return;
    }

    onSubmit(selectedIds);
  }

  return (
    <Modal
      open={open}
      title="Дієтичні обмеження"
      description="Оберіть обмеження, які MealMind має враховувати під час підбору рецептів і планування харчування."
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

          <Button
            type="submit"
            form="dietary-restrictions-form"
            isLoading={isPending}
            disabled={!isDirty}
          >
            Зберегти
          </Button>
        </>
      }
    >
      <form id="dietary-restrictions-form" className="profile-edit-form" onSubmit={handleSubmit}>
        {groupedTags.map(([kind, items]) => (
          <fieldset key={kind} className="profile-meal-types-group">
            <legend>
              <Typography as="h3" variant="item-title">
                {dietaryTagKindLabels[kind] ?? kind}
              </Typography>
            </legend>

            <div className="profile-meal-types-list">
              {items.map((dietaryTag) => (
                <label key={dietaryTag.id} className="profile-meal-type-option">
                  <input
                    type="checkbox"
                    checked={selectedIdSet.has(dietaryTag.id)}
                    disabled={isPending}
                    onChange={() => {
                      toggleDietaryTag(dietaryTag.id);
                    }}
                  />

                  <span className="profile-meal-type-option__content">
                    <Typography variant="body">{dietaryTag.nameUa}</Typography>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        {dietaryTags.length === 0 ? (
          <Typography variant="supporting">
            Наразі немає доступних дієтичних обмежень для вибору.
          </Typography>
        ) : null}

        {selectedIds.length === 0 ? (
          <Typography variant="supporting">
            Якщо не вибрати жодного обмеження, MealMind не застосовуватиме спеціальні дієтичні
            правила до вашого плану.
          </Typography>
        ) : null}
      </form>
    </Modal>
  );
}
