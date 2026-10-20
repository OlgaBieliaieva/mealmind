import { z } from "zod";

import type { ProductDetails, ProductUpdate, ProductWrite } from "@/shared/api/products";

const decimalText = (maximum: number) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d+(?:\.\d+)?$/.test(value), "Введіть додатне число")
    .refine(
      (value) => value === "" || Number(value) <= maximum,
      `Максимальне значення — ${maximum}`,
    );
const signedDecimalText = (minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || /^-?\d+(?:\.\d+)?$/.test(value), "Введіть число")
    .refine(
      (value) => value === "" || (Number(value) >= minimum && Number(value) <= maximum),
      `Значення має бути від ${minimum} до ${maximum}`,
    );

const ingredientStatement = z.object({
  locale: z.string().trim().min(2, "Вкажіть локаль").max(16),
  statement: z.string().trim().min(1, "Вкажіть склад").max(20_000),
});

const shelfLifeRule = z
  .object({
    rawShelfLife: z.string().trim().max(2_000),
    rawTemperatureRange: z.string().trim().max(2_000),
    durationValue: decimalText(1_000_000),
    durationUnit: z.enum(["", "HOURS", "DAYS", "MONTHS", "YEARS"]),
    minTemperatureC: signedDecimalText(-273.15, 1_000),
    maxTemperatureC: signedDecimalText(-273.15, 1_000),
  })
  .superRefine((value, context) => {
    if ((value.durationValue === "") !== (value.durationUnit === "")) {
      issue(context, "durationValue", "Тривалість і одиниця мають бути вказані разом");
    }
    if (
      value.minTemperatureC !== "" &&
      value.maxTemperatureC !== "" &&
      Number(value.minTemperatureC) > Number(value.maxTemperatureC)
    ) {
      issue(context, "maxTemperatureC", "Максимальна температура не може бути нижчою");
    }
    if (
      value.rawShelfLife === "" &&
      value.rawTemperatureRange === "" &&
      value.durationValue === "" &&
      value.minTemperatureC === "" &&
      value.maxTemperatureC === ""
    ) {
      issue(context, "rawShelfLife", "Заповніть хоча б одне значення");
    }
  });

export const productFormSchema = z
  .object({
    type: z.enum(["GENERIC", "BRANDED"]),
    nameEn: z.string().trim().min(1, "Вкажіть англійську назву").max(240),
    nameUa: z.string().trim().max(240),
    gtin: z.string().trim(),
    categoryId: z.string().uuid("Оберіть категорію"),
    brandId: z.string(),
    defaultMeasurementUnitId: z.string().uuid("Оберіть одиницю"),
    baseProductId: z.string(),
    foodState: z.enum(["UNSPECIFIED", "RAW", "COOKED", "PROCESSED", "READY_TO_EAT"]),
    characteristicIds: z.array(z.string().uuid()).max(50),
    verificationStatus: z.enum(["UNVERIFIED", "VERIFIED", "REJECTED"]),
    ediblePortionPercent: decimalText(100),
    notes: z.string().max(20_000),
    nutrients: z.array(
      z.object({
        nutrientId: z.string().uuid("Оберіть нутрієнт"),
        valuePer100g: decimalText(1_000_000_000).refine(
          (value) => value !== "",
          "Вкажіть значення",
        ),
        valueType: z.enum(["ANALYTICAL", "DERIVED", "ESTIMATED", "CALCULATED", "LABEL", "UNKNOWN"]),
      }),
    ),
    portions: z.array(
      z.object({
        productPackageId: z.union([z.literal(""), z.string().uuid()]),
        amount: decimalText(1_000_000).refine((value) => value !== "", "Вкажіть кількість"),
        gramWeight: decimalText(1_000_000).refine((value) => value !== "", "Вкажіть вагу"),
        labelEn: z.string().trim().min(1, "Вкажіть назву порції").max(200),
        labelUa: z.string().trim().max(200),
        kind: z.enum(["MASS", "VOLUME", "COUNT", "HOUSEHOLD", "PACKAGE", "SERVING", "OTHER"]),
        weightType: z.enum(["MEASURED", "CALCULATED", "ESTIMATED", "LABEL", "UNKNOWN"]),
        measurementUnitId: z.string(),
        isDefault: z.boolean(),
      }),
    ),
    packages: z.array(
      z
        .object({
          id: z.string(),
          gtin: z.string().trim(),
          kind: z.enum([
            "UNSPECIFIED",
            "FIXED_MASS",
            "FIXED_VOLUME",
            "FIXED_MASS_AND_VOLUME",
            "FIXED_COUNT",
          ]),
          weightG: decimalText(100_000_000),
          volumeMl: decimalText(100_000_000),
          itemCount: z
            .string()
            .trim()
            .refine(
              (value) => value === "" || (/^\d+$/.test(value) && Number(value) > 0),
              "Вкажіть цілу кількість",
            ),
          labelUa: z.string().trim().max(200),
          labelEn: z.string().trim().max(200),
          isDefault: z.boolean(),
          status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
          ingredientStatements: z.array(ingredientStatement).max(10),
          shelfLifeRules: z.array(shelfLifeRule).max(20),
          sourceIngredientStatements: z.array(ingredientStatement),
          sourceShelfLifeRules: z.array(shelfLifeRule),
        })
        .superRefine((value, context) => {
          if (
            (value.kind === "FIXED_MASS" || value.kind === "FIXED_MASS_AND_VOLUME") &&
            value.weightG === ""
          ) {
            issue(context, "weightG", "Вкажіть вагу пакування");
          }
          if (
            (value.kind === "FIXED_VOLUME" || value.kind === "FIXED_MASS_AND_VOLUME") &&
            value.volumeMl === ""
          ) {
            issue(context, "volumeMl", "Вкажіть об’єм пакування");
          }
          if (value.kind === "FIXED_COUNT" && value.itemCount === "") {
            issue(context, "itemCount", "Вкажіть кількість одиниць");
          }
          if (value.gtin !== "" && !/^\d{8}$|^\d{12,14}$/.test(value.gtin)) {
            issue(context, "gtin", "GTIN має містити 8, 12, 13 або 14 цифр");
          }
        }),
    ),
    dietaryTagIds: z.array(z.string().uuid()).max(100),
    allergens: z.array(
      z.object({
        allergenId: z.string().uuid("Оберіть алерген"),
        declaration: z.enum(["CONTAINS", "MAY_CONTAIN", "SHARED_FACILITY"]),
        evidenceNote: z.string().trim().max(2_000),
      }),
    ),
    dietaryTagSuggestions: z.array(z.object({ id: z.string(), name: z.string() })),
    allergenSuggestions: z.array(z.object({ id: z.string(), name: z.string() })),
  })
  .superRefine((value, context) => {
    if (value.type === "BRANDED") {
      if (value.brandId === "") issue(context, "brandId", "Оберіть бренд");
      if (value.gtin !== "" && !/^\d{8}$|^\d{12,14}$/.test(value.gtin)) {
        issue(context, "gtin", "GTIN має містити 8, 12, 13 або 14 цифр");
      }
    }
  });

