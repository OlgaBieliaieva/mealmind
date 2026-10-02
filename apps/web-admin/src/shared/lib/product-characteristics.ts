import type {
  ProductFoodCharacteristic,
  ProductFoodCharacteristicKind,
  ProductFoodState,
} from "@/shared/api/products";

const STATE_LABELS: Readonly<Record<ProductFoodState, string>> = {
  UNSPECIFIED: "",
  RAW: "Сирий",
  COOKED: "Приготований",
  PROCESSED: "Оброблений",
  READY_TO_EAT: "Готовий до споживання",
};

const KIND_ORDER: Readonly<Record<ProductFoodCharacteristicKind, number>> = {
  PRESERVATION_STATE: 0,
  COOKING_METHOD: 1,
  PROCESSING_METHOD: 2,
};

export function formatProductCharacteristics(
  foodState: ProductFoodState,
  characteristics: readonly Pick<ProductFoodCharacteristic, "kind" | "nameUa">[],
): string {
  const names = [...characteristics]
    .sort((left, right) => KIND_ORDER[left.kind] - KIND_ORDER[right.kind])
    .map((item) => item.nameUa);
  return [STATE_LABELS[foodState], ...names].filter(Boolean).join(", ");
}
