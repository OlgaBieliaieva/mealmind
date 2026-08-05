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
  })
  .superRefine((value, context) => {
    if (value.type === "BRANDED") {
      if (value.brandId === "") issue(context, "brandId", "Оберіть бренд");
      if (value.baseProductId === "") issue(context, "baseProductId", "Оберіть базовий продукт");
      if (!/^\d{8}$|^\d{12,14}$/.test(value.gtin)) {
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
  ediblePortionPercent: "",
  notes: "",
  nutrients: [],
  portions: [],
};

export function mapProductFormToCreate(values: ProductFormValues): ProductWrite {
  const common = mapCommon(values);

  return values.type === "GENERIC"
    ? { ...common, type: "GENERIC" }
    : {
        ...common,
        type: "BRANDED",
        brandId: values.brandId,
        baseProductId: values.baseProductId,
        gtin: values.gtin,
      };
}

export function mapProductFormToUpdate(values: ProductFormValues): ProductUpdate {
  const common = mapCommon(values);
  return values.type === "BRANDED"
    ? { ...common, brandId: values.brandId, gtin: values.gtin }
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
    ediblePortionPercent: product.ediblePortionPercent ?? "",
    notes: product.notes ?? "",
    nutrients: product.nutrients.map((nutrient) => ({
      nutrientId: nutrient.nutrientId,
      valuePer100g: nutrient.valuePer100g,
      valueType: nutrient.valueType as ProductFormValues["nutrients"][number]["valueType"],
    })),
    portions: product.portions.map((portion) => ({
      amount: portion.amount,
      gramWeight: portion.gramWeight,
      labelEn: portion.labelEn,
      labelUa: portion.labelUa ?? "",
      kind: portion.kind as ProductFormValues["portions"][number]["kind"],
      weightType: portion.weightType as ProductFormValues["portions"][number]["weightType"],
      measurementUnitId: portion.measurementUnitId ?? "",
      isDefault: portion.isDefault,
    })),
  };
}

function mapCommon(values: ProductFormValues): Omit<ProductWrite, "type"> {
  return {
    nameEn: values.nameEn,
    nameUa: values.nameUa === "" ? null : values.nameUa,
    categoryId: values.categoryId,
    defaultMeasurementUnitId: values.defaultMeasurementUnitId,
    foodState: values.foodState,
    ediblePortionPercent: values.ediblePortionPercent === "" ? null : values.ediblePortionPercent,
    notes: values.notes === "" ? null : values.notes,
    nutrients: values.nutrients,
    portions: values.portions.map((portion, index) => ({
      ...portion,
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
