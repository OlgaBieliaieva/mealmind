import type { Prisma } from "../../../../src/generated/prisma/client.js";

type RecipeTypeSeedData = Omit<Prisma.RecipeTypeCreateManyInput, "id"> & {
  readonly id: string;
};

/**
 * Reviewed target seed based on recipe_types_rows.csv.
 *
 * UUIDs and codes are preserved. sortOrder follows legacyId * 10.
 * `medical` remains inactive for historical mapping only.
 */
export const RECIPE_TYPES = [
  {
    id: "e548ad73-f537-4876-80e2-13a4f40df739",
    code: "breakfast",
    nameUa: "Сніданки",
    nameEn: "Breakfast",
    isActive: true,
    sortOrder: 10,
  },
  {
    id: "91f25634-a931-4f9f-8773-0143400a60eb",
    code: "appetizers",
    nameUa: "Закуски",
    nameEn: "Appetizers",
    isActive: true,
    sortOrder: 20,
  },
  {
    id: "eb223732-161f-4bec-b454-9c149631f625",
    code: "soups",
    nameUa: "Перші страви",
    nameEn: "Soups",
    isActive: true,
    sortOrder: 30,
  },
  {
    id: "6a7926c8-8ccc-405d-9336-9d33934ea7ff",
    code: "main_dishes",
    nameUa: "Головні страви",
    nameEn: "Main dishes",
    isActive: true,
    sortOrder: 40,
  },
  {
    id: "ce319c21-4cae-442c-bc4c-856a504ddc79",
    code: "sides",
    nameUa: "Гарніри",
    nameEn: "Side dishes",
    isActive: true,
    sortOrder: 50,
  },
  {
    id: "812d4aca-65e7-4345-9465-60cb173ba351",
    code: "salads",
    nameUa: "Салати",
    nameEn: "Salads",
    isActive: true,
    sortOrder: 60,
  },
  {
    id: "c654f020-a777-44c7-8039-8ca1786b91e2",
    code: "bakery",
    nameUa: "Хліб і випічка",
    nameEn: "Bread & bakery",
    isActive: true,
    sortOrder: 70,
  },
  {
    id: "6cc5f30e-2fbb-46c0-bbae-105ca34adc83",
    code: "desserts",
    nameUa: "Десерти",
    nameEn: "Desserts",
    isActive: true,
    sortOrder: 80,
  },
  {
    id: "6d34b2a0-ef10-45c1-818d-a355fa0b8ae7",
    code: "sauces",
    nameUa: "Соуси",
    nameEn: "Sauces",
    isActive: true,
    sortOrder: 90,
  },
  {
    id: "daae9771-545c-4a06-a70c-de81e2baa6c7",
    code: "beverages",
    nameUa: "Напої",
    nameEn: "Beverages",
    isActive: true,
    sortOrder: 100,
  },
  {
    id: "eec1f9c3-18e4-4293-af91-314e4a77308e",
    code: "snacks",
    nameUa: "Перекуси",
    nameEn: "Snacks",
    isActive: true,
    sortOrder: 110,
  },
  {
    id: "7fceaca5-67a3-456d-b05b-e07655eecb04",
    code: "preserves",
    nameUa: "Заготовки",
    nameEn: "Preserves",
    isActive: true,
    sortOrder: 120,
  },
  {
    id: "5cfdb903-73e5-4685-8a2c-a708bfca83ce",
    code: "baby_food",
    nameUa: "Дитяче харчування",
    nameEn: "Baby food",
    isActive: true,
    sortOrder: 130,
  },
  {
    id: "c2ebb12c-1383-4295-84d7-7727e2bfc7c1",
    code: "medical",
    nameUa: "Лікувальне / дієтичне",
    nameEn: "Medical diet",
    isActive: false,
    sortOrder: 140,
  },
] as const satisfies readonly RecipeTypeSeedData[];
