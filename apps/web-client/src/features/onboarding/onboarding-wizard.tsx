"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  completeOnboarding,
  readOwnProfile,
  type OnboardingPayload,
  type OwnProfile,
  type ProfileNutrientTarget,
} from "@/shared/api/family";
import { Button, SelectField, TextInput } from "@/shared/ui";

const CALCULATION_MINIMUM_DURATION_MS = 2_200;
const CALCULATION_COMPLETION_DELAY_MS = 300;

type CompletionPhase = "questions" | "calculating" | "recommendations" | "insufficient";

interface NutritionSummary {
  readonly restingEnergyKcal: string;
  readonly maintenanceEnergyKcal: string;
  readonly protein: ProfileNutrientTarget;
  readonly carbohydrate: ProfileNutrientTarget;
  readonly totalFat: ProfileNutrientTarget;
}

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
      "Вік потрібен для автоматичного розрахунку базових енергетичних і харчових потреб.",
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

function isAdult(birthDate: string): boolean {
  if (birthDate.length === 0) {
    return false;
  }

  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());

  if (beforeBirthday) {
    age -= 1;
  }

  return age >= 18;
}

function canCalculateNutrition(draft: Draft): boolean {
  return (
    isAdult(draft.birthDate) &&
    (draft.biologicalSex === "MALE" || draft.biologicalSex === "FEMALE") &&
    draft.heightCm.length > 0 &&
    draft.weightKg.length > 0 &&
    draft.activityLevel.length > 0
  );
}

function nutritionSummary(profile: OwnProfile): NutritionSummary | null {
  const current = profile.nutritionTargets.current;

  if (
    current === null ||
    current.restingEnergyKcal === null ||
    current.maintenanceEnergyKcal === null
  ) {
    return null;
  }

  const byCode = (code: string) => current.targets.find((target) => target.nutrient.code === code);
  const protein = byCode("protein");
  const carbohydrate = byCode("carbohydrate");
  const totalFat = byCode("total_fat");

  if (protein === undefined || carbohydrate === undefined || totalFat === undefined) {
    return null;
  }

  return {
    restingEnergyKcal: current.restingEnergyKcal,
    maintenanceEnergyKcal: current.maintenanceEnergyKcal,
    protein,
    carbohydrate,
    totalFat,
  };
}

function formatEnergy(value: string): string {
  return `${Number(value).toLocaleString("uk-UA", { maximumFractionDigits: 0 })} ккал/день`;
}

