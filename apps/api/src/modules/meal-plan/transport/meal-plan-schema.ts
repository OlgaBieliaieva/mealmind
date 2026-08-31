import { z } from "zod";

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(Date.parse(value + "T00:00:00.000Z")), "Некоректна дата");
const uuid = z.string().uuid();
const revision = z.coerce.number().int().min(0).max(2_147_483_647);
const quantityGrams = z.number().finite().positive().max(100_000);
const today = () => new Date().toISOString().slice(0, 10);

export const mealPlanWeekSchema = z.object({
  params: z.object({}),
  query: z.object({
    date: date.default(today),
    days: z
      .string()
      .max(80)
      .optional()
      .transform((value) => value?.split(",").filter(Boolean)),
  }),
  body: z.unknown().optional(),
});

export const planningContextSchema = z.object({
  params: z.object({}),
  query: z.object({ date: date.default(today) }),
  body: z.unknown().optional(),
});

const participant = z.object({ memberId: uuid, quantityGrams });
const batchEntry = z.object({
  date,
  mealTypeId: uuid,
  kind: z.enum(["product", "recipe"]),
  foodId: uuid,
  participants: z
    .array(participant)
    .min(1)
    .max(20)
    .refine(
      (items) => new Set(items.map((item) => item.memberId)).size === items.length,
      "Учасники не мають повторюватися",
    ),
});

export const createMealEntriesSchema = z.object({
  params: z.object({}),
  query: z.object({ date: date.default(today) }),
  body: z.object({
    requestId: uuid,
    conflictPolicy: z.enum(["REJECT", "UPSERT_PARTICIPANTS"]).default("REJECT"),
    entries: z.array(batchEntry).min(1).max(50),
  }),
});

export const updateEntryPlacementSchema = z.object({
  params: z.object({ entryId: uuid }),
  query: z.object({}),
  body: z.object({ expectedRevision: revision, date, mealTypeId: uuid }),
});

export const updateParticipantSchema = z.object({
  params: z.object({ entryId: uuid, memberId: uuid }),
  query: z.object({}),
  body: z.object({ expectedRevision: revision, quantityGrams }),
});

export const setEntryPreparedSchema = z.object({
  params: z.object({ entryId: uuid }),
  query: z.object({}),
  body: z.object({ expectedRevision: revision, prepared: z.boolean() }),
});

export const deleteEntrySchema = z.object({
  params: z.object({ entryId: uuid }),
  query: z.object({ expectedRevision: revision }),
  body: z.unknown().optional(),
});

export const deleteParticipantSchema = z.object({
  params: z.object({ entryId: uuid, memberId: uuid }),
  query: z.object({ expectedRevision: revision }),
  body: z.unknown().optional(),
});
