"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding, type OnboardingPayload } from "@/shared/api/family";
import { Button, SelectField, TextInput } from "@/shared/ui";

const steps = [
  "firstName",
  "lastName",
  "birthDate",
  "biologicalSex",
  "heightCm",
  "weightKg",
  "activityLevel",
  "weightGoalType",
] as const;
type Step = (typeof steps)[number];
type Draft = Record<Step, string>;
const initialDraft: Draft = {
  firstName: "",
  lastName: "",
  birthDate: "",
  biologicalSex: "",
  heightCm: "",
  weightKg: "",
  activityLevel: "",
  weightGoalType: "",
};
const copy: Record<Step, { title: string; explanation: string; optional: boolean }> = {
  firstName: {
    title: "Як вас звати?",
    explanation: "Ім’я використовується для вашого профілю та персонального звертання в MealMind.",
    optional: false,
  },
  lastName: {
    title: "Яке ваше прізвище?",
    explanation: "Прізвище допоможе розпізнавати учасників сім’ї. Ви можете не вказувати його.",
    optional: true,
  },
  birthDate: {
    title: "Коли ви народилися?",
    explanation:
      "Вік потрібен лише для майбутнього точнішого розрахунку харчових потреб і рекомендацій.",
    optional: true,
  },
  biologicalSex: {
    title: "Вкажіть стать для розрахунків",
    explanation:
      "Ця інформація може впливати на розрахунок харчових потреб. Вона не показується іншим користувачам.",
    optional: true,
  },
  heightCm: {
    title: "Який ваш зріст?",
    explanation:
      "Зріст використовується разом з іншими показниками для розрахунку харчових потреб і персоналізації харчових рекомендацій.",
    optional: true,
  },
  weightKg: {
    title: "Яка ваша поточна вага?",
    explanation:
      "Вага зберігається як приватний показник і допомагає розраховувати персональні цілі.",
    optional: true,
  },
  activityLevel: {
    title: "Наскільки ви активні?",
    explanation: "Рівень активності допоможе оцінювати орієнтовні енергетичні потреби.",
    optional: true,
  },
  weightGoalType: {
    title: "Яка ваша ціль?",
    explanation: "Ціль потрібна для майбутніх персональних планів. Ви зможете змінити її пізніше.",
    optional: true,
  },
};
function field(
  step: Step,
  value: string,
  setValue: (value: string) => void,
  error?: string,
): ReactNode {
  const common = {
    value,
    onChange: (event: { target: { value: string } }) => setValue(event.target.value),
    ...(error === undefined ? {} : { error }),
  };
  switch (step) {
    case "firstName":
      return (
        <TextInput
          id="onboarding-first-name"
          label="Ім’я"
          autoComplete="given-name"
          maxLength={100}
          required
          {...common}
        />
      );
    case "lastName":
      return (
        <TextInput
          id="onboarding-last-name"
          label="Прізвище"
          autoComplete="family-name"
          maxLength={100}
          {...common}
        />
      );
    case "birthDate":
      return (
        <TextInput
          id="onboarding-birth-date"
          label="Дата народження"
          type="date"
          max={new Date().toISOString().slice(0, 10)}
          {...common}
        />
      );
    case "heightCm":
      return (
        <TextInput
          id="onboarding-height"
          label="Зріст, см"
          type="number"
          inputMode="decimal"
          min={50}
          max={260}
          {...common}
        />
      );
    case "weightKg":
      return (
        <TextInput
          id="onboarding-weight"
          label="Вага, кг"
          type="number"
          inputMode="decimal"
          min={15}
          max={500}
          step="0.1"
          {...common}
        />
      );
    case "biologicalSex":
      return (
        <SelectField
          id="onboarding-sex"
          label="Стать для розрахунків"
          placeholder="Оберіть варіант"
          options={[
            { value: "FEMALE", label: "Жіноча" },
            { value: "MALE", label: "Чоловіча" },
            { value: "UNSPECIFIED", label: "Не вказувати" },
          ]}
          {...common}
        />
      );
    case "activityLevel":
      return (
        <SelectField
          id="onboarding-activity"
          label="Рівень активності"
          placeholder="Оберіть рівень"
          options={[
            { value: "SEDENTARY", label: "Малорухливий" },
            { value: "LIGHT", label: "Легка активність" },
            { value: "MODERATE", label: "Помірна активність" },
            { value: "ACTIVE", label: "Висока активність" },
            { value: "VERY_ACTIVE", label: "Дуже висока активність" },
          ]}
          {...common}
        />
      );
    case "weightGoalType":
      return (
        <SelectField
          id="onboarding-goal"
          label="Ціль щодо ваги"
          placeholder="Оберіть ціль"
          options={[
            { value: "MAINTAIN", label: "Підтримувати вагу" },
            { value: "LOSE", label: "Зменшити вагу" },
            { value: "GAIN", label: "Збільшити вагу" },
          ]}
          {...common}
        />
      );
  }
}
function payload(draft: Draft): OnboardingPayload {
  return {
    firstName: draft.firstName.trim(),
    ...(draft.lastName.trim() ? { lastName: draft.lastName.trim() } : {}),
    ...(draft.birthDate ? { birthDate: draft.birthDate } : {}),
    ...(draft.biologicalSex
      ? { biologicalSex: draft.biologicalSex as NonNullable<OnboardingPayload["biologicalSex"]> }
      : {}),
    ...(draft.heightCm ? { heightCm: Number(draft.heightCm) } : {}),
    ...(draft.weightKg ? { weightKg: Number(draft.weightKg) } : {}),
    ...(draft.activityLevel
      ? { activityLevel: draft.activityLevel as NonNullable<OnboardingPayload["activityLevel"]> }
      : {}),
    ...(draft.weightGoalType
      ? { weightGoalType: draft.weightGoalType as NonNullable<OnboardingPayload["weightGoalType"]> }
      : {}),
  };
}
export function OnboardingWizard() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState(initialDraft);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const step = steps[index]!;
  const current = copy[step];
  const last = index === steps.length - 1;
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (step === "firstName" && draft.firstName.trim().length === 0) {
      setError("Вкажіть ім’я, щоб продовжити");
      return;
    }
    if (!last) {
      setIndex((value) => value + 1);
      return;
    }
    setSubmitting(true);
    try {
      await completeOnboarding(payload(draft));
      router.replace("/");
      router.refresh();
    } catch {
      setError("Не вдалося завершити налаштування. Дані не збережено — повторіть спробу.");
      setSubmitting(false);
    }
  }
  return (
    <section className="onboarding-card" aria-labelledby="onboarding-title">
      <div className="onboarding-progress">
        <p>
          Крок {index + 1} із {steps.length}
        </p>
        <progress max={steps.length} value={index + 1}>
          Крок {index + 1} із {steps.length}
        </progress>
      </div>
      <h1 id="onboarding-title">{current.title}</h1>
      <p className="onboarding-explanation">{current.explanation}</p>
      <form onSubmit={submit} noValidate>
        {field(
          step,
          draft[step],
          (value) => setDraft((state) => ({ ...state, [step]: value })),
          error || undefined,
        )}
        {error && step !== "firstName" ? (
          <p className="onboarding-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="onboarding-actions">
          {index > 0 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setError("");
                setIndex((value) => value - 1);
              }}
              disabled={submitting}
            >
              Назад
            </Button>
          ) : null}
          <Button type="submit" disabled={submitting}>
            {submitting
              ? "Зберігаємо…"
              : last
                ? "Завершити"
                : current.optional && draft[step] === ""
                  ? "Пропустити"
                  : "Продовжити"}
          </Button>
        </div>
      </form>
      <p className="onboarding-privacy">
        Відповіді передаються захищеному API MealMind і не зберігаються до завершення всіх кроків.
      </p>
    </section>
  );
}
