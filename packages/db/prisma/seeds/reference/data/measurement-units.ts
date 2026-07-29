import type { Prisma } from "../../../../src/generated/prisma/client.js";

type MeasurementUnitSeedData = Omit<Prisma.MeasurementUnitCreateManyInput, "id"> & {
  readonly id: string;
};

/**
 * Stable MVP reference values.
 *
 * Base units:
 * - MASS -> g
 * - VOLUME -> ml
 * - COUNT -> pcs
 */
export const MEASUREMENT_UNITS = [
  {
    id: "7c6c3d4a-1b2e-4f50-8a61-1029384756aa",
    code: "g",
    symbol: "g",
    nameUa: "Грам",
    nameEn: "Gram",
    dimension: "MASS",
    factorToBaseUnit: "1",
    isBaseUnit: true,
    isActive: true,
    sortOrder: 10,
  },
  {
    id: "e1f2a3b4-c5d6-4789-8abc-def012345678",
    code: "kg",
    symbol: "kg",
    nameUa: "Кілограм",
    nameEn: "Kilogram",
    dimension: "MASS",
    factorToBaseUnit: "1000",
    isBaseUnit: false,
    isActive: true,
    sortOrder: 20,
  },
  {
    id: "2a4b6c8d-0e1f-4234-9a5b-6c7d8e9f0123",
    code: "ml",
    symbol: "ml",
    nameUa: "Мілілітр",
    nameEn: "Milliliter",
    dimension: "VOLUME",
    factorToBaseUnit: "1",
    isBaseUnit: true,
    isActive: true,
    sortOrder: 30,
  },
  {
    id: "9f8e7d6c-5b4a-4321-a987-6543210fedcb",
    code: "l",
    symbol: "l",
    nameUa: "Літр",
    nameEn: "Liter",
    dimension: "VOLUME",
    factorToBaseUnit: "1000",
    isBaseUnit: false,
    isActive: true,
    sortOrder: 40,
  },
  {
    id: "13579bdf-2468-4ace-8bdf-1029384756ab",
    code: "pcs",
    symbol: "pc",
    nameUa: "Штука",
    nameEn: "Piece",
    dimension: "COUNT",
    factorToBaseUnit: "1",
    isBaseUnit: true,
    isActive: true,
    sortOrder: 50,
  },
] as const satisfies readonly MeasurementUnitSeedData[];
