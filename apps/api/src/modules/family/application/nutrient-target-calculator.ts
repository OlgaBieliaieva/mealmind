import type { ActivityLevel, BiologicalSex, OnboardingInput } from "../domain/family-repository.js";

export const NUTRITION_POLICY_VERSION = "mealmind-onboarding-nutrition-v1";

const ACTIVITY_FACTORS: Readonly<Record<ActivityLevel, number>> = Object.freeze({
  SEDENTARY: 1.4,
  LIGHT: 1.55,
  MODERATE: 1.7,
  ACTIVE: 1.9,
  VERY_ACTIVE: 2.2,
});

export interface NutritionCalculationInput {
  readonly birthDate: string;

  readonly biologicalSex: Exclude<BiologicalSex, "UNSPECIFIED">;

  readonly heightCm: number;

  readonly weightKg: number;

  readonly activityLevel: ActivityLevel;
}

export interface CalculatedNutrientTarget {
  readonly nutrientCode: string;

  readonly minimumValue?: number | undefined;

  readonly targetValue?: number | undefined;

  readonly maximumValue?: number | undefined;
}

export interface NutritionCalculation {
  readonly policyVersion: string;

  readonly ageYears: number;

  readonly restingEnergyKcal: number;

  readonly maintenanceEnergyKcal: number;

  readonly targets: readonly CalculatedNutrientTarget[];
}

export function calculateOnboardingNutritionTargets(
  input: OnboardingInput,
  calculatedAt: Date,
): NutritionCalculation | null {
  if (
    input.birthDate === undefined ||
    (input.biologicalSex !== "MALE" && input.biologicalSex !== "FEMALE") ||
    input.heightCm === undefined ||
    input.weightKg === undefined ||
    input.activityLevel === undefined
  ) {
    return null;
  }

  return calculateNutritionTargets(
    {
      birthDate: input.birthDate,
      biologicalSex: input.biologicalSex,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      activityLevel: input.activityLevel,
    },
    calculatedAt,
  );
}

export function calculateNutritionTargets(
  input: NutritionCalculationInput,
  calculatedAt: Date,
): NutritionCalculation | null {
  const birthDate = new Date(`${input.birthDate}T00:00:00.000Z`);

  const ageYears = fullYearsBetween(birthDate, calculatedAt);

  if (ageYears < 18) {
    return null;
  }

  const restingEnergyKcal = calculateRestingEnergy(
    input.biologicalSex,
    input.weightKg,
    input.heightCm,
    ageYears,
  );

  const maintenanceEnergyKcal = restingEnergyKcal * ACTIVITY_FACTORS[input.activityLevel];

  const targets: readonly CalculatedNutrientTarget[] = Object.freeze([
    /*
     * IMPORTANT:
     * canonical MealMind nutrient code from nutrients seed.
     */
    Object.freeze({
      nutrientCode: "energy_kcal",
      targetValue: maintenanceEnergyKcal,
    }),

    Object.freeze({
      nutrientCode: "protein",
      minimumValue: input.weightKg * 1.2,
      maximumValue: input.weightKg * 1.6,
    }),

    Object.freeze({
      nutrientCode: "carbohydrate",
      minimumValue: (maintenanceEnergyKcal * 0.45) / 4,
      maximumValue: (maintenanceEnergyKcal * 0.65) / 4,
    }),

    Object.freeze({
      nutrientCode: "total_fat",
      minimumValue: (maintenanceEnergyKcal * 0.2) / 9,
      maximumValue: (maintenanceEnergyKcal * 0.35) / 9,
    }),

    Object.freeze({
      nutrientCode: "saturated_fat",
      maximumValue: (maintenanceEnergyKcal * 0.1) / 9,
    }),

    Object.freeze({
      nutrientCode: "trans_fat",
      maximumValue: (maintenanceEnergyKcal * 0.01) / 9,
    }),

    Object.freeze({
      nutrientCode: "dietary_fiber",
      targetValue: (maintenanceEnergyKcal * 14) / 1000,
    }),

    Object.freeze({
      nutrientCode: "sodium",
      maximumValue: 2300,
    }),

    Object.freeze({
      nutrientCode: "potassium",
      targetValue: potassiumTarget(input.biologicalSex, ageYears),
    }),

    Object.freeze({
      nutrientCode: "calcium",
      targetValue: calciumTarget(input.biologicalSex, ageYears),
    }),

    Object.freeze({
      nutrientCode: "iron",
      targetValue: ironTarget(input.biologicalSex, ageYears),
    }),

    Object.freeze({
      nutrientCode: "magnesium",
      targetValue: magnesiumTarget(input.biologicalSex, ageYears),
    }),

    Object.freeze({
      nutrientCode: "omega_3_ala",
      targetValue: input.biologicalSex === "MALE" ? 1.6 : 1.1,
    }),
  ]);

  return Object.freeze({
    policyVersion: NUTRITION_POLICY_VERSION,

    ageYears,

    restingEnergyKcal,

    maintenanceEnergyKcal,

    targets,
  });
}

function fullYearsBetween(birthDate: Date, at: Date): number {
  let years = at.getUTCFullYear() - birthDate.getUTCFullYear();

  const beforeBirthday =
    at.getUTCMonth() < birthDate.getUTCMonth() ||
    (at.getUTCMonth() === birthDate.getUTCMonth() && at.getUTCDate() < birthDate.getUTCDate());

  if (beforeBirthday) {
    years -= 1;
  }

  return years;
}

function calculateRestingEnergy(
  biologicalSex: Exclude<BiologicalSex, "UNSPECIFIED">,
  weightKg: number,
  heightCm: number,
  ageYears: number,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;

  return biologicalSex === "MALE" ? base + 5 : base - 161;
}

function potassiumTarget(
  biologicalSex: Exclude<BiologicalSex, "UNSPECIFIED">,
  ageYears: number,
): number {
  if (ageYears === 18) {
    return biologicalSex === "MALE" ? 3000 : 2300;
  }

  return biologicalSex === "MALE" ? 3400 : 2600;
}

function calciumTarget(
  biologicalSex: Exclude<BiologicalSex, "UNSPECIFIED">,
  ageYears: number,
): number {
  if (ageYears === 18) {
    return 1300;
  }

  if (ageYears <= 50) {
    return 1000;
  }

  if (ageYears <= 70) {
    return biologicalSex === "FEMALE" ? 1200 : 1000;
  }

  return 1200;
}

function ironTarget(
  biologicalSex: Exclude<BiologicalSex, "UNSPECIFIED">,
  ageYears: number,
): number {
  if (ageYears === 18) {
    return biologicalSex === "MALE" ? 11 : 15;
  }

  if (ageYears <= 50) {
    return biologicalSex === "MALE" ? 8 : 18;
  }

  return 8;
}

function magnesiumTarget(
  biologicalSex: Exclude<BiologicalSex, "UNSPECIFIED">,
  ageYears: number,
): number {
  if (ageYears === 18) {
    return biologicalSex === "MALE" ? 410 : 360;
  }

  if (ageYears <= 30) {
    return biologicalSex === "MALE" ? 400 : 310;
  }

  return biologicalSex === "MALE" ? 420 : 320;
}
