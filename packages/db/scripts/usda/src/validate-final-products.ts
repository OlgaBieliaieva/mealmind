import { readJsonFile } from "./read-json.js";

import { USDA_PATHS } from "./paths.js";

import type { FinalProductsDocument } from "./final-product-types.js";

export interface FinalProductsValidationResult {
  readonly productsTotal: number;

  readonly distinctFdcIds: number;

  readonly nutrientValuesTotal: number;

  readonly portionsTotal: number;

  readonly productsWithoutNameEn: number;

  readonly productsWithoutNameUa: number;

  readonly productsWithoutEnergy: number;

  readonly invalidModifierTranslations: number;

  readonly invalidPortionTranslations: number;

  readonly invalidNutrientValues: number;

  readonly invalidPortionValues: number;

  readonly statisticsProblems: number;
}

export function validateFinalProducts(
  document: FinalProductsDocument,
): FinalProductsValidationResult {
  if (document.schemaVersion !== 1) {
    throw new Error(
      `Unsupported final products schema version: ${String(document.schemaVersion)}.`,
    );
  }

  const fdcIds = new Set<number>();

  let nutrientValuesTotal = 0;

  let portionsTotal = 0;

  let productsWithoutNameEn = 0;

  let productsWithoutNameUa = 0;

  let productsWithoutEnergy = 0;

  let invalidModifierTranslations = 0;

  let invalidPortionTranslations = 0;

  let invalidNutrientValues = 0;

  let invalidPortionValues = 0;

  for (const product of document.products) {
    if (fdcIds.has(product.fdcId)) {
      throw new Error(`Duplicate FDC ID ${product.fdcId} in final dataset.`);
    }

    fdcIds.add(product.fdcId);

    if (product.nameEn.trim() === "") {
      productsWithoutNameEn += 1;
    }

    if (product.nameUa.trim() === "") {
      productsWithoutNameUa += 1;
    }

    if (product.modifiersEn.length !== product.modifiersUa.length) {
      invalidModifierTranslations += Math.abs(
        product.modifiersEn.length - product.modifiersUa.length,
      );
    }

    for (const modifierUa of product.modifiersUa) {
      if (modifierUa.trim() === "") {
        invalidModifierTranslations += 1;
      }
    }

    const hasEnergy = product.nutrients.some((nutrient) => nutrient.nutrientCode === "energy_kcal");

    if (!hasEnergy) {
      productsWithoutEnergy += 1;
    }

    nutrientValuesTotal += product.nutrients.length;

    for (const nutrient of product.nutrients) {
      if (!Number.isFinite(nutrient.valuePer100g) || nutrient.valuePer100g < 0) {
        invalidNutrientValues += 1;
      }
    }

    portionsTotal += product.portions.length;

    for (const portion of product.portions) {
      if (portion.labelUa.trim() === "") {
        invalidPortionTranslations += 1;
      }

      if (
        !Number.isFinite(portion.amount) ||
        portion.amount <= 0 ||
        !Number.isFinite(portion.gramWeight) ||
        portion.gramWeight <= 0
      ) {
        invalidPortionValues += 1;
      }
    }
  }

  let statisticsProblems = 0;

  const statistics = document.statistics;

  if (statistics.outputProductsTotal !== document.products.length) {
    statisticsProblems += 1;
  }

  if (statistics.translatedProducts !== document.products.length) {
    statisticsProblems += 1;
  }

  if (statistics.untranslatedProducts !== 0) {
    statisticsProblems += 1;
  }

  if (statistics.nutrientValuesTotal !== nutrientValuesTotal) {
    statisticsProblems += 1;
  }

  if (statistics.portionsTotal !== portionsTotal) {
    statisticsProblems += 1;
  }

  if (statistics.untranslatedModifiers !== 0) {
    statisticsProblems += 1;
  }

  if (statistics.untranslatedPortions !== 0) {
    statisticsProblems += 1;
  }

  return {
    productsTotal: document.products.length,

    distinctFdcIds: fdcIds.size,

    nutrientValuesTotal,

    portionsTotal,

    productsWithoutNameEn,

    productsWithoutNameUa,

    productsWithoutEnergy,

    invalidModifierTranslations,

    invalidPortionTranslations,

    invalidNutrientValues,

    invalidPortionValues,

    statisticsProblems,
  };
}

export async function runFinalProductsValidation(): Promise<void> {
  console.info("Validating final USDA product dataset...\n");

  console.info(`Input: ${USDA_PATHS.finalProductsFile}`);

  const document = await readJsonFile<FinalProductsDocument>(USDA_PATHS.finalProductsFile);

  const result = validateFinalProducts(document);

  console.info("\n=== FINAL USDA DATASET AUDIT ===\n");

  console.info(`Products:                     ${result.productsTotal}`);

  console.info(`Distinct FDC IDs:             ${result.distinctFdcIds}`);

  console.info(`Nutrient values:              ${result.nutrientValuesTotal}`);

  console.info(`Portions:                     ${result.portionsTotal}`);

  console.info(`Missing English names:        ${result.productsWithoutNameEn}`);

  console.info(`Missing Ukrainian names:      ${result.productsWithoutNameUa}`);

  console.info(`Products without energy:      ${result.productsWithoutEnergy}`);

  console.info(`Invalid modifier translations:${result.invalidModifierTranslations}`);

  console.info(`Invalid portion translations: ${result.invalidPortionTranslations}`);

  console.info(`Invalid nutrient values:      ${result.invalidNutrientValues}`);

  console.info(`Invalid portion values:       ${result.invalidPortionValues}`);

  console.info(`Statistics problems:          ${result.statisticsProblems}`);

  const problems =
    result.productsWithoutNameEn +
    result.productsWithoutNameUa +
    result.productsWithoutEnergy +
    result.invalidModifierTranslations +
    result.invalidPortionTranslations +
    result.invalidNutrientValues +
    result.invalidPortionValues +
    result.statisticsProblems;

  if (result.productsTotal !== result.distinctFdcIds) {
    throw new Error("Final USDA dataset contains duplicate FDC IDs.");
  }

  if (problems > 0) {
    throw new Error(`Final USDA dataset validation failed with ${problems} problem(s).`);
  }

  console.info("\nFinal USDA dataset validation completed successfully.");
}
