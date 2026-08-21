import { getMeasurementUnitReference } from "../config/measurement-unit-reference.js";

import { resolveProductCategory } from "./resolve-product-category.js";

import { convertVolumePortionToMetric } from "./portion-volume-conversion.js";

import type {
  ImportReadyProduct,
  ImportReadyProductNutrient,
  ImportReadyProductPortion,
} from "./import-ready-types.js";

import type {
  ProductWithNormalizedPortions,
  NormalizedProductPortion,
} from "./portion-normalization-types.js";

function buildImportReadyNutrient(
  nutrient: ProductWithNormalizedPortions["nutrients"][number],
): ImportReadyProductNutrient {
  return {
    nutrientId: nutrient.nutrientId,

    nutrientCode: nutrient.nutrientCode,

    valuePer100g: nutrient.valuePer100g,

    valueType: nutrient.valueType,

    source: {
      usdaNutrientId: nutrient.usdaNutrientId,

      rowId: nutrient.sourceRowId,

      derivationExternalId: nutrient.sourceDerivationExternalId,

      dataPoints: nutrient.sourceDataPoints,
    },
  };
}

function buildCountPortion(portion: NormalizedProductPortion): ImportReadyProductPortion {
  return {
    amount: portion.amount,

    gramWeight: portion.gramWeight,

    labelEn: portion.labelEn,

    labelUa: null,

    kind: portion.kind,

    weightType: portion.weightType,

    measurementUnitId: null,

    measurementUnitCode: null,

    source: {
      rowId: portion.sourceRowId,

      sequence: portion.sourceSequence,

      measurementUnitExternalId: portion.sourceMeasurementUnitExternalId,

      measurementUnitName: portion.sourceMeasurementUnitName,

      modifier: portion.sourceModifier,

      portionDescription: portion.sourcePortionDescription,

      dataPoints: portion.sourceDataPoints,
    },
  };
}

function buildVolumePortion(portion: NormalizedProductPortion): ImportReadyProductPortion {
  const converted = convertVolumePortionToMetric(portion);

  const measurementUnit = getMeasurementUnitReference(converted.measurementUnitCode);

  return {
    amount: converted.amount,

    gramWeight: converted.gramWeight,

    labelEn: converted.labelEn,

    labelUa: null,

    kind: "VOLUME",

    weightType: portion.weightType,

    measurementUnitId: measurementUnit.id,

    measurementUnitCode: converted.measurementUnitCode,

    source: {
      rowId: portion.sourceRowId,

      sequence: portion.sourceSequence,

      measurementUnitExternalId: portion.sourceMeasurementUnitExternalId,

      measurementUnitName: portion.sourceMeasurementUnitName,

      modifier: portion.sourceModifier,

      portionDescription: portion.sourcePortionDescription,

      dataPoints: portion.sourceDataPoints,
    },
  };
}

function buildImportReadyPortion(portion: NormalizedProductPortion): ImportReadyProductPortion {
  switch (portion.kind) {
    case "COUNT":
      return buildCountPortion(portion);

    case "VOLUME":
      return buildVolumePortion(portion);

    case "MASS":
      throw new Error(
        `Unexpected normalized MASS portion "${portion.labelEn}" from USDA row ${portion.sourceRowId}.`,
      );

    case "OTHER":
      throw new Error(
        `Unexpected normalized OTHER portion "${portion.labelEn}" from USDA row ${portion.sourceRowId}.`,
      );
  }
}

export function buildImportReadyProduct(
  product: ProductWithNormalizedPortions,
): ImportReadyProduct {
  const category = resolveProductCategory({
    foodCategoryExternalId: product.foodCategoryExternalId,

    normalizedNameEn: product.normalizedNameEn,

    originalDescription: product.originalDescription,
  });

  const defaultMeasurementUnit = getMeasurementUnitReference("g");

  if (!product.foodCategoryExternalId) {
    throw new Error(`USDA product ${product.fdcId} has no food category external ID.`);
  }

  return {
    fdcId: product.fdcId,

    nameEn: product.normalizedNameEn,

    nameUa: null,

    categoryId: category.id,

    categoryCode: category.code,

    defaultMeasurementUnitId: defaultMeasurementUnit.id,

    defaultMeasurementUnitCode: "g",

    preparationMethod: product.preparationMethod,

    foodState: product.foodState,

    modifiersEn: [...product.modifiersEn],

    modifiersUa: [],

    unclassifiedParts: [...product.unclassifiedParts],

    nutrients: product.nutrients.map(buildImportReadyNutrient),

    portions: product.portions.map(buildImportReadyPortion),

    source: {
      provider: "USDA",

      fdcId: product.fdcId,

      dataset: product.dataset,

      dataType: product.dataType,

      originalDescription: product.originalDescription,

      foodCategoryExternalId: product.foodCategoryExternalId,

      publicationDate: product.publicationDate,

      ndbNumber: product.ndbNumber,
    },
  };
}
