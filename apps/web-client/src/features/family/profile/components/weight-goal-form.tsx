"use client";

import { useState, type FormEvent } from "react";

import type { OwnProfile, WeightGoalPayload, WeightGoalType } from "@/shared/api/family";

import { Button, Modal, SelectField, TextInput, Typography } from "@/shared/ui";

interface WeightGoalFormProps {
  readonly open: boolean;
  readonly profile: OwnProfile;
  readonly isPending: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (input: WeightGoalPayload) => void;
}

interface FormErrors {
  readonly type?: string;
  readonly targetWeightKg?: string;
  readonly targetRateKgPerWeek?: string;
  readonly targetDate?: string;
  readonly startsAt?: string;
}

const weightGoalTypeOptions = [
  {
    value: "MAINTAIN",
    label: "Підтримувати вагу",
  },
  {
    value: "LOSE",
    label: "Знизити вагу",
  },
  {
    value: "GAIN",
    label: "Набрати вагу",
  },
] as const;

const weightGoalTypeDescriptions: Readonly<Record<WeightGoalType, string>> = {
  MAINTAIN: "Орієнтир на збереження поточної ваги без цілеспрямованого набору або зниження.",

  LOSE: "Орієнтир на поступове зниження ваги до бажаного значення.",

  GAIN: "Орієнтир на поступове збільшення ваги до бажаного значення.",
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

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function earliestTargetDate(startsAt: string): string {
  if (startsAt.length === 0) {
    return utcToday();
  }

  const parsed = new Date(startsAt);

  if (Number.isNaN(parsed.valueOf())) {
    return utcToday();
  }

  return parsed.toISOString().slice(0, 10);
}

function clearFormError(errors: FormErrors, field: keyof FormErrors): FormErrors {
  const nextErrors = {
    ...errors,
  };

  delete nextErrors[field];

  return nextErrors;
}

function parseOptionalNumber(value: string): number | null {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function WeightGoalForm({
  open,
  profile,
  isPending,
  onClose,
  onSubmit,
}: WeightGoalFormProps) {
  const currentGoal = profile.currentWeightGoal;

  const [type, setType] = useState<WeightGoalType | "">(currentGoal?.type ?? "");

  const [targetWeightKg, setTargetWeightKg] = useState(
    currentGoal?.targetWeightKg === null || currentGoal?.targetWeightKg === undefined
      ? ""
      : String(currentGoal.targetWeightKg),
  );

  const [targetRateKgPerWeek, setTargetRateKgPerWeek] = useState(
    currentGoal?.targetRateKgPerWeek === null || currentGoal?.targetRateKgPerWeek === undefined
      ? ""
      : String(currentGoal.targetRateKgPerWeek),
  );

  const [targetDate, setTargetDate] = useState(currentGoal?.targetDate ?? "");

  /*
   * При replacement старий startsAt не переносимо:
   * нова goal version за замовчуванням починається зараз.
   */
  const [startsAt, setStartsAt] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});

  const isMaintain = type === "MAINTAIN";

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const validationErrors: {
      type?: string;
      targetWeightKg?: string;
      targetRateKgPerWeek?: string;
      targetDate?: string;
      startsAt?: string;
    } = {};

    if (type === "") {
      validationErrors.type = "Оберіть тип цілі";
    }

    const parsedTargetWeight = parseOptionalNumber(targetWeightKg);

    if (targetWeightKg.trim().length > 0 && parsedTargetWeight === null) {
      validationErrors.targetWeightKg = "Введіть коректну вагу";
    } else if (
      parsedTargetWeight !== null &&
      (parsedTargetWeight < 15 || parsedTargetWeight > 500)
    ) {
      validationErrors.targetWeightKg = "Цільова вага має бути від 15 до 500 кг";
    }

    const parsedRate = parseOptionalNumber(targetRateKgPerWeek);

    if (!isMaintain && targetRateKgPerWeek.trim().length > 0 && parsedRate === null) {
      validationErrors.targetRateKgPerWeek = "Введіть коректний темп";
    } else if (!isMaintain && parsedRate !== null && (parsedRate <= 0 || parsedRate > 5)) {
      validationErrors.targetRateKgPerWeek =
        "Темп має бути більшим за 0 і не перевищувати 5 кг/тиждень";
    }

    if (startsAt.length > 0) {
      const parsedStartsAt = new Date(startsAt);

      if (Number.isNaN(parsedStartsAt.valueOf())) {
        validationErrors.startsAt = "Вкажіть коректну дату й час";
      } else if (parsedStartsAt.getTime() > Date.now()) {
        validationErrors.startsAt = "Дата початку не може бути в майбутньому";
      }
    }

    if (targetDate.length > 0 && targetDate < earliestTargetDate(startsAt)) {
      validationErrors.targetDate = "Цільова дата не може бути раніше дати початку";
    }

    setErrors(validationErrors);

    if (
      validationErrors.type !== undefined ||
      validationErrors.targetWeightKg !== undefined ||
      validationErrors.targetRateKgPerWeek !== undefined ||
      validationErrors.targetDate !== undefined ||
      validationErrors.startsAt !== undefined
    ) {
      return;
    }

    if (type === "") {
      return;
    }

    const input: WeightGoalPayload = {
      type,

      targetWeightKg: parsedTargetWeight,

      targetRateKgPerWeek: isMaintain ? null : parsedRate,

      targetDate: targetDate.length === 0 ? null : targetDate,

      ...(startsAt.length === 0
        ? {}
        : {
            startsAt: localDateTimeToIso(startsAt),
          }),
    };

    onSubmit(input);
  }

  return (
    <Modal
      open={open}
      title={currentGoal === null ? "Встановити ціль щодо ваги" : "Змінити ціль щодо ваги"}
      description={
        currentGoal === null
          ? "Створіть ціль, яка допоможе MealMind враховувати бажаний напрямок зміни ваги."
          : "Буде створено нову активну ціль. Поточна ціль залишиться в історії."
      }
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

          <Button type="submit" form="weight-goal-form" isLoading={isPending}>
            Зберегти
          </Button>
        </>
      }
    >
      <form id="weight-goal-form" className="profile-edit-form" onSubmit={handleSubmit}>
        {currentGoal === null ? null : (
          <div className="profile-form-context">
            <Typography variant="caption">Поточна ціль</Typography>

            <Typography variant="body">
              {weightGoalTypeOptions.find((option) => option.value === currentGoal.type)?.label}
            </Typography>
          </div>
        )}

        <SelectField
          label="Тип цілі"
          placeholder="Оберіть ціль"
          value={type}
          options={weightGoalTypeOptions}
          required
          onChange={(event) => {
            const value = event.target.value;

            const nextType = value === "" ? "" : (value as WeightGoalType);

            setType(nextType);

            if (nextType === "MAINTAIN") {
              setTargetRateKgPerWeek("");
            }

            if (errors.type !== undefined) {
              setErrors((current) => clearFormError(current, "type"));
            }

            if (errors.targetRateKgPerWeek !== undefined) {
              setErrors((current) => clearFormError(current, "targetRateKgPerWeek"));
            }
          }}
          {...(errors.type === undefined
            ? {}
            : {
                error: errors.type,
              })}
          disabled={isPending}
        />

        {type === "" ? null : (
          <Typography variant="caption">{weightGoalTypeDescriptions[type]}</Typography>
        )}

        <TextInput
          label="Цільова вага, кг"
          type="number"
          value={targetWeightKg}
          min={15}
          max={500}
          step="0.1"
          inputMode="decimal"
          description="Необов’язково. Вкажіть конкретну вагу, до якої прагнете."
          onChange={(event) => {
            setTargetWeightKg(event.target.value);

            if (errors.targetWeightKg !== undefined) {
              setErrors((current) => clearFormError(current, "targetWeightKg"));
            }
          }}
          {...(errors.targetWeightKg === undefined
            ? {}
            : {
                error: errors.targetWeightKg,
              })}
          disabled={isPending}
        />

        {isMaintain ? null : (
          <TextInput
            label="Бажаний темп, кг/тиждень"
            type="number"
            value={targetRateKgPerWeek}
            min={0.01}
            max={5}
            step="0.01"
            inputMode="decimal"
            description="Необов’язково. Значення має бути більшим за 0 і не перевищувати 5 кг/тиждень."
            onChange={(event) => {
              setTargetRateKgPerWeek(event.target.value);

              if (errors.targetRateKgPerWeek !== undefined) {
                setErrors((current) => clearFormError(current, "targetRateKgPerWeek"));
              }
            }}
            {...(errors.targetRateKgPerWeek === undefined
              ? {}
              : {
                  error: errors.targetRateKgPerWeek,
                })}
            disabled={isPending}
          />
        )}

        <TextInput
          label="Цільова дата"
          type="date"
          value={targetDate}
          min={earliestTargetDate(startsAt)}
          description="Необов’язково."
          onChange={(event) => {
            setTargetDate(event.target.value);

            if (errors.targetDate !== undefined) {
              setErrors((current) => clearFormError(current, "targetDate"));
            }
          }}
          {...(errors.targetDate === undefined
            ? {}
            : {
                error: errors.targetDate,
              })}
          disabled={isPending}
        />

        <TextInput
          label="Початок цілі"
          type="datetime-local"
          value={startsAt}
          max={localDateTimeNow()}
          description="Необов’язково. Якщо не вказати, ціль почне діяти від поточного моменту."
          onChange={(event) => {
            setStartsAt(event.target.value);

            setErrors((current) => {
              let next = current;

              if (current.startsAt !== undefined) {
                next = clearFormError(next, "startsAt");
              }

              if (current.targetDate !== undefined) {
                next = clearFormError(next, "targetDate");
              }

              return next;
            });
          }}
          {...(errors.startsAt === undefined
            ? {}
            : {
                error: errors.startsAt,
              })}
          disabled={isPending}
        />
      </form>
    </Modal>
  );
}
