"use client";

import { useState, type FormEvent } from "react";

import type { BodyMeasurementPayload, OwnProfile } from "@/shared/api/family";

import { Button, Modal, TextInput, Typography } from "@/shared/ui";

export type BodyMetricKind = "height" | "weight";

interface BodyMetricFormProps {
  readonly open: boolean;
  readonly kind: BodyMetricKind;
  readonly profile: OwnProfile;
  readonly isPending: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (input: BodyMeasurementPayload) => void;
}

interface FormErrors {
  readonly value?: string;
  readonly measuredAt?: string;
}

const metricConfig = {
  height: {
    title: "Оновити зріст",
    description:
      "Буде створено новий запис в історії вимірювань. Попередні значення залишаться збереженими.",
    label: "Новий зріст, см",
    unit: "см",
    min: 50,
    max: 260,
    step: "0.1",
    validationMessage: "Зріст має бути від 50 до 260 см",
  },

  weight: {
    title: "Додати нову вагу",
    description: "Зафіксуйте актуальну вагу. Попередні вимірювання залишаться в історії.",
    label: "Нова вага, кг",
    unit: "кг",
    min: 15,
    max: 500,
    step: "0.01",
    validationMessage: "Вага має бути від 15 до 500 кг",
  },
} as const;

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

function validateValue(rawValue: string, kind: BodyMetricKind): string | undefined {
  const normalized = rawValue.trim();

  if (normalized.length === 0) {
    return "Вкажіть значення";
  }

  const value = Number(normalized);

  if (!Number.isFinite(value)) {
    return "Введіть коректне числове значення";
  }

  const config = metricConfig[kind];

  if (value < config.min || value > config.max) {
    return config.validationMessage;
  }

  return undefined;
}

function validateMeasuredAt(measuredAt: string): string | undefined {
  if (measuredAt.length === 0) {
    return undefined;
  }

  const parsed = new Date(measuredAt);

  if (Number.isNaN(parsed.valueOf())) {
    return "Вкажіть коректну дату й час";
  }

  if (parsed.getTime() > Date.now()) {
    return "Дата вимірювання не може бути в майбутньому";
  }

  return undefined;
}

export function BodyMetricForm({
  open,
  kind,
  profile,
  isPending,
  onClose,
  onSubmit,
}: BodyMetricFormProps) {
  const [value, setValue] = useState("");

  const [measuredAt, setMeasuredAt] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});

  const config = metricConfig[kind];

  const currentMeasurement = profile.currentBodyMeasurement;

  const currentValue =
    kind === "height" ? currentMeasurement?.heightCm : currentMeasurement?.weightKg;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const valueError = validateValue(value, kind);

    const measuredAtError = validateMeasuredAt(measuredAt);

    const validationErrors: {
      value?: string;
      measuredAt?: string;
    } = {};

    if (valueError !== undefined) {
      validationErrors.value = valueError;
    }

    if (measuredAtError !== undefined) {
      validationErrors.measuredAt = measuredAtError;
    }

    setErrors(validationErrors);

    if (valueError !== undefined || measuredAtError !== undefined) {
      return;
    }

    const parsedValue = Number(value.trim());

    const timestamp =
      measuredAt.length === 0
        ? {}
        : {
            measuredAt: localDateTimeToIso(measuredAt),
          };

    const input: BodyMeasurementPayload =
      kind === "height"
        ? {
            heightCm: parsedValue,
            ...timestamp,
          }
        : {
            weightKg: parsedValue,
            ...timestamp,
          };

    onSubmit(input);
  }

  const formId = kind === "height" ? "height-measurement-form" : "weight-measurement-form";

  return (
    <Modal
      open={open}
      title={config.title}
      description={config.description}
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

          <Button type="submit" form={formId} isLoading={isPending}>
            Зберегти
          </Button>
        </>
      }
    >
      <form id={formId} className="profile-edit-form" onSubmit={handleSubmit}>
        {currentValue == null ? null : (
          <div className="profile-form-context">
            <Typography variant="caption">Поточне значення</Typography>

            <Typography variant="body">
              {Number(currentValue).toLocaleString("uk-UA", {
                maximumFractionDigits: 2,
              })}{" "}
              {config.unit}
            </Typography>
          </div>
        )}

        <TextInput
          label={config.label}
          type="number"
          value={value}
          min={config.min}
          max={config.max}
          step={config.step}
          inputMode="decimal"
          required
          onChange={(event) => {
            setValue(event.target.value);

            if (errors.value !== undefined) {
              setErrors((current) => clearFormError(current, "value"));
            }
          }}
          {...(errors.value === undefined
            ? {}
            : {
                error: errors.value,
              })}
          disabled={isPending}
        />

        <TextInput
          label="Дата і час вимірювання"
          type="datetime-local"
          value={measuredAt}
          max={localDateTimeNow()}
          description="Необов’язково. Якщо не вказати дату, буде використано поточний час."
          onChange={(event) => {
            setMeasuredAt(event.target.value);

            if (errors.measuredAt !== undefined) {
              setErrors((current) => clearFormError(current, "measuredAt"));
            }
          }}
          {...(errors.measuredAt === undefined
            ? {}
            : {
                error: errors.measuredAt,
              })}
          disabled={isPending}
        />
      </form>
    </Modal>
  );
}