export type ProductFormValues = z.input<typeof productFormSchema>;

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  type: "GENERIC",
  nameEn: "",
  nameUa: "",
  gtin: "",
  categoryId: "",
  brandId: "",
  defaultMeasurementUnitId: "",
  baseProductId: "",
  foodState: "UNSPECIFIED",
  characteristicIds: [],
  verificationStatus: "UNVERIFIED",
  ediblePortionPercent: "",
  notes: "",
  nutrients: [],
  portions: [],
  packages: [],
  dietaryTagIds: [],
  allergens: [],
  dietaryTagSuggestions: [],
  allergenSuggestions: [],
};

export function mapProductFormToCreate(values: ProductFormValues): ProductWrite {
  const common = mapCommon(values);

  return values.type === "GENERIC"
    ? { ...common, type: "GENERIC" }
    : {
        ...common,
        type: "BRANDED",
        brandId: values.brandId,
        baseProductId: values.baseProductId === "" ? null : values.baseProductId,
        gtin: values.gtin === "" ? null : values.gtin,
      };
}

export function mapProductFormToUpdate(values: ProductFormValues): ProductUpdate {
  const common = mapCommon(values);
  return values.type === "BRANDED"
    ? {
        ...common,
        brandId: values.brandId,
        packages: values.packages.map((item) => ({
          ...(item.id === "" ? {} : { id: item.id }),
          gtin: item.gtin === "" ? null : item.gtin,
          kind: item.kind,
          weightG: item.weightG === "" ? null : item.weightG,
          volumeMl: item.volumeMl === "" ? null : item.volumeMl,
          itemCount: item.itemCount === "" ? null : Number(item.itemCount),
          labelUa: item.labelUa === "" ? null : item.labelUa,
          labelEn: item.labelEn === "" ? null : item.labelEn,
          isDefault: item.isDefault,
          status: item.status,
          ingredientStatements: item.ingredientStatements,
          shelfLifeRules: item.shelfLifeRules.map((rule, sortOrder) => ({
            rawShelfLife: rule.rawShelfLife === "" ? null : rule.rawShelfLife,
            rawTemperatureRange: rule.rawTemperatureRange === "" ? null : rule.rawTemperatureRange,
            durationValue: rule.durationValue === "" ? null : rule.durationValue,
            durationUnit: rule.durationUnit === "" ? null : rule.durationUnit,
            minTemperatureC: rule.minTemperatureC === "" ? null : rule.minTemperatureC,
            maxTemperatureC: rule.maxTemperatureC === "" ? null : rule.maxTemperatureC,
            sortOrder,
          })),
        })),
        dietaryTags: values.dietaryTagIds.map((dietaryTagId) => ({
          dietaryTagId,
          evidenceNote: null,
        })),
        allergens: values.allergens.map((item) => ({
          allergenId: item.allergenId,
          declaration: item.declaration,
          evidenceNote: item.evidenceNote === "" ? null : item.evidenceNote,
        })),
      }
    : common;
}

