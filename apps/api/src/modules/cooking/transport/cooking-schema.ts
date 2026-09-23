import { z } from "zod";

const uuid = z.string().uuid();
const revision = z.number().int().min(0).max(2_147_483_647);
const grams = z.number().finite().positive().max(1_000_000);
const empty = z.object({});

export const startCookingSchema = z.object({
  params: empty,
  query: empty,
  body: z.object({
    requestId: uuid,
    mealEntries: z
      .array(z.object({ id: uuid, expectedRevision: revision }))
      .min(1)
      .max(31)
      .refine(
        (items) => new Set(items.map((item) => item.id)).size === items.length,
        "Meal entries must be unique",
      ),
  }),
});
export const readCookingSchema = z.object({
  params: z.object({ sessionId: uuid }),
  query: empty,
  body: z.unknown().optional(),
});
export const updateIngredientSchema = z.object({
  params: z.object({ sessionId: uuid, ingredientId: uuid }),
  query: empty,
  body: z
    .object({
      expectedRevision: revision,
      status: z.enum(["USED", "OMITTED", "SUBSTITUTED"]),
      productId: uuid.optional(),
      quantityGrams: grams.optional(),
    })
    .superRefine((value, context) => {
      if (value.status === "SUBSTITUTED" && !value.productId)
        context.addIssue({
          code: "custom",
          message: "Substitution product is required",
          path: ["productId"],
        });
      if (
        value.status !== "OMITTED" &&
        value.quantityGrams !== undefined &&
        value.quantityGrams <= 0
      )
        context.addIssue({
          code: "custom",
          message: "Quantity must be positive",
          path: ["quantityGrams"],
        });
    }),
});
export const addIngredientSchema = z.object({
  params: z.object({ sessionId: uuid }),
  query: empty,
  body: z.object({ expectedRevision: revision, productId: uuid, quantityGrams: grams }),
});
export const deleteIngredientSchema = z.object({
  params: z.object({ sessionId: uuid, ingredientId: uuid }),
  query: z.object({ expectedRevision: z.coerce.number().int().min(0) }),
  body: z.unknown().optional(),
});
export const updateStepSchema = z.object({
  params: z.object({ sessionId: uuid, stepId: uuid }),
  query: empty,
  body: z.object({ expectedRevision: revision, status: z.enum(["COMPLETED", "SKIPPED"]) }),
});
export const updateYieldSchema = z.object({
  params: z.object({ sessionId: uuid }),
  query: empty,
  body: z.discriminatedUnion("method", [
    z.object({ expectedRevision: revision, method: z.literal("DIRECT"), actualWeightG: grams }),
    z.object({
      expectedRevision: revision,
      method: z.literal("CONTAINER_DIFFERENCE"),
      tareWeightG: z.number().finite().min(0).max(1_000_000),
      grossWeightG: grams,
    }),
    z.object({ expectedRevision: revision, method: z.null() }),
  ]),
});
export const completeCookingSchema = z.object({
  params: z.object({ sessionId: uuid }),
  query: empty,
  body: z.object({ expectedRevision: revision, resolvePending: z.boolean().default(false) }),
});
export const cancelCookingSchema = z.object({
  params: z.object({ sessionId: uuid }),
  query: empty,
  body: z.object({ expectedRevision: revision }),
});
