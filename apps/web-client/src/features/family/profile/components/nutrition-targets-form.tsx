"use client";

import { useMemo, useState, type FormEvent } from "react";

import type {
  NutrientTargetPayload,
  NutrientTargetsPayload,
  OwnProfile,
  ProfileNutrientTarget,
} from "@/shared/api/family";

import type { TargetableNutrient } from "@/shared/api/nutrients";

import { Button, Modal, SelectField, Typography } from "@/shared/ui";

import { NutritionTargetField, type NutrientTargetDraft } from "./nutrition-target-field";

import {
  inferNutrientTargetMode,
  isPrimaryNutrientCode,
  PRIMARY_NUTRIENT_CODES,
} from "../utils/nutrition-target-policy";

interface NutritionTargetsFormProps {
  readonly open: boolean;

  readonly profile: OwnProfile;

  readonly nutrients: readonly TargetableNutrient[];

  readonly isPending: boolean;

  readonly onClose: () => void;

  readonly onSubmit: (input: NutrientTargetsPayload) => void;
}

function createDraft(
  nutrient: TargetableNutrient,
  target: ProfileNutrientTarget | undefined,
): NutrientTargetDraft {
  return {
    nutrient,

    configured: target !== undefined,

    source: target?.source ?? null,

    mode: inferNutrientTargetMode(target),

    minimumValue: target?.minimumValue ?? "",

    targetValue: target?.targetValue ?? "",

    maximumValue: target?.maximumValue ?? "",
  };
}