export function mapProductToForm(product: ProductDetails): ProductFormValues {
  return {
    type: product.type,
    nameEn: product.nameEn,
    nameUa: product.nameUa ?? "",
    gtin: product.gtin ?? "",
    categoryId: product.categoryId,
    brandId: product.brandId ?? "",
    defaultMeasurementUnitId: product.defaultMeasurementUnitId,
    baseProductId: product.baseProductId ?? "",
    foodState: product.foodState,
    characteristicIds: product.foodCharacteristics.map((characteristic) => characteristic.id),
    verificationStatus: product.verificationStatus,
    ediblePortionPercent: product.ediblePortionPercent ?? "",
    notes: product.notes ?? "",
    nutrients: product.ownNutrients.map((nutrient) => ({
      nutrientId: nutrient.nutrientId,
      valuePer100g: nutrient.valuePer100g,
      valueType: nutrient.valueType as ProductFormValues["nutrients"][number]["valueType"],
    })),
    portions: product.portions.map((portion) => ({
      productPackageId: portion.productPackageId ?? "",
      amount: portion.amount,
      gramWeight: portion.gramWeight,
      labelEn: portion.labelEn,
      labelUa: portion.labelUa ?? "",
      kind: portion.kind as ProductFormValues["portions"][number]["kind"],
      weightType: portion.weightType as ProductFormValues["portions"][number]["weightType"],
      measurementUnitId: portion.measurementUnitId ?? "",
      isDefault: portion.isDefault,
    })),
    packages: product.packages.map((item) => ({
      id: item.id,
      gtin: item.gtin ?? "",
      kind: item.kind,
      weightG: item.weightG ?? "",
      volumeMl: item.volumeMl ?? "",
      itemCount: item.itemCount?.toString() ?? "",
      labelUa: item.labelUa ?? "",
      labelEn: item.labelEn ?? "",
      isDefault: item.isDefault,
      status: item.status,
      ingredientStatements: item.ingredientStatements
        .filter((statement) => statement.source === "MANUAL")
        .map((statement) => ({ locale: statement.locale, statement: statement.statement })),
      sourceIngredientStatements: item.ingredientStatements
        .filter((statement) => statement.source === "SOURCE")
        .map((statement) => ({ locale: statement.locale, statement: statement.statement })),
      shelfLifeRules: item.shelfLifeRules
        .filter((rule) => rule.source === "MANUAL")
        .map(mapShelfLifeRuleToForm),
      sourceShelfLifeRules: item.shelfLifeRules
        .filter((rule) => rule.source === "SOURCE")
        .map(mapShelfLifeRuleToForm),
    })),
    dietaryTagIds: product.dietaryTags
      .filter((item) => item.status === "VERIFIED")
      .map((item) => item.dietaryTagId),
    allergens: product.allergens
      .filter((item) => item.status === "VERIFIED")
      .map((item) => ({
        allergenId: item.allergenId,
        declaration: item.declaration,
        evidenceNote: item.evidenceNote ?? "",
      })),
    dietaryTagSuggestions: product.dietaryTags
      .filter((item) => item.status === "PROPOSED")
      .map((item) => ({ id: item.dietaryTagId, name: item.nameUa })),
    allergenSuggestions: product.allergens
      .filter((item) => item.status === "PROPOSED")
      .map((item) => ({ id: item.allergenId, name: item.nameUa })),
  };
}

function mapShelfLifeRuleToForm(
  rule: ProductDetails["packages"][number]["shelfLifeRules"][number],
) {
  return {
    rawShelfLife: rule.rawShelfLife ?? "",
    rawTemperatureRange: rule.rawTemperatureRange ?? "",
    durationValue: rule.durationValue ?? "",
    durationUnit: rule.durationUnit ?? "",
    minTemperatureC: rule.minTemperatureC ?? "",
    maxTemperatureC: rule.maxTemperatureC ?? "",
  } as const;
}

function mapCommon(values: ProductFormValues): Omit<ProductWrite, "type"> {
  return {
    nameEn: values.nameEn,
    nameUa: values.nameUa === "" ? null : values.nameUa,
    categoryId: values.categoryId,
    defaultMeasurementUnitId: values.defaultMeasurementUnitId,
    foodState: values.foodState,
    characteristicIds: values.characteristicIds,
    verificationStatus: values.verificationStatus,
    ediblePortionPercent: values.ediblePortionPercent === "" ? null : values.ediblePortionPercent,
    notes: values.notes === "" ? null : values.notes,
    nutrients: values.nutrients,
    portions: values.portions.map((portion, index) => ({
      ...portion,
      productPackageId: portion.productPackageId === "" ? null : portion.productPackageId,
      labelUa: portion.labelUa === "" ? null : portion.labelUa,
      measurementUnitId: portion.measurementUnitId === "" ? null : portion.measurementUnitId,
      isActive: true,
      sortOrder: index,
    })),
  };
}

function issue(context: z.RefinementCtx, path: string, message: string): void {
  context.addIssue({ code: "custom", path: [path], message });
}
