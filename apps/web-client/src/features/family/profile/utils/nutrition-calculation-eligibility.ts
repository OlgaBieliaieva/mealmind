import type { OwnProfile } from "@/shared/api/family";

export type MissingNutritionInput =
  "birthDate" | "biologicalSex" | "height" | "weight" | "activityLevel" | "adultAge";

export interface NutritionCalculationEligibility {
  readonly eligible: boolean;

  readonly missing: readonly MissingNutritionInput[];
}

export const missingNutritionInputLabels: Readonly<Record<MissingNutritionInput, string>> = {
  birthDate: "Дата народження",

  biologicalSex: "Біологічна стать",

  height: "Зріст",

  weight: "Вага",

  activityLevel: "Рівень фізичної активності",

  adultAge: "Вік від 18 років",
};

export function resolveNutritionCalculationEligibility(
  profile: OwnProfile,
): NutritionCalculationEligibility {
  const missing: MissingNutritionInput[] = [];

  if (profile.birthDate === null) {
    missing.push("birthDate");
  }

  if (profile.biologicalSex !== "MALE" && profile.biologicalSex !== "FEMALE") {
    missing.push("biologicalSex");
  }

  if (
    profile.currentBodyMeasurement?.heightCm === null ||
    profile.currentBodyMeasurement?.heightCm === undefined
  ) {
    missing.push("height");
  }

  if (
    profile.currentBodyMeasurement?.weightKg === null ||
    profile.currentBodyMeasurement?.weightKg === undefined
  ) {
    missing.push("weight");
  }

  if (profile.currentActivity === null) {
    missing.push("activityLevel");
  }

  if (profile.birthDate !== null && calculateAge(profile.birthDate) < 18) {
    missing.push("adultAge");
  }

  return {
    eligible: missing.length === 0,

    missing,
  };
}

function calculateAge(birthDate: string): number {
  const birth = new Date(`${birthDate}T00:00:00`);

  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();

  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());

  if (beforeBirthday) {
    age -= 1;
  }

  return age;
}
