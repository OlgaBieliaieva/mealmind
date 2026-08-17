import type {
  ActivityLevel,
  BiologicalSex,
  NutrientUnit,
  WeightGoalType,
} from "@/shared/api/family";

export const biologicalSexLabels: Readonly<Record<BiologicalSex, string>> = {
  MALE: "Чоловіча",
  FEMALE: "Жіноча",
  UNSPECIFIED: "Не вказано",
};

export const activityLevelLabels: Readonly<Record<ActivityLevel, string>> = {
  SEDENTARY: "Малорухливий",
  LIGHT: "Легка активність",
  MODERATE: "Помірна активність",
  ACTIVE: "Висока активність",
  VERY_ACTIVE: "Дуже висока активність",
};

export const weightGoalTypeLabels: Readonly<Record<WeightGoalType, string>> = {
  MAINTAIN: "Підтримувати вагу",
  LOSE: "Знизити вагу",
  GAIN: "Набрати вагу",
};

export const nutrientUnitLabels: Readonly<Record<NutrientUnit, string>> = {
  KCAL: "ккал",
  G: "г",
  MG: "мг",
  MCG: "мкг",
};

export function formatDate(value: string | null): string {
  if (value === null) {
    return "Не вказано";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatNumber(value: string | number | null, suffix: string): string {
  if (value === null) {
    return "Не вказано";
  }

  return `${Number(value).toLocaleString("uk-UA", {
    maximumFractionDigits: 1,
  })} ${suffix}`;
}
