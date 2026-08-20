"use client";

import { useState, type FormEvent } from "react";

import type { ActivityLevel, ActivityPeriodPayload, OwnProfile } from "@/shared/api/family";

import { Button, Modal, SelectField, TextInput, Typography } from "@/shared/ui";

interface ActivityPeriodFormProps {
  readonly open: boolean;
  readonly profile: OwnProfile;
  readonly isPending: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (input: ActivityPeriodPayload) => void;
}

interface FormErrors {
  readonly activityLevel?: string;
  readonly effectiveFrom?: string;
}

const activityLevelOptions = [
  {
    value: "SEDENTARY",
    label: "Малорухливий",
  },
  {
    value: "LIGHT",
    label: "Легка активність",
  },
  {
    value: "MODERATE",
    label: "Помірна активність",
  },
  {
    value: "ACTIVE",
    label: "Висока активність",
  },
  {
    value: "VERY_ACTIVE",
    label: "Дуже висока активність",
  },
] as const;

const activityLevelDescriptions: Readonly<Record<ActivityLevel, string>> = {
  SEDENTARY: "Переважно сидячий спосіб життя та мінімум додаткової фізичної активності.",

  LIGHT: "Невелика регулярна активність: прогулянки або легкі тренування кілька разів на тиждень.",

  MODERATE: "Регулярна помірна фізична активність або тренування приблизно 3–5 разів на тиждень.",

  ACTIVE: "Високий рівень активності, інтенсивні тренування або фізично активний спосіб життя.",

  VERY_ACTIVE:
    "Дуже високі фізичні навантаження, інтенсивні щоденні тренування або важка фізична робота.",
};

function localDateTimeNow(): string {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  const hours = String(now.getHours()).padStart(2, "0");

  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function localDateTimeToIso(value: string): string {
  return new Date(value).toISOString();
}

function clearFormError(errors: FormErrors, field: keyof FormErrors): FormErrors {
  const nextErrors = { ...errors };

  delete nextErrors[field];

  return nextErrors;
}

export function ActivityPeriodForm({
  open,
  profile,
  isPending,
  onClose,
  onSubmit,
}: ActivityPeriodFormProps) {
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | "">(
    profile.currentActivity?.activityLevel ?? "",
  );

  const [effectiveFrom, setEffectiveFrom] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const validationErrors: {
      activityLevel?: string;
      effectiveFrom?: string;
    } = {};

    if (activityLevel === "") {
      validationErrors.activityLevel = "Оберіть рівень активності";
    }

    if (effectiveFrom.length > 0) {
      const parsed = new Date(effectiveFrom);

      if (Number.isNaN(parsed.valueOf())) {
        validationErrors.effectiveFrom = "Вкажіть коректну дату й час";
      } else if (parsed.getTime() > Date.now()) {
        validationErrors.effectiveFrom = "Дата початку не може бути в майбутньому";
      }
    }

    setErrors(validationErrors);

    if (
      validationErrors.activityLevel !== undefined ||
      validationErrors.effectiveFrom !== undefined
    ) {
      return;
    }

    if (activityLevel === "") {
      return;
    }

    const input: ActivityPeriodPayload = {
      activityLevel,

      ...(effectiveFrom.length === 0
        ? {}
        : {
            effectiveFrom: localDateTimeToIso(effectiveFrom),
          }),
    };

    onSubmit(input);
  }

  return (
    <Modal
      open={open}
      title="Змінити рівень активності"
      description="Новий рівень буде додано до історії активності. Попередні періоди залишаться збереженими."
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

          <Button type="submit" form="activity-period-form" isLoading={isPending}>
            Зберегти
          </Button>
        </>
      }
    >
      <form id="activity-period-form" className="profile-edit-form" onSubmit={handleSubmit}>
        {profile.currentActivity === null ? null : (
          <div className="profile-form-context">
            <Typography variant="caption">Поточний рівень</Typography>

            <Typography variant="body">
              {
                activityLevelOptions.find(
                  (option) => option.value === profile.currentActivity?.activityLevel,
                )?.label
              }
            </Typography>
          </div>
        )}

        <SelectField
          label="Новий рівень активності"
          placeholder="Оберіть рівень"
          value={activityLevel}
          options={activityLevelOptions}
          required
          onChange={(event) => {
            const value = event.target.value;

            setActivityLevel(value === "" ? "" : (value as ActivityLevel));

            if (errors.activityLevel !== undefined) {
              setErrors((current) => clearFormError(current, "activityLevel"));
            }
          }}
          {...(errors.activityLevel === undefined
            ? {}
            : {
                error: errors.activityLevel,
              })}
          disabled={isPending}
        />

        {activityLevel === "" ? null : (
          <Typography variant="caption">{activityLevelDescriptions[activityLevel]}</Typography>
        )}

        <TextInput
          label="Актуально з"
          type="datetime-local"
          value={effectiveFrom}
          max={localDateTimeNow()}
          description="Необов’язково. Якщо не вказати дату, новий рівень буде актуальним від поточного моменту."
          onChange={(event) => {
            setEffectiveFrom(event.target.value);

            if (errors.effectiveFrom !== undefined) {
              setErrors((current) => clearFormError(current, "effectiveFrom"));
            }
          }}
          {...(errors.effectiveFrom === undefined
            ? {}
            : {
                error: errors.effectiveFrom,
              })}
          disabled={isPending}
        />
      </form>
    </Modal>
  );
}
