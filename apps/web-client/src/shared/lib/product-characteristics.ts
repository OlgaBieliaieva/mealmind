export type ProductFoodState = "UNSPECIFIED" | "RAW" | "COOKED" | "PROCESSED" | "READY_TO_EAT";
export type ProductFoodCharacteristicKind =
  "PRESERVATION_STATE" | "COOKING_METHOD" | "PROCESSING_METHOD";

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
  foodState: string,
  characteristics: readonly {
    readonly kind: ProductFoodCharacteristicKind;
    readonly name: string;
  }[],
): string {
  const normalizedState = foodState.toUpperCase() as ProductFoodState;
  const names = [...characteristics]
    .sort((left, right) => KIND_ORDER[left.kind] - KIND_ORDER[right.kind])
    .map((item) => item.name);
  return [STATE_LABELS[normalizedState] ?? "", ...names].filter(Boolean).join(", ");
}

export function formatProductCharacteristicNames(
  foodState: string,
  names: readonly string[],
): string {
  const normalizedState = foodState.toUpperCase() as ProductFoodState;
  return [STATE_LABELS[normalizedState] ?? "", ...names].filter(Boolean).join(", ");
}
