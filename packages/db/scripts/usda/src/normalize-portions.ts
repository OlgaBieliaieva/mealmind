import { normalizePortion } from "./normalize-portion.js";

import type { ExtractedPortionsDocument } from "./portion-types.js";

import type {
  ExcludedProductPortion,
  NormalizedPortionsDocument,
  NormalizedProductPortion,
} from "./portion-normalization-types.js";

interface NormalizePortionsInput {
  readonly extracted: ExtractedPortionsDocument;
}

function normalizeSemanticText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function buildSemanticKey(portion: NormalizedProductPortion): string {
  return [
    portion.amount,
    portion.gramWeight,
    portion.kind,
    portion.measurementUnitCode ?? "",
    normalizeSemanticText(portion.labelEn),
  ].join("|");
}

export function normalizePortions(input: NormalizePortionsInput): NormalizedPortionsDocument {
  let inputPortionsTotal = 0;

  let normalizedPortionsTotal = 0;

  let semanticDuplicatesRemoved = 0;

  let excludedNonPositiveAmount = 0;

  let excludedComplexLegacyMeasure = 0;

  let excludedNonLocalMeasure = 0;

  let excludedPackageSpecificMeasure = 0;

  let excludedServingSpecificMeasure = 0;

  let excludedUnsupportedMeasure = 0;

  let excludedMissingMeasureLabel = 0;

  let productsWithNormalizedPortions = 0;

  const excludedPortions: ExcludedProductPortion[] = [];

  const products = input.extracted.products
    .map((product) => {
      inputPortionsTotal += product.portions.length;

      const normalized: NormalizedProductPortion[] = [];

      const seenSemanticKeys = new Set<string>();

      for (const rawPortion of product.portions) {
        const result = normalizePortion(rawPortion);

        if (result.decision === "EXCLUDE") {
          if (result.reasonCodes.includes("NON_POSITIVE_SOURCE_AMOUNT")) {
            excludedNonPositiveAmount += 1;
          }

          if (result.reasonCodes.includes("COMPLEX_LEGACY_MEASURE")) {
            excludedComplexLegacyMeasure += 1;
          }

          if (result.reasonCodes.includes("NON_LOCAL_MEASURE")) {
            excludedNonLocalMeasure += 1;
          }

          if (result.reasonCodes.includes("PACKAGE_SPECIFIC_MEASURE")) {
            excludedPackageSpecificMeasure += 1;
          }

          if (result.reasonCodes.includes("SERVING_SPECIFIC_MEASURE")) {
            excludedServingSpecificMeasure += 1;
          }

          if (result.reasonCodes.includes("UNSUPPORTED_MEASURE")) {
            excludedUnsupportedMeasure += 1;
          }

          if (result.reasonCodes.includes("MISSING_MEASURE_LABEL")) {
            excludedMissingMeasureLabel += 1;
          }

          excludedPortions.push({
            fdcId: product.fdcId,

            sourceRowId: rawPortion.sourceRowId,

            sourceAmount: rawPortion.sourceAmount,

            gramWeight: rawPortion.gramWeight,

            sourceMeasurementUnitName: rawPortion.sourceMeasurementUnitName,

            sourceModifier: rawPortion.modifier,

            reasonCodes: result.reasonCodes,
          });

          continue;
        }

        const semanticKey = buildSemanticKey(result.portion);

        if (seenSemanticKeys.has(semanticKey)) {
          semanticDuplicatesRemoved += 1;

          excludedPortions.push({
            fdcId: product.fdcId,

            sourceRowId: rawPortion.sourceRowId,

            sourceAmount: rawPortion.sourceAmount,

            gramWeight: rawPortion.gramWeight,

            sourceMeasurementUnitName: rawPortion.sourceMeasurementUnitName,

            sourceModifier: rawPortion.modifier,

            reasonCodes: ["SEMANTIC_DUPLICATE"],
          });

          continue;
        }

        seenSemanticKeys.add(semanticKey);

        normalized.push(result.portion);
      }

      const sortedPortions = [...normalized].sort((left, right) => {
        const leftSequence = left.sourceSequence ?? Number.MAX_SAFE_INTEGER;

        const rightSequence = right.sourceSequence ?? Number.MAX_SAFE_INTEGER;

        if (leftSequence !== rightSequence) {
          return leftSequence - rightSequence;
        }

        return left.labelEn.localeCompare(right.labelEn);
      });

      normalizedPortionsTotal += sortedPortions.length;

      if (sortedPortions.length > 0) {
        productsWithNormalizedPortions += 1;
      }

      const { portions: _rawPortions, ...productWithoutRawPortions } = product;

      void _rawPortions;

      return {
        ...productWithoutRawPortions,

        portions: sortedPortions,
      };
    })
    .sort((left, right) => left.fdcId - right.fdcId);

  return {
    schemaVersion: 1,

    sourceSchemaVersion: input.extracted.schemaVersion,

    statistics: {
      inputProductsTotal: input.extracted.products.length,

      inputPortionsTotal,

      outputProductsTotal: products.length,

      productsWithNormalizedPortions,

      productsWithoutNormalizedPortions: products.length - productsWithNormalizedPortions,

      normalizedPortionsTotal,

      excludedPortionsTotal: excludedPortions.length,

      semanticDuplicatesRemoved,

      excludedNonPositiveAmount,

      excludedComplexLegacyMeasure,

      excludedNonLocalMeasure,

      excludedPackageSpecificMeasure,

      excludedServingSpecificMeasure,

      excludedUnsupportedMeasure,

      excludedMissingMeasureLabel,
    },

    products,

    excludedPortions: excludedPortions.sort(
      (left, right) =>
        left.fdcId - right.fdcId || left.sourceRowId.localeCompare(right.sourceRowId),
    ),
  };
}
