import { z } from "zod";

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const revision = z.coerce.number().int().positive().max(2_147_483_647);
const quantity = z.number().finite().positive().max(1_000_000);
const emptyQuery = z.object({});
const emptyBody = z.unknown().optional();

export const listShoppingListsSchema = z.object({
  params: z.object({}),
  query: emptyQuery,
  body: emptyBody,
});

export const readShoppingListSchema = z.object({
  params: z.object({ listId: uuid }),
  query: emptyQuery,
  body: emptyBody,
});

export const generateShoppingListSchema = z.object({
  params: z.object({}),
  query: emptyQuery,
  body: z.object({ mealPlanId: uuid, periodStart: date, periodEnd: date }),
});

export const listMutationSchema = z.object({
  params: z.object({ listId: uuid }),
  query: emptyQuery,
  body: z.object({ expectedRevision: revision }),
});

export const setShoppingListStatusSchema = z.object({
  params: z.object({ listId: uuid }),
  query: emptyQuery,
  body: z.object({
    expectedRevision: revision,
    status: z.enum(["OPEN", "COMPLETED", "ARCHIVED"]),
  }),
});

export const updateShoppingItemSchema = z.object({
  params: z.object({ listId: uuid, itemId: uuid }),
  query: emptyQuery,
  body: z
    .object({
      expectedRevision: revision,
      requestedQuantity: quantity.optional(),
      resetQuantity: z.boolean().optional(),
      notes: z.string().trim().max(1000).nullable().optional(),
    })
    .refine(
      (value) =>
        value.requestedQuantity !== undefined ||
        value.resetQuantity === true ||
        value.notes !== undefined,
      "Потрібно передати хоча б одну зміну",
    ),
});

export const setShoppingItemStatusSchema = z.object({
  params: z.object({ listId: uuid, itemId: uuid }),
  query: emptyQuery,
  body: z.object({
    expectedRevision: revision,
    status: z.enum(["PENDING", "PURCHASED", "REMOVED"]),
  }),
});

export const addCatalogShoppingItemSchema = z.object({
  params: z.object({ listId: uuid }),
  query: emptyQuery,
  body: z.object({
    expectedRevision: revision,
    productId: uuid,
    quantity,
  }),
});

export const addCustomShoppingItemSchema = z.object({
  params: z.object({ listId: uuid }),
  query: emptyQuery,
  body: z
    .object({
      expectedRevision: revision,
      name: z.string().trim().min(1).max(240),
      quantity: quantity.optional(),
      measurementUnitId: uuid.optional(),
      notes: z.string().trim().min(1).max(1000).optional(),
    })
    .refine(
      (value) => (value.quantity === undefined) === (value.measurementUnitId === undefined),
      "Кількість та одиницю вимірювання потрібно вказувати разом",
    ),
});
