import { z } from "zod";

export const emptySchema = z.object({}).strict();

export const noBodySchema = z.undefined().optional();

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(parsed.valueOf()) &&
      parsed.toISOString().slice(0, 10) === value &&
      parsed <= new Date()
    );
  }, "Date must be a valid date that is not in the future");

export const biologicalSexSchema = z.enum(["MALE", "FEMALE", "UNSPECIFIED"]);

export const allergySeveritySchema = z.enum(["UNKNOWN", "MILD", "MODERATE", "SEVERE"]);

export const activityLevelSchema = z.enum([
  "SEDENTARY",
  "LIGHT",
  "MODERATE",
  "ACTIVE",
  "VERY_ACTIVE",
]);

export const weightGoalTypeSchema = z.enum(["MAINTAIN", "LOSE", "GAIN"]);

export const weekStartsOnSchema = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

export const profileInputSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),

    lastName: z.string().trim().min(1).max(100).optional(),

    birthDate: dateSchema.optional(),

    biologicalSex: biologicalSexSchema.optional(),
  })
  .strict();

export const onboardingInputSchema = profileInputSchema
  .extend({
    heightCm: z.number().min(50).max(260).optional(),

    weightKg: z.number().min(15).max(500).optional(),

    activityLevel: activityLevelSchema.optional(),

    weightGoalType: weightGoalTypeSchema.optional(),
  })
  .strict();

export const profilePatchSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),

    lastName: z.string().trim().min(1).max(100).nullable().optional(),

    birthDate: dateSchema.nullable().optional(),

    biologicalSex: biologicalSexSchema.nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const familyPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),

    timeZone: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("uk-UA", {
            timeZone: value,
          });

          return true;
        } catch {
          return false;
        }
      }, "Time zone must be a valid IANA identifier")
      .optional(),

    weekStartsOn: weekStartsOnSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const memberParamsSchema = z
  .object({
    memberId: z.uuid(),
  })
  .strict();

export const accountInvitationInputSchema = z
  .object({
    recipientEmail: z.email().max(320),
  })
  .strict();

export const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export const accountInvitationTokenSchema = z
  .object({
    token: invitationTokenSchema,
  })
  .strict();

export const mealTypesInputSchema = z
  .object({
    mealTypeIds: z
      .array(z.uuid())
      .max(20)
      .refine((values) => new Set(values).size === values.length, "Meal type ids must be unique"),
  })
  .strict();

export const cuisinePreferencesInputSchema = z
  .object({
    cuisineIds: z
      .array(z.uuid())
      .max(100)
      .refine((values) => new Set(values).size === values.length, "Cuisine ids must be unique"),
  })
  .strict();

export const dislikedProductsInputSchema = z
  .object({
    productIds: z
      .array(z.uuid())
      .max(200)
      .refine((values) => new Set(values).size === values.length, "Product ids must be unique"),
  })
  .strict();

export const dietaryRestrictionsInputSchema = z
  .object({
    dietaryTagIds: z
      .array(z.uuid())
      .max(100)
      .refine((values) => new Set(values).size === values.length, "Dietary tag ids must be unique"),
  })
  .strict();

export const allergiesInputSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            allergenId: z.uuid(),
            severity: allergySeveritySchema,
          })
          .strict(),
      )
      .max(100)
      .refine(
        (items) => new Set(items.map((item) => item.allergenId)).size === items.length,
        "Allergen ids must be unique",
      ),
  })
  .strict();

export const bodyMeasurementInputSchema = z
  .object({
    heightCm: z.number().min(50).max(260).optional(),

    weightKg: z.number().min(15).max(500).optional(),

    measuredAt: z.iso
      .datetime({
        offset: true,
      })
      .refine(
        (value) => new Date(value) <= new Date(),
        "Measurement date must not be in the future",
      )
      .optional(),
  })
  .strict()
  .refine(
    (value) => value.heightCm !== undefined || value.weightKg !== undefined,
    "At least one body measurement value is required",
  );