function formatMacro(target: ProfileNutrientTarget): string {
  const format = (value: string) =>
    Number(value).toLocaleString("uk-UA", {
      maximumFractionDigits: Number(value) < 10 ? 1 : 0,
    });

  if (target.minimumValue !== null && target.maximumValue !== null) {
    return `${format(target.minimumValue)}–${format(target.maximumValue)} г/день`;
  }

  if (target.targetValue !== null) {
    return `${format(target.targetValue)} г/день`;
  }

  return "Не визначено";
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function CalculationProgress({ progress }: { readonly progress: number }) {
  return (
    <section className="onboarding-card" aria-labelledby="onboarding-calculation-title">
      <div className="onboarding-calculation">
        <div className="onboarding-calculation__indicator" aria-hidden="true" />
        <h1 id="onboarding-calculation-title">Розраховуємо ваші базові норми</h1>
        <p className="onboarding-explanation" role="status">
          Аналізуємо вік, стать, зріст, вагу та рівень активності. Це займе лише кілька секунд.
        </p>
        <div className="onboarding-calculation__progress">
          <span>{progress}%</span>
          <progress max={100} value={progress} aria-label="Прогрес розрахунку">
            {progress}%
          </progress>
        </div>
      </div>
    </section>
  );
}

function CompletionResult({
  summary,
  loadFailed,
  onStart,
}: {
  readonly summary: NutritionSummary | null;
  readonly loadFailed: boolean;
  readonly onStart: () => void;
}) {
  const available = summary !== null;

  return (
    <section className="onboarding-card" aria-labelledby="onboarding-result-title">
      <div className="onboarding-result">
        <p className="onboarding-result__eyebrow" role="status">
          {available ? "Розрахунок завершено" : "Профіль створено"}
        </p>
        <h1 id="onboarding-result-title">
          {available
            ? "Ваші рекомендовані базові норми"
            : loadFailed
              ? "Профіль успішно налаштовано"
              : "Поки що недостатньо даних"}
        </h1>
        {available ? (
          <>
            <p className="onboarding-explanation">
              Це орієнтовні стартові значення MealMind, а не медичне призначення.
            </p>
            <dl className="onboarding-recommendations">
              <div>
                <dt>Енергія у стані спокою</dt>
                <dd>{formatEnergy(summary.restingEnergyKcal)}</dd>
              </div>
              <div>
                <dt>Енергія з урахуванням активності</dt>
                <dd>{formatEnergy(summary.maintenanceEnergyKcal)}</dd>
              </div>
              <div>
                <dt>Білки</dt>
                <dd>{formatMacro(summary.protein)}</dd>
              </div>
              <div>
                <dt>Вуглеводи</dt>
                <dd>{formatMacro(summary.carbohydrate)}</dd>
              </div>
              <div>
                <dt>Жири</dt>
                <dd>{formatMacro(summary.totalFat)}</dd>
              </div>
            </dl>
            <p className="onboarding-result__note">
              Ви можете змінити ці норми або перерахувати їх пізніше в особистому профілі.
            </p>
          </>
        ) : (
          <>
            <p className="onboarding-explanation">
              {loadFailed
                ? "Не вдалося завантажити результати розрахунку на цьому екрані. Ваші дані вже збережено."
                : "Для автоматичного розрахунку потрібні дата народження, стать для розрахунків, зріст, вага, рівень активності та вік від 18 років."}
            </p>
            <p className="onboarding-result__note">
              {loadFailed
                ? "Перегляньте цільові показники в особистому профілі або повторіть розрахунок там."
                : "Ви можете доповнити інформацію в особистому профілі й запустити розрахунок у будь-який момент."}
            </p>
          </>
        )}
        <div className="onboarding-actions">
          <Button type="button" onClick={onStart}>
            Розпочати
          </Button>
        </div>
      </div>
    </section>
  );
}

export function OnboardingWizard() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState(initialDraft);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<CompletionPhase>("questions");
  const [calculationProgress, setCalculationProgress] = useState(0);
  const [summary, setSummary] = useState<NutritionSummary | null>(null);
  const [resultLoadFailed, setResultLoadFailed] = useState(false);
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
    const calculate = canCalculateNutrition(draft);
    let progressTimer: number | undefined;
    let onboardingCompleted = false;

    if (calculate) {
      setCalculationProgress(0);
      setPhase("calculating");
      progressTimer = window.setInterval(() => {
        setCalculationProgress((value) => Math.min(value + 4, 92));
      }, 80);
    }

    try {
      await completeOnboarding(payload(draft));
      onboardingCompleted = true;

      if (!calculate) {
        setResultLoadFailed(false);
        setPhase("insufficient");
        return;
      }

      const [profile] = await Promise.all([
        readOwnProfile(),
        wait(CALCULATION_MINIMUM_DURATION_MS),
      ]);

      setCalculationProgress(100);
      await wait(CALCULATION_COMPLETION_DELAY_MS);

      const calculatedSummary = nutritionSummary(profile);
      setSummary(calculatedSummary);
      setResultLoadFailed(false);
      setPhase(calculatedSummary === null ? "insufficient" : "recommendations");
    } catch {
      if (onboardingCompleted) {
        setSummary(null);
        setResultLoadFailed(true);
        setPhase("insufficient");
      } else {
        setError("Не вдалося завершити налаштування. Дані не збережено — повторіть спробу.");
        setPhase("questions");
      }
    } finally {
      if (progressTimer !== undefined) {
        window.clearInterval(progressTimer);
      }

      setSubmitting(false);
    }
  }

  function startUsingMealMind(): void {
    router.replace("/");
    router.refresh();
  }

  if (phase === "calculating") {
    return <CalculationProgress progress={calculationProgress} />;
  }

  if (phase === "recommendations" || phase === "insufficient") {
    return (
      <CompletionResult
        summary={summary}
        loadFailed={resultLoadFailed}
        onStart={startUsingMealMind}
      />
    );
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
