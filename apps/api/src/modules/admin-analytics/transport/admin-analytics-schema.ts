import { z } from "zod";

import { ANALYTICS_GRANULARITIES } from "../domain/admin-analytics-types.js";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const usersAnalyticsSchema = z
  .object({
    params: z.object({}),
    query: z.object({
      from: date.optional(),
      to: date.optional(),
      granularity: z.enum(ANALYTICS_GRANULARITIES).optional(),
      timezone: z
        .string()
        .trim()
        .min(1)
        .max(64)
        .refine(isValidTimezone, "Expected a valid IANA timezone")
        .optional(),
    }),
    body: z.unknown().optional(),
  })
  .superRefine(({ query }, context) => {
    if ((query.from === undefined) !== (query.to === undefined)) {
      context.addIssue({
        code: "custom",
        path: ["query", query.from === undefined ? "from" : "to"],
        message: "from and to must be provided together",
      });
    }
    if (query.from !== undefined && query.to !== undefined) {
      const from = validDate(query.from);
      const to = validDate(query.to);
      if (!from || !to || query.from > query.to) {
        context.addIssue({
          code: "custom",
          path: ["query", "from"],
          message: "from must be a valid date not later than to",
        });
      } else if ((to.getTime() - from.getTime()) / 86_400_000 + 1 > 732) {
        context.addIssue({
          code: "custom",
          path: ["query", "to"],
          message: "Analytics period must not exceed 24 months",
        });
      }
    }
  });

export const referencesAnalyticsSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.unknown().optional(),
});

export const productsAnalyticsSchema = usersAnalyticsSchema;
export const recipesAnalyticsSchema = usersAnalyticsSchema;
export const overviewAnalyticsSchema = usersAnalyticsSchema;

function validDate(value: string): Date | null {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? null
    : parsed;
}

function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
