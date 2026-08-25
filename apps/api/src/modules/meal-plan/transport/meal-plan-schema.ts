import { z } from "zod";

const today = () => new Date().toISOString().slice(0, 10);

export const mealPlanWeekSchema = z.object({
  params: z.object({}),
  query: z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => !Number.isNaN(Date.parse(value + "T00:00:00.000Z")), "Некоректна дата")
      .default(today),
  }),
  body: z.unknown().optional(),
});
