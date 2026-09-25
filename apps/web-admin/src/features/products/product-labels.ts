import type {
  ProductFoodState,
  ProductMediaKind,
  ProductStatus,
  ProductType,
  ProductVerificationStatus,
} from "@/shared/api/products";

export const PRODUCT_TYPE_LABELS: Readonly<Record<ProductType, string>> = {
  GENERIC: "Базовий продукт",
  BRANDED: "Брендовий варіант",
};

export const PRODUCT_STATUS_LABELS: Readonly<Record<ProductStatus, string>> = {
  DRAFT: "Чернетка",
  ACTIVE: "Активний",
  ARCHIVED: "Архівований",
};

export const PRODUCT_VERIFICATION_STATUS_LABELS: Readonly<
  Record<ProductVerificationStatus, string>
> = {
  UNVERIFIED: "Не перевірено",
  VERIFIED: "Перевірено",
  REJECTED: "Відхилено",
};

export const PRODUCT_FOOD_STATE_LABELS: Readonly<Record<ProductFoodState, string>> = {
  UNSPECIFIED: "Не визначено",
  RAW: "Сирий",
  COOKED: "Приготований",
  PROCESSED: "Оброблений",
  READY_TO_EAT: "Готовий до споживання",
};

export const PRODUCT_MEDIA_KIND_LABELS: Readonly<Record<ProductMediaKind, string>> = {
  PRODUCT: "Продукт",
  PACKAGING: "Паковання",
  INGREDIENTS_LABEL: "Склад",
  NUTRITION_LABEL: "Харчова цінність",
  BARCODE: "Штрихкод",
  OTHER: "Інше",
};
