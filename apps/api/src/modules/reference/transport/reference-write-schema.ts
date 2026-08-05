import { z } from "zod";

const code = (maximum: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maximum)
    .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, "Use lowercase snake_case");
const name = (maximum: number) => z.string().trim().min(1).max(maximum);
const nullableName = (maximum: number) => name(maximum).nullable();
const sortOrder = z.number().int().min(0).max(32_767);
const uuidOrNull = z.uuid().nullable();
const active = z.boolean().default(true);

const allergenCreate = z
  .object({
    code: code(64),
    nameUa: name(160),
    nameEn: name(160),
    isActive: active,
  })
  .strict();
const allergenUpdate = allergenCreate.omit({ code: true }).partial().strict();

const authorCreate = z
  .object({
    type: z.enum(["MEALMIND", "EXPERT", "BLOGGER", "USER"]),
    expertiseArea: z
      .enum(["CHEF", "PHYSICIAN", "DIETITIAN", "NUTRITIONIST", "OTHER"])
      .nullable()
      .optional(),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(180)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    displayName: name(160),
    bio: z.string().trim().min(1).max(5000).nullable().optional(),
    isActive: active,
  })
  .strict();
const authorUpdate = authorCreate.partial().strict();

const brandCreate = z
  .object({
    name: name(160),
    nameUa: nullableName(160).optional(),
    nameEn: nullableName(160).optional(),
    countryCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/)
      .nullable()
      .optional(),
    websiteUrl: z.url().max(2048).nullable().optional(),
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
    verificationStatus: z.enum(["UNVERIFIED", "VERIFIED", "REJECTED"]).default("UNVERIFIED"),
  })
  .strict();
const brandUpdate = brandCreate.partial().strict();

const cuisineCreate = z
  .object({
    code: code(64),
    nameUa: name(120),
    nameEn: name(120),
    scope: z.enum(["NATIONAL", "REGIONAL", "TRANSNATIONAL", "FUSION"]),
    isPreferenceSelectable: z.boolean().default(true),
    isActive: active,
    sortOrder,
  })
  .strict();
const cuisineUpdate = cuisineCreate.omit({ code: true }).partial().strict();

const dietaryTagCreate = z
  .object({
    code: code(64),
    nameUa: name(120),
    nameEn: name(120),
    kind: z.enum(["DIET_PATTERN", "FREE_FROM", "NUTRITION_PROFILE"]),
    isRestrictionSelectable: z.boolean().default(false),
    isActive: active,
    sortOrder,
  })
  .strict();
const dietaryTagUpdate = dietaryTagCreate.omit({ code: true }).partial().strict();

const mealTypeCreate = z
  .object({
    code: code(64),
    nameUa: name(120),
    nameEn: name(120),
    kind: z.enum(["MAIN_MEAL", "SNACK", "FLEXIBLE"]),
    isActive: active,
    sortOrder,
  })
  .strict();
const mealTypeUpdate = mealTypeCreate.omit({ code: true }).partial().strict();

const measurementUnitCreate = z
  .object({
    code: code(32),
    symbol: name(16),
    nameUa: name(80),
    nameEn: name(80),
    dimension: z.enum(["MASS", "VOLUME", "COUNT"]),
    factorToBaseUnit: z
      .string()
      .trim()
      .regex(/^\d+(?:\.\d{1,9})?$/)
      .refine((value) => Number(value) > 0, "Must be greater than zero"),
    isBaseUnit: z.boolean().default(false),
    isActive: active,
    sortOrder,
  })
  .strict();
const measurementUnitUpdate = measurementUnitCreate.omit({ code: true }).partial().strict();

const nutrientCreate = z
  .object({
    code: code(64),
    nameUa: name(160),
    nameEn: name(160),
    group: z.enum(["ENERGY", "MACRONUTRIENT", "FATTY_ACID", "VITAMIN", "MINERAL", "OTHER"]),
    unit: z.enum(["KCAL", "G", "MG", "MCG"]),
    displayLevel: z.enum(["BASIC", "EXTENDED"]).default("EXTENDED"),
    isTargetable: z.boolean().default(false),
    sortOrder: z.number().int().min(0),
    usdaNutrientId: z.number().int().positive().nullable().optional(),
    usdaNutrientNumber: z.string().trim().min(1).max(32).nullable().optional(),
    isActive: active,
  })
  .strict();
const nutrientUpdate = nutrientCreate.omit({ code: true }).partial().strict();

const productCategoryCreate = z
  .object({
    code: code(80),
    nameUa: name(160),
    nameEn: name(160),
    kind: z.enum(["GROUP", "INGREDIENT", "PREPARED_FOOD", "SOURCE_COLLECTION"]),
    parentCategoryId: uuidOrNull.default(null),
    isAssignable: z.boolean().default(true),
    isActive: active,
    sortOrder,
  })
  .strict();
const productCategoryUpdate = productCategoryCreate.omit({ code: true }).partial().strict();

const recipeTypeCreate = z
  .object({
    code: code(64),
    nameUa: name(120),
    nameEn: name(120),
    isActive: active,
    sortOrder,
  })
  .strict();
const recipeTypeUpdate = recipeTypeCreate.omit({ code: true }).partial().strict();

function createEnvelope<TResource extends string, TBody extends z.ZodType>(
  resource: TResource,
  body: TBody,
) {
  return z.object({
    params: z.object({ resource: z.literal(resource) }),
    query: z.object({}),
    body,
  });
}

function updateEnvelope<TResource extends string, TBody extends z.ZodType>(
  resource: TResource,
  body: TBody,
) {
  return z.object({
    params: z.object({ resource: z.literal(resource), id: z.uuid() }),
    query: z.object({}),
    body: body.refine(
      (value) => Object.keys(value as object).length > 0,
      "At least one field is required",
    ),
  });
}

export const createReferenceSchema = z.union([
  createEnvelope("allergens", allergenCreate),
  createEnvelope("authors", authorCreate),
  createEnvelope("brands", brandCreate),
  createEnvelope("cuisines", cuisineCreate),
  createEnvelope("dietary-tags", dietaryTagCreate),
  createEnvelope("meal-types", mealTypeCreate),
  createEnvelope("measurement-units", measurementUnitCreate),
  createEnvelope("nutrients", nutrientCreate),
  createEnvelope("product-categories", productCategoryCreate),
  createEnvelope("recipe-types", recipeTypeCreate),
]);

export const updateReferenceSchema = z.union([
  updateEnvelope("allergens", allergenUpdate),
  updateEnvelope("authors", authorUpdate),
  updateEnvelope("brands", brandUpdate),
  updateEnvelope("cuisines", cuisineUpdate),
  updateEnvelope("dietary-tags", dietaryTagUpdate),
  updateEnvelope("meal-types", mealTypeUpdate),
  updateEnvelope("measurement-units", measurementUnitUpdate),
  updateEnvelope("nutrients", nutrientUpdate),
  updateEnvelope("product-categories", productCategoryUpdate),
  updateEnvelope("recipe-types", recipeTypeUpdate),
]);
