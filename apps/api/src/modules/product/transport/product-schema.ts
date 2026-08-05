import { z } from "zod";

import {
  PRODUCT_MEDIA_ALLOWED_MIME_TYPES,
  PRODUCT_MEDIA_MAX_BYTES,
} from "../application/product-service.js";
import {
  NUTRIENT_VALUE_TYPES,
  PRODUCT_FOOD_STATES,
  PRODUCT_MEDIA_KINDS,
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
} from "../domain/product-repository.js";

const uuid = z.string().uuid();
const nullableText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();
const decimal = (minimum: number, maximum: number, scale: number) =>
  z
    .union([z.string(), z.number()])
    .transform(String)
    .refine((value) => /^\d+(?:\.\d+)?$/.test(value), "Must be a non-negative decimal")
    .refine((value) => Number(value) >= minimum && Number(value) <= maximum, {
      message: `Must be between ${minimum} and ${maximum}`,
    })
    .refine((value) => (value.split(".")[1]?.length ?? 0) <= scale, {
      message: `Must have no more than ${scale} decimal places`,
    });

const gtin = z
  .string()
  .trim()
  .regex(/^\d{8}$|^\d{12,14}$/, "GTIN must contain 8, 12, 13 or 14 digits")
  .transform((value) => value.padStart(14, "0"));

const nutrient = z.object({
  nutrientId: uuid,
  valuePer100g: decimal(0, 1_000_000_000, 8),
  valueType: z.enum(NUTRIENT_VALUE_TYPES).default("UNKNOWN"),
});

const portion = z.object({
  amount: decimal(0.0001, 1_000_000, 4),
  gramWeight: decimal(0.0001, 1_000_000, 4),
  labelEn: z.string().trim().min(1).max(200),
  labelUa: nullableText(200),
  kind: z
    .enum(["MASS", "VOLUME", "COUNT", "HOUSEHOLD", "PACKAGE", "SERVING", "OTHER"])
    .default("OTHER"),
  weightType: z
    .enum(["MEASURED", "CALCULATED", "ESTIMATED", "LABEL", "UNKNOWN"])
    .default("UNKNOWN"),
  measurementUnitId: uuid.nullable().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(-32_768).max(32_767).default(0),
});

const productFields = {
  nameEn: z.string().trim().min(1).max(240),
  nameUa: nullableText(240),
  gtin: gtin.nullable().optional(),
  categoryId: uuid.optional(),
  brandId: uuid.nullable().optional(),
  defaultMeasurementUnitId: uuid.optional(),
  baseProductId: uuid.nullable().optional(),
  foodState: z.enum(PRODUCT_FOOD_STATES).optional(),
  ediblePortionPercent: decimal(0, 100, 2).nullable().optional(),
  notes: nullableText(20_000),
  nutrients: z.array(nutrient).max(200).optional(),
  portions: z.array(portion).max(100).optional(),
} as const;

const createProductBody = z
  .object({
    type: z.enum(PRODUCT_TYPES),
    ...productFields,
    status: z.enum(PRODUCT_STATUSES).default("DRAFT"),
  })
  .superRefine((value, context) => {
    if (value.type === "GENERIC") {
      if (value.categoryId === undefined) addIssue(context, "categoryId", "Category is required");
      if (value.defaultMeasurementUnitId === undefined) {
        addIssue(context, "defaultMeasurementUnitId", "Measurement unit is required");
      }
      if (value.brandId || value.gtin || value.baseProductId) {
        addIssue(context, "type", "Generic products cannot have brand, GTIN or base product");
      }
    } else {
      if (!value.brandId) addIssue(context, "brandId", "Brand is required");
      if (!value.gtin) addIssue(context, "gtin", "GTIN is required");
      if (!value.baseProductId) addIssue(context, "baseProductId", "Generic base is required");
    }
  });

const updateProductBody = z.object({
  nameEn: productFields.nameEn.optional(),
  nameUa: productFields.nameUa,
  gtin: gtin.optional(),
  categoryId: uuid.optional(),
  brandId: uuid.optional(),
  defaultMeasurementUnitId: uuid.optional(),
  foodState: z.enum(PRODUCT_FOOD_STATES).optional(),
  ediblePortionPercent: productFields.ediblePortionPercent,
  notes: productFields.notes,
  nutrients: productFields.nutrients,
  portions: productFields.portions,
});

export const listProductsSchema = z.object({
  params: z.object({}),
  query: z.object({
    search: z.string().trim().min(1).max(120).optional(),
    type: z.enum(PRODUCT_TYPES).optional(),
    status: z.enum(PRODUCT_STATUSES).optional(),
    categoryId: uuid.optional(),
    brandId: uuid.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  body: z.unknown().optional(),
});

export const getProductSchema = envelopeWithId(z.unknown().optional());
export const createProductSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: createProductBody,
});
export const updateProductSchema = envelopeWithId(
  updateProductBody.refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required",
  ),
);
export const changeProductStatusSchema = envelopeWithId(
  z.object({ status: z.enum(PRODUCT_STATUSES) }),
);
export const reserveProductMediaSchema = envelopeWithId(
  z.object({
    kind: z.enum(PRODUCT_MEDIA_KINDS),
    mimeType: z.enum(PRODUCT_MEDIA_ALLOWED_MIME_TYPES),
    byteSize: z.number().int().min(1).max(PRODUCT_MEDIA_MAX_BYTES),
    altTextUa: nullableText(300),
    altTextEn: nullableText(300),
    isPrimary: z.boolean().default(false),
  }),
);
export const productMediaActionSchema = z.object({
  params: z.object({ id: uuid, mediaId: uuid }),
  query: z.object({}),
  body: z.unknown().optional(),
});

function envelopeWithId<TBody extends z.ZodType>(body: TBody) {
  return z.object({ params: z.object({ id: uuid }), query: z.object({}), body });
}

function addIssue(context: z.RefinementCtx, path: string, message: string): void {
  context.addIssue({ code: "custom", path: [path], message });
}
