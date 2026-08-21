import type { ImportReadyProductsDocument } from "../import-ready-types.js";

import type { ProductNameTranslationsDocument } from "../product-name-translation-types.js";

export function buildImportReady(): ImportReadyProductsDocument {
  return {
    schemaVersion: 1,

    sourceSchemaVersion: 1,

    statistics: {
      inputProductsTotal: 1,
      outputProductsTotal: 1,
      nutrientValuesTotal: 1,
      portionsTotal: 1,
      productsWithPortions: 1,
      productsWithoutPortions: 0,
      translatedProducts: 0,
      untranslatedProducts: 1,
    },

    products: [
      {
        fdcId: 1,

        nameEn: "Turnips",

        nameUa: null,

        categoryId: "category-id",

        categoryCode: "root_vegetables",

        defaultMeasurementUnitId: "grams-id",

        defaultMeasurementUnitCode: "g",

        preparationMethod: "BOILED",

        foodState: "COOKED",

        modifiersEn: ["with salt"],

        modifiersUa: [],

        unclassifiedParts: [],

        nutrients: [
          {
            nutrientId: "energy-id",

            nutrientCode: "energy_kcal",

            valuePer100g: 22,

            valueType: "UNKNOWN",

            source: {
              usdaNutrientId: 1008,

              rowId: "1",

              derivationExternalId: null,

              dataPoints: null,
            },
          },
        ],

        portions: [
          {
            amount: 1,

            gramWeight: 100,

            labelEn: "medium",

            labelUa: null,

            kind: "COUNT",

            weightType: "UNKNOWN",

            measurementUnitId: null,

            measurementUnitCode: null,

            source: {
              rowId: "1",

              sequence: 1,

              measurementUnitExternalId: null,

              measurementUnitName: null,

              modifier: "medium",

              portionDescription: null,

              dataPoints: null,
            },
          },
        ],

        source: {
          provider: "USDA",

          fdcId: 1,

          dataset: "SR_LEGACY",

          dataType: "sr_legacy_food",

          originalDescription: "Turnips, cooked, boiled, with salt",

          foodCategoryExternalId: "11",

          publicationDate: null,

          ndbNumber: null,
        },
      },
    ],
  };
}

export function buildTranslations(): ProductNameTranslationsDocument {
  return {
    schemaVersion: 1,

    sourceSchemaVersion: 1,

    statistics: {
      translationItemsTotal: 1,

      translatedItemsTotal: 1,
    },

    translations: [
      {
        key: "Turnips::root_vegetables::BOILED::COOKED::with salt",

        nameUa: "Ріпа — після відварювання; із сіллю",
      },
    ],
  };
}
