import type { Prisma } from "../../../../src/generated/prisma/client.js";

type MealTypeSeedData = Omit<Prisma.MealTypeCreateManyInput, "id"> & {
  readonly id: string;
};

/**
 * Reviewed target seed based on meal_types_rows.csv.
 *
 * UUIDs, codes and names are preserved. sortOrder follows order_index * 10.
 */
export const MEAL_TYPES = [
  {
    id: "d6442d6d-11aa-4a86-a612-b0f9c32dd1bb",
    code: "breakfast",
    nameUa: "Сніданок",
    nameEn: "Breakfast",
    kind: "MAIN_MEAL",
    isActive: true,
    sortOrder: 10,
  },
  {
    id: "1ed1a765-f73b-4d05-a8fb-95530edf93ad",
    code: "morning_snack",
    nameUa: "Ранковий перекус",
    nameEn: "Morning snack",
    kind: "SNACK",
    isActive: true,
    sortOrder: 20,
  },
  {
    id: "15bace74-c31d-44ce-a528-d6dafed2ad14",
    code: "lunch",
    nameUa: "Обід",
    nameEn: "Lunch",
    kind: "MAIN_MEAL",
    isActive: true,
    sortOrder: 30,
  },
  {
    id: "7a67aedc-df35-48c5-98fa-6d3a008142a9",
    code: "afternoon_snack",
    nameUa: "Післяобідній перекус",
    nameEn: "Afternoon snack",
    kind: "SNACK",
    isActive: true,
    sortOrder: 40,
  },
  {
    id: "95bc3d99-e94b-4a0d-86d8-6e1309090ac7",
    code: "dinner",
    nameUa: "Вечеря",
    nameEn: "Dinner",
    kind: "MAIN_MEAL",
    isActive: true,
    sortOrder: 50,
  },
  {
    id: "066a6405-1d82-4a3f-b00d-bd22fa20a707",
    code: "evening_snack",
    nameUa: "Вечірній перекус",
    nameEn: "Evening snack",
    kind: "SNACK",
    isActive: true,
    sortOrder: 60,
  },
  {
    id: "919b3a1d-ace1-4695-b613-292cbf9df2bb",
    code: "late_meal",
    nameUa: "Пізній прийом їжі",
    nameEn: "Late meal",
    kind: "FLEXIBLE",
    isActive: true,
    sortOrder: 70,
  },
] as const satisfies readonly MealTypeSeedData[];