function parseValue(value: string): number | null {
  if (value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function validateDraft(draft: NutrientTargetDraft): string | undefined {
  if (!draft.configured) {
    return undefined;
  }

  const minimum = parseValue(draft.minimumValue);

  const target = parseValue(draft.targetValue);

  const maximum = parseValue(draft.maximumValue);

  const values = [minimum, target, maximum].filter((value): value is number => value !== null);

  if (values.length === 0) {
    return "Вкажіть значення цілі";
  }

  if (values.some((value) => value < 0 || value > 1_000_000)) {
    return "Значення має бути від 0 до 1 000 000";
  }

  if (draft.mode === "RANGE") {
    if (minimum === null || maximum === null) {
      return "Вкажіть обидві межі діапазону";
    }

    if (minimum > maximum) {
      return "Мінімум не може перевищувати максимум";
    }
  }

  return undefined;
}

function toPayload(draft: NutrientTargetDraft): NutrientTargetPayload {
  const minimum = parseValue(draft.minimumValue);

  const target = parseValue(draft.targetValue);

  const maximum = parseValue(draft.maximumValue);

  switch (draft.mode) {
    case "TARGET":
      return {
        nutrientId: draft.nutrient.id,

        targetValue: target,
      };

    case "MINIMUM":
      return {
        nutrientId: draft.nutrient.id,

        minimumValue: minimum,
      };

    case "MAXIMUM":
      return {
        nutrientId: draft.nutrient.id,

        maximumValue: maximum,
      };

    case "RANGE":
      return {
        nutrientId: draft.nutrient.id,

        minimumValue: minimum,

        maximumValue: maximum,
      };
  }
}

const EMPTY_NUTRIENT_TARGETS: readonly ProfileNutrientTarget[] = Object.freeze([]);

export function NutritionTargetsForm({
  open,
  profile,
  nutrients,
  isPending,
  onClose,
  onSubmit,
}: NutritionTargetsFormProps) {
  const currentTargets = profile.nutritionTargets.current?.targets ?? EMPTY_NUTRIENT_TARGETS;

  const targetByCode = useMemo(
    () => new Map(currentTargets.map((target) => [target.nutrient.code, target])),
    [currentTargets],
  );

  const initialPrimaryDrafts = useMemo(
    () =>
      PRIMARY_NUTRIENT_CODES.map((code) => nutrients.find((nutrient) => nutrient.code === code))
        .filter((nutrient): nutrient is TargetableNutrient => nutrient !== undefined)
        .map((nutrient) => createDraft(nutrient, targetByCode.get(nutrient.code))),
    [nutrients, targetByCode],
  );

  const initialAdditionalDrafts = useMemo(
    () =>
      currentTargets
        .filter((target) => !isPrimaryNutrientCode(target.nutrient.code))
        .map((target) => {
          const nutrient = nutrients.find((item) => item.id === target.nutrient.id);

          if (nutrient === undefined) {
            return null;
          }

          return createDraft(nutrient, target);
        })
        .filter((draft): draft is NutrientTargetDraft => draft !== null),
    [currentTargets, nutrients],
  );

  const [primaryDrafts, setPrimaryDrafts] = useState(initialPrimaryDrafts);

  const [additionalDrafts, setAdditionalDrafts] = useState(initialAdditionalDrafts);

  const [selectedAdditionalId, setSelectedAdditionalId] = useState("");

  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});

  const additionalOptions = nutrients
    .filter((nutrient) => !isPrimaryNutrientCode(nutrient.code))
    .filter((nutrient) => !additionalDrafts.some((draft) => draft.nutrient.id === nutrient.id))
    .map((nutrient) => ({
      value: nutrient.id,
      label: nutrient.name,
    }));

  function updatePrimaryDraft(updated: NutrientTargetDraft): void {
    setPrimaryDrafts((current) =>
      current.map((draft) => (draft.nutrient.id === updated.nutrient.id ? updated : draft)),
    );

    setErrors((current) => {
      const next = {
        ...current,
      };

      delete next[updated.nutrient.id];

      return next;
    });
  }

  function updateAdditionalDraft(updated: NutrientTargetDraft): void {
    setAdditionalDrafts((current) =>
      current.map((draft) => (draft.nutrient.id === updated.nutrient.id ? updated : draft)),
    );

    setErrors((current) => {
      const next = {
        ...current,
      };

      delete next[updated.nutrient.id];

      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const configured = [...primaryDrafts, ...additionalDrafts].filter((draft) => draft.configured);

    const validationErrors: Record<string, string> = {};

    for (const draft of configured) {
      const error = validateDraft(draft);

      if (error !== undefined) {
        validationErrors[draft.nutrient.id] = error;
      }
    }

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    onSubmit({
      items: configured.map(toPayload),
    });
  }

  return (
    <Modal
      open={open}
      title="Редагувати цільові показники"
      description="Встановіть власні орієнтири або скоригуйте рекомендовані MealMind значення."
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

          <Button type="submit" form="nutrition-targets-form" isLoading={isPending}>
            Зберегти
          </Button>
        </>
      }
    >
      <form
        id="nutrition-targets-form"
        className="profile-edit-form profile-nutrition-form"
        onSubmit={handleSubmit}
      >
        <div className="profile-nutrition-form__section">
          <div>
            <Typography as="h3" variant="item-title">
              Основні показники
            </Typography>

            <Typography variant="supporting">
              MealMind завжди показує ці показники як основні. Якщо даних достатньо, система може
              розрахувати рекомендовані значення автоматично.
            </Typography>
          </div>

          <div className="profile-nutrition-form__targets">
            {primaryDrafts.map((draft) => (
              <NutritionTargetField
                key={draft.nutrient.id}
                draft={draft}
                removable={false}
                disabled={isPending}
                onChange={updatePrimaryDraft}
                onRemove={() => {
                  updatePrimaryDraft({
                    ...draft,

                    configured: false,

                    source: null,

                    minimumValue: "",

                    targetValue: "",

                    maximumValue: "",
                  });
                }}
                {...(errors[draft.nutrient.id] === undefined
                  ? {}
                  : {
                      error: errors[draft.nutrient.id],
                    })}
              />
            ))}
          </div>
        </div>

        <div className="profile-nutrition-form__section">
          <div>
            <Typography as="h3" variant="item-title">
              Додаткові показники
            </Typography>

            <Typography variant="supporting">
              Додайте інші нутрієнти, за якими бажаєте встановити власну ціль або межу.
            </Typography>
          </div>

          {additionalDrafts.length === 0 ? (
            <Typography variant="caption">Додаткові цілі ще не встановлені.</Typography>
          ) : (
            <div className="profile-nutrition-form__targets">
              {additionalDrafts.map((draft) => (
                <NutritionTargetField
                  key={draft.nutrient.id}
                  draft={draft}
                  removable
                  disabled={isPending}
                  onChange={updateAdditionalDraft}
                  onRemove={() => {
                    setAdditionalDrafts((current) =>
                      current.filter((item) => item.nutrient.id !== draft.nutrient.id),
                    );
                  }}
                  {...(errors[draft.nutrient.id] === undefined
                    ? {}
                    : {
                        error: errors[draft.nutrient.id],
                      })}
                />
              ))}
            </div>
          )}

          {additionalOptions.length === 0 ? null : (
            <div className="profile-nutrition-form__add">
              <SelectField
                label="Додати показник"
                placeholder="Оберіть нутрієнт"
                value={selectedAdditionalId}
                options={additionalOptions}
                onChange={(event) => {
                  setSelectedAdditionalId(event.target.value);
                }}
                disabled={isPending}
              />

              <Button
                type="button"
                variant="secondary"
                disabled={isPending || selectedAdditionalId.length === 0}
                onClick={() => {
                  const nutrient = nutrients.find((item) => item.id === selectedAdditionalId);

                  if (nutrient === undefined) {
                    return;
                  }

                  setAdditionalDrafts((current) =>
                    [...current, createDraft(nutrient, undefined)].map((draft) =>
                      draft.nutrient.id === nutrient.id
                        ? {
                            ...draft,
                            configured: true,
                          }
                        : draft,
                    ),
                  );

                  setSelectedAdditionalId("");
                }}
              >
                Додати
              </Button>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
