import { z } from "zod";

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const quantityGrams = z.number().finite().positive().max(100_000);
const empty = z.object({});
const emptyBody = z.unknown().optional();
export const readDiarySchema = z.object({
  params: empty,
  query: z.object({ date }),
  body: emptyBody,
});
export const readDashboardSchema = z.object({
  params: empty,
  query: z.object({
    dates: z
      .string()
      .transform((value) => value.split(",").filter(Boolean))
      .pipe(z.array(date).min(1).max(31))
      .refine((values) => new Set(values).size === values.length, "Dates must be unique"),
  }),
  body: emptyBody,
});
export const confirmPlannedSchema = z.object({
  params: z.object({ participantId: uuid }),
  query: empty,
  body: z.object({ quantityGrams: quantityGrams.optional() }),
});
export const skipPlannedSchema = z.object({
  params: z.object({ participantId: uuid }),
  query: empty,
  body: z.object({ date }),
});
export const updateConsumptionSchema = z.object({
  params: z.object({ entryId: uuid }),
  query: empty,
  body: z.object({
    expectedRevision: z.number().int().nonnegative(),
    quantityGrams,
    mealTypeId: uuid,
    date,
  }),
});
export const voidConsumptionSchema = z.object({
  params: z.object({ entryId: uuid }),
  query: empty,
  body: z.object({ expectedRevision: z.number().int().nonnegative(), date }),
});
export const addManualConsumptionSchema = z.object({
  params: empty,
  query: empty,
  body: z.object({
    memberId: uuid,
    date,
    kind: z.enum(["product", "recipe"]),
    foodId: uuid,
    mealTypeId: uuid,
    quantityGrams,
  }),
});
