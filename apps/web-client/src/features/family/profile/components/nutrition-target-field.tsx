"use client";

import type { TargetableNutrient } from "@/shared/api/nutrients";

import { Button, SelectField, TextInput, Typography } from "@/shared/ui";

import {
  nutrientTargetModeOptions,
  type NutrientTargetMode,
} from "../utils/nutrition-target-policy";

import { nutrientUnitLabels } from "../utils/profile-formatters";

export interface NutrientTargetDraft {
  readonly nutrient: TargetableNutrient;

  readonly configured: boolean;

  readonly source: "CALCULATED" | "MANUAL" | null;

  readonly mode: NutrientTargetMode;

  readonly minimumValue: string;

  readonly targetValue: string;

  readonly maximumValue: string;
}

interface NutritionTargetFieldProps {
  readonly draft: NutrientTargetDraft;

  readonly removable: boolean;

  readonly disabled: boolean;

  readonly error?: string;

  readonly onChange: (draft: NutrientTargetDraft) => void;

  readonly onRemove: () => void;
}

export function NutritionTargetField({
  draft,
  removable,
  disabled,
  error,
  onChange,
  onRemove,
}: NutritionTargetFieldProps) {
  const unit = nutrientUnitLabels[draft.nutrient.unit];

  if (!draft.configured) {
    return (
      <div className="profile-nutrition-target-editor">
        <div className="profile-nutrition-target-editor__header">
          <div>
            <Typography variant="body">{draft.nutrient.name}</Typography>

            <Typography variant="caption">Не встановлено</Typography>
          </div>

          <Button
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={() => {
              onChange({
                ...draft,
                configured: true,
              });
            }}
          >
            Встановити
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-nutrition-target-editor">
      <div className="profile-nutrition-target-editor__header">
        <div>
          <Typography variant="body">{draft.nutrient.name}</Typography>

          <Typography variant="caption">
            {draft.source === "CALCULATED"
              ? "Рекомендація MealMind"
              : draft.source === "MANUAL"
                ? "Ваша ціль"
                : "Нова ціль"}
          </Typography>
        </div>

        <Button type="button" variant="secondary" disabled={disabled} onClick={onRemove}>
          {removable ? "Видалити" : "Скинути"}
        </Button>
      </div>

      <SelectField
        label="Тип цілі"
        value={draft.mode}
        options={nutrientTargetModeOptions}
        onChange={(event) => {
          const mode = event.target.value as NutrientTargetMode;

          onChange({
            ...draft,
            mode,

            minimumValue: mode === "RANGE" || mode === "MINIMUM" ? draft.minimumValue : "",

            targetValue: mode === "TARGET" ? draft.targetValue : "",

            maximumValue: mode === "RANGE" || mode === "MAXIMUM" ? draft.maximumValue : "",
          });
        }}
        disabled={disabled}
      />

      {draft.mode === "TARGET" ? (
        <TextInput
          label={`Значення, ${unit}`}
          type="number"
          min={0}
          max={1000000}
          step="any"
          inputMode="decimal"
          value={draft.targetValue}
          onChange={(event) => {
            onChange({
              ...draft,
              targetValue: event.target.value,
            });
          }}
          {...(error === undefined
            ? {}
            : {
                error,
              })}
          disabled={disabled}
        />
      ) : null}

      {draft.mode === "MINIMUM" ? (
        <TextInput
          label={`Мінімум, ${unit}`}
          type="number"
          min={0}
          max={1000000}
          step="any"
          inputMode="decimal"
          value={draft.minimumValue}
          onChange={(event) => {
            onChange({
              ...draft,
              minimumValue: event.target.value,
            });
          }}
          {...(error === undefined
            ? {}
            : {
                error,
              })}
          disabled={disabled}
        />
      ) : null}

      {draft.mode === "MAXIMUM" ? (
        <TextInput
          label={`Максимум, ${unit}`}
          type="number"
          min={0}
          max={1000000}
          step="any"
          inputMode="decimal"
          value={draft.maximumValue}
          onChange={(event) => {
            onChange({
              ...draft,
              maximumValue: event.target.value,
            });
          }}
          {...(error === undefined
            ? {}
            : {
                error,
              })}
          disabled={disabled}
        />
      ) : null}

      {draft.mode === "RANGE" ? (
        <div className="profile-nutrition-target-editor__range">
          <TextInput
            label={`Від, ${unit}`}
            type="number"
            min={0}
            max={1000000}
            step="any"
            inputMode="decimal"
            value={draft.minimumValue}
            onChange={(event) => {
              onChange({
                ...draft,
                minimumValue: event.target.value,
              });
            }}
            disabled={disabled}
          />

          <TextInput
            label={`До, ${unit}`}
            type="number"
            min={0}
            max={1000000}
            step="any"
            inputMode="decimal"
            value={draft.maximumValue}
            onChange={(event) => {
              onChange({
                ...draft,
                maximumValue: event.target.value,
              });
            }}
            {...(error === undefined
              ? {}
              : {
                  error,
                })}
            disabled={disabled}
          />
        </div>
      ) : null}
    </div>
  );
}
