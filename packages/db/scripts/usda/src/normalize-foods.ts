import { normalizeDescription } from "./normalize-description.js";
import type {
  NormalizedFoodState,
  NormalizedProduct,
  NormalizedProductsDocument,
  SelectedFood,
  SelectedFoodsDocument,
} from "./types.js";

function assertSelectedFoodsDocument(value: SelectedFoodsDocument): void {
  if (value.schemaVersion !== 1) {
    throw new Error(`Unsupported selected-foods schema version: ${String(value.schemaVersion)}.`);
  }

  if (!Array.isArray(value.foods)) {
    throw new Error('Invalid selected-foods document: "foods" must be an array.');
  }
}

function compareNormalizedProducts(left: NormalizedProduct, right: NormalizedProduct): number {
  const nameComparison = left.normalizedNameEn.localeCompare(right.normalizedNameEn, "en", {
    sensitivity: "base",
  });

  if (nameComparison !== 0) {
    return nameComparison;
  }

  const methodComparison = left.preparationMethod.localeCompare(right.preparationMethod, "en");

  if (methodComparison !== 0) {
    return methodComparison;
  }

  return left.fdcId - right.fdcId;
}

function createNormalizedProduct(food: SelectedFood): NormalizedProduct {
  const normalized = normalizeDescription(food.description);

  return {
    fdcId: food.fdcId,
    dataset: food.dataset,
    dataType: food.dataType,

    originalDescription: food.description,
    normalizedNameEn: normalized.normalizedNameEn,

    preparationMethod: normalized.preparationMethod,
    foodState: normalized.foodState,
    preparationConfidence: normalized.preparationConfidence,

    modifiersEn: normalized.modifiersEn,
    unclassifiedParts: normalized.unclassifiedParts,

    foodCategoryExternalId: food.foodCategoryExternalId,
    publicationDate: food.publicationDate,
    ndbNumber: food.ndbNumber,
  };
}

function countFoodState(
  products: readonly NormalizedProduct[],
  state: NormalizedFoodState,
): number {
  return products.filter((product) => product.foodState === state).length;
}

export function normalizeFoods(selectedFoods: SelectedFoodsDocument): NormalizedProductsDocument {
  assertSelectedFoodsDocument(selectedFoods);

  const seenFdcIds = new Set<number>();

  const products = selectedFoods.foods.map((food) => {
    if (seenFdcIds.has(food.fdcId)) {
      throw new Error(`Duplicate FDC ID ${food.fdcId} in selected-foods document.`);
    }

    seenFdcIds.add(food.fdcId);

    return createNormalizedProduct(food);
  });

  products.sort(compareNormalizedProducts);

  return {
    schemaVersion: 1,
    sourceSchemaVersion: selectedFoods.schemaVersion,
    statistics: {
      inputFoodsTotal: selectedFoods.foods.length,
      normalizedFoodsTotal: products.length,

      rawFoods: countFoodState(products, "RAW"),
      cookedFoods: countFoodState(products, "COOKED"),
      processedFoods: countFoodState(products, "PROCESSED"),
      readyToEatFoods: countFoodState(products, "READY_TO_EAT"),
      unspecifiedFoods: countFoodState(products, "UNSPECIFIED"),

      foodsWithModifiers: products.filter((product) => product.modifiersEn.length > 0).length,

      foodsWithUnclassifiedParts: products.filter((product) => product.unclassifiedParts.length > 0)
        .length,
    },
    products,
  };
}