export const activityPeriodInputSchema = z
  .object({
    activityLevel: activityLevelSchema,

    effectiveFrom: z.iso
      .datetime({
        offset: true,
      })
      .refine(
        (value) => new Date(value) <= new Date(),
        "Activity period start must not be in the future",
      )
      .optional(),
  })
  .strict();

export const nutrientTargetValueSchema = z.number().finite().nonnegative().max(1_000_000);

export const nutrientTargetsInputSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            nutrientId: z.uuid(),
            minimumValue: nutrientTargetValueSchema.nullable().optional(),
            targetValue: nutrientTargetValueSchema.nullable().optional(),
            maximumValue: nutrientTargetValueSchema.nullable().optional(),
          })
          .strict()
          .superRefine((value, context) => {
            const minimumValue = value.minimumValue ?? null;
            const targetValue = value.targetValue ?? null;
            const maximumValue = value.maximumValue ?? null;

            if (minimumValue === null && targetValue === null && maximumValue === null) {
              context.addIssue({
                code: "custom",
                message: "At least one nutrient target value is required",
              });
              return;
            }

            if (minimumValue !== null && targetValue !== null && minimumValue > targetValue) {
              context.addIssue({
                code: "custom",
                path: ["targetValue"],
                message: "Target value must not be lower than minimum value",
              });
            }

            if (targetValue !== null && maximumValue !== null && targetValue > maximumValue) {
              context.addIssue({
                code: "custom",
                path: ["targetValue"],
                message: "Target value must not be greater than maximum value",
              });
            }

            if (minimumValue !== null && maximumValue !== null && minimumValue > maximumValue) {
              context.addIssue({
                code: "custom",
                path: ["maximumValue"],
                message: "Maximum value must not be lower than minimum value",
              });
            }
          }),
      )
      .max(200)
      .refine(
        (items) => new Set(items.map((item) => item.nutrientId)).size === items.length,
        "Nutrient ids must be unique",
      ),
  })
  .strict();

export const weightGoalInputSchema = z
  .object({
    type: weightGoalTypeSchema,

    targetWeightKg: z.number().min(15).max(500).nullable().optional(),

    targetRateKgPerWeek: z.number().positive().max(5).nullable().optional(),

    targetDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),

    startsAt: z.iso
      .datetime({
        offset: true,
      })
      .refine(
        (value) => new Date(value) <= new Date(),
        "Weight goal start must not be in the future",
      )
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.targetDate === null || value.targetDate === undefined) {
      return;
    }

    const parsedTargetDate = new Date(`${value.targetDate}T00:00:00.000Z`);

    if (
      Number.isNaN(parsedTargetDate.valueOf()) ||
      parsedTargetDate.toISOString().slice(0, 10) !== value.targetDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["targetDate"],
        message: "Target date must be a valid calendar date",
      });

      return;
    }

    const startsAt = value.startsAt === undefined ? new Date() : new Date(value.startsAt);

    const startDate = new Date(
      Date.UTC(startsAt.getUTCFullYear(), startsAt.getUTCMonth(), startsAt.getUTCDate()),
    );

    if (parsedTargetDate < startDate) {
      context.addIssue({
        code: "custom",
        path: ["targetDate"],
        message: "Target date must not be earlier than the goal start",
      });
    }
  });

export function requestEnvelopeSchema<TBody extends z.ZodType>(
  body: TBody,
): z.ZodObject<{
  params: typeof emptySchema;
  query: typeof emptySchema;
  body: TBody;
}>;

export function requestEnvelopeSchema<TBody extends z.ZodType, TParams extends z.ZodType>(
  body: TBody,
  params: TParams,
): z.ZodObject<{
  params: TParams;
  query: typeof emptySchema;
  body: TBody;
}>;

export function requestEnvelopeSchema(body: z.ZodType, params: z.ZodType = emptySchema) {
  return z.object({
    params,
    query: emptySchema,
    body,
  });
}
