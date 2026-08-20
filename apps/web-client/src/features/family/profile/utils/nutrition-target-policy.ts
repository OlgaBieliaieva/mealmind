import type { ProfileNutrientTarget } from "@/shared/api/family";

export const PRIMARY_NUTRIENT_CODES = [
  "energy_kcal",
  "protein",
  "carbohydrate",
  "total_fat",
  "dietary_fiber",
  "saturated_fat",
  "trans_fat",
  "sodium",
  "potassium",
  "calcium",
  "iron",
  "magnesium",
  "omega_3_ala",
] as const;

export type PrimaryNutrientCode = (typeof PRIMARY_NUTRIENT_CODES)[number];

export type NutrientTargetMode = "TARGET" | "RANGE" | "MAXIMUM" | "MINIMUM";

export const nutrientTargetModeOptions = [
  {
    value: "TARGET",
    label: "Конкретне значення",
  },
  {
    value: "RANGE",
    label: "Діапазон",
  },
  {
    value: "MAXIMUM",
    label: "Не більше",
  },
  {
    value: "MINIMUM",
    label: "Не менше",
  },
] as const;

export function isPrimaryNutrientCode(code: string): code is PrimaryNutrientCode {
  return (PRIMARY_NUTRIENT_CODES as readonly string[]).includes(code);
}

export function inferNutrientTargetMode(
  target: ProfileNutrientTarget | undefined,
): NutrientTargetMode {
  if (target === undefined) {
    return "TARGET";
  }

  if (target.minimumValue !== null && target.maximumValue !== null) {
    return "RANGE";
  }

  if (target.targetValue !== null) {
    return "TARGET";
  }

  if (target.maximumValue !== null) {
    return "MAXIMUM";
  }

  return "MINIMUM";
}
