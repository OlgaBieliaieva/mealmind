"use client";

import { useMemo, useState, type FormEvent } from "react";

import type { AllergySeverity, OwnProfile } from "@/shared/api/family";

import type { AllergenReference } from "@/shared/api/allergens";

import { Button, Modal, SelectField, Typography } from "@/shared/ui";

interface AllergiesFormProps {
  readonly open: boolean;

  readonly profile: OwnProfile;

  readonly allergens: readonly AllergenReference[];

  readonly isPending: boolean;

  readonly onClose: () => void;

  readonly onSubmit: (
    items: readonly {
      readonly allergenId: string;
      readonly severity: AllergySeverity;
    }[],
  ) => void;
}

const allergySeverityOptions = [
  {
    value: "UNKNOWN",
    label: "Не вказано",
  },
  {
    value: "MILD",
    label: "Легка",
  },
  {
    value: "MODERATE",
    label: "Помірна",
  },
  {
    value: "SEVERE",
    label: "Сильна",
  },
] as const;

interface AllergyDraft {
  readonly allergenId: string;
  readonly severity: AllergySeverity;
}

function sortDrafts(
  drafts: readonly AllergyDraft[],
  allergens: readonly AllergenReference[],
): readonly AllergyDraft[] {
  const orderById = new Map(allergens.map((allergen, index) => [allergen.id, index]));

  return [...drafts].sort(
    (left, right) =>
      (orderById.get(left.allergenId) ?? Number.MAX_SAFE_INTEGER) -
      (orderById.get(right.allergenId) ?? Number.MAX_SAFE_INTEGER),
  );
}

export function AllergiesForm({
  open,
  profile,
  allergens,
  isPending,
  onClose,
  onSubmit,
}: AllergiesFormProps) {
  const initialDrafts = useMemo(
    () =>
      sortDrafts(
        profile.allergies.map((allergy): AllergyDraft => ({
          allergenId: allergy.allergen.id,
          severity: allergy.severity,
        })),
        allergens,
      ),
    [profile.allergies, allergens],
  );

  const [drafts, setDrafts] = useState<readonly AllergyDraft[]>(initialDrafts);

  const selectedIdSet = useMemo(() => new Set(drafts.map((draft) => draft.allergenId)), [drafts]);

  const draftByAllergenId = useMemo(
    () => new Map(drafts.map((draft) => [draft.allergenId, draft])),
    [drafts],
  );

  const isDirty = useMemo(() => {
    if (drafts.length !== initialDrafts.length) {
      return true;
    }

    const initialById = new Map(initialDrafts.map((draft) => [draft.allergenId, draft.severity]));

    return drafts.some((draft) => initialById.get(draft.allergenId) !== draft.severity);
  }, [drafts, initialDrafts]);

  function toggleAllergen(allergenId: string): void {
    setDrafts((current) => {
      const exists = current.some((draft) => draft.allergenId === allergenId);

      if (exists) {
        return current.filter((draft) => draft.allergenId !== allergenId);
      }

      return sortDrafts(
        [
          ...current,
          {
            allergenId,
            severity: "UNKNOWN",
          },
        ],
        allergens,
      );
    });
  }

  function updateSeverity(allergenId: string, severity: AllergySeverity): void {
    setDrafts((current) =>
      current.map((draft) =>
        draft.allergenId === allergenId
          ? {
              ...draft,
              severity,
            }
          : draft,
      ),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!isDirty) {
      onClose();
      return;
    }

    onSubmit(
      drafts.map((draft) => ({
        allergenId: draft.allergenId,
        severity: draft.severity,
      })),
    );
  }

  return (
    <Modal
      open={open}
      title="Алергії"
      description="Оберіть відомі вам алергени та, за бажанням, вкажіть тяжкість реакції. MealMind враховуватиме ці дані під час планування."
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

          <Button type="submit" form="allergies-form" isLoading={isPending} disabled={!isDirty}>
            Зберегти
          </Button>
        </>
      }
    >
      <form
        id="allergies-form"
        className="profile-edit-form profile-allergies-form"
        onSubmit={handleSubmit}
      >
        <Typography variant="supporting">
          Якщо алерген вибрано, але ступінь реакції невідомий, залиште значення «Не вказано».
        </Typography>

        <div className="profile-allergies-list">
          {allergens.map((allergen) => {
            const checked = selectedIdSet.has(allergen.id);

            const draft = draftByAllergenId.get(allergen.id);

            return (
              <div key={allergen.id} className="profile-allergy-option">
                <label className="profile-allergy-option__checkbox">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isPending}
                    onChange={() => {
                      toggleAllergen(allergen.id);
                    }}
                  />

                  <span>
                    <Typography variant="body">{allergen.nameUa}</Typography>
                  </span>
                </label>

                {checked && draft !== undefined ? (
                  <div className="profile-allergy-option__severity">
                    <SelectField
                      label="Ступінь реакції"
                      value={draft.severity}
                      options={allergySeverityOptions}
                      onChange={(event) => {
                        updateSeverity(allergen.id, event.target.value as AllergySeverity);
                      }}
                      disabled={isPending}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {allergens.length === 0 ? (
          <Typography variant="supporting">Наразі немає доступних алергенів для вибору.</Typography>
        ) : null}

        {drafts.length === 0 ? (
          <Typography variant="supporting">
            Якщо не вибрати жодного алергену, профіль не міститиме зазначених алергій.
          </Typography>
        ) : null}
      </form>
    </Modal>
  );
}
