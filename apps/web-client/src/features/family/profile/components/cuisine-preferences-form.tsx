"use client";

import { useMemo, useState, type FormEvent } from "react";

import type { CuisineReference } from "@/shared/api/cuisines";
import type { OwnProfile } from "@/shared/api/family";

import { Button, Modal, Typography } from "@/shared/ui";

interface CuisinePreferencesFormProps {
  readonly open: boolean;
  readonly profile: OwnProfile;
  readonly cuisines: readonly CuisineReference[];
  readonly isPending: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (cuisineIds: readonly string[]) => void;
}

export function CuisinePreferencesForm({
  open,
  profile,
  cuisines,
  isPending,
  onClose,
  onSubmit,
}: CuisinePreferencesFormProps) {
  const initialSelectedIds = useMemo(
    () => profile.cuisinePreferences.map((cuisine) => cuisine.id),
    [profile.cuisinePreferences],
  );

  const [selectedIds, setSelectedIds] = useState<readonly string[]>(initialSelectedIds);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const isDirty = useMemo(() => {
    if (selectedIds.length !== initialSelectedIds.length) {
      return true;
    }

    const initialIdSet = new Set(initialSelectedIds);

    return selectedIds.some((id) => !initialIdSet.has(id));
  }, [initialSelectedIds, selectedIds]);

  function toggleCuisine(cuisineId: string): void {
    setSelectedIds((current) =>
      current.includes(cuisineId)
        ? current.filter((id) => id !== cuisineId)
        : [...current, cuisineId],
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
      title="Улюблені кухні"
      description="Оберіть кухні, яким ви надаєте перевагу. MealMind зможе враховувати їх під час підбору рецептів і планування харчування."
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
            form="cuisine-preferences-form"
            isLoading={isPending}
            disabled={!isDirty}
          >
            Зберегти
          </Button>
        </>
      }
    >
      <form id="cuisine-preferences-form" className="profile-edit-form" onSubmit={handleSubmit}>
        <div className="profile-meal-types-list">
          {cuisines.map((cuisine) => (
            <label key={cuisine.id} className="profile-meal-type-option">
              <input
                type="checkbox"
                checked={selectedIdSet.has(cuisine.id)}
                disabled={isPending}
                onChange={() => {
                  toggleCuisine(cuisine.id);
                }}
              />

              <span className="profile-meal-type-option__content">
                <Typography variant="body">{cuisine.nameUa}</Typography>
              </span>
            </label>
          ))}
        </div>

        {cuisines.length === 0 ? (
          <Typography variant="supporting">Наразі немає доступних кухонь для вибору.</Typography>
        ) : null}

        {selectedIds.length === 0 ? (
          <Typography variant="supporting">
            Якщо не вибрати жодної кухні, MealMind не застосовуватиме кухню як персональне
            вподобання.
          </Typography>
        ) : null}
      </form>
    </Modal>
  );
}
