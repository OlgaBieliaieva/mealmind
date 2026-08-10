/**
 * Commands supported by the local USDA pipeline.
 *
 * More commands will be added in later PRs:
 * - normalize
 * - translate
 * - validate
 * - generate
 */
export type UsdaCommand = "check" | "select" | "normalize" | "review" | "curate";

/**
 * Common shape of a CSV row returned by csv-parse
 * when the `columns` option is enabled.
 */
export type CsvRow = Record<string, string>;

/**
 * USDA datasets supported by the generic-product pipeline.
 */
export type UsdaDataset = "FOUNDATION_FOOD" | "SR_LEGACY";

/**
 * Row from USDA food.csv.
 */
export interface FoodCsvRow extends CsvRow {
  readonly fdc_id: string;
  readonly data_type: string;
  readonly description: string;
  readonly food_category_id: string;
  readonly publication_date: string;
}

/**
 * Row from USDA foundation_food.csv.
 */
export interface FoundationFoodCsvRow extends CsvRow {
  readonly fdc_id: string;
  readonly NDB_number: string;
  readonly footnote: string;
}

/**
 * Row from USDA sr_legacy_food.csv.
 */
export interface SrLegacyFoodCsvRow extends CsvRow {
  readonly fdc_id: string;
  readonly NDB_number: string;
}

/**
 * Food selected from food.csv through membership in one
 * of the supported USDA dataset tables.
 */
export interface SelectedFood {
  readonly fdcId: number;
  readonly dataset: UsdaDataset;
  readonly dataType: string;
  readonly description: string;
  readonly foodCategoryExternalId: string | null;
  readonly publicationDate: string | null;
  readonly ndbNumber: string | null;
}

/**
 * Input paths accepted by the food selection operation.
 *
 * Keeping them injectable allows tests to use temporary fixtures
 * instead of real USDA files.
 */
export interface SelectFoodsInputPaths {
  readonly foodFile: string;
  readonly foundationFoodFile: string;
  readonly srLegacyFoodFile: string;
}

/**
 * Statistics generated while selecting supported foods.
 */
export interface SelectFoodsStatistics {
  readonly foodRowsRead: number;
  readonly foundationReferencesRead: number;
  readonly srLegacyReferencesRead: number;
  readonly selectedFoundationFoods: number;
  readonly selectedSrLegacyFoods: number;
  readonly selectedFoodsTotal: number;
}

/**
 * Deterministic selected-foods.json document.
 *
 * No generation timestamp is stored because it would make the output
 * differ on every otherwise identical run.
 */
export interface SelectedFoodsDocument {
  readonly schemaVersion: 1;
  readonly datasets: readonly UsdaDataset[];
  readonly statistics: SelectFoodsStatistics;
  readonly foods: readonly SelectedFood[];
}

/**
 * Detailed preparation method detected from a USDA description.
 *
 * This is more specific than the current Prisma ProductFoodState.
 * It will later be mapped to the database representation.
 */
export type PreparationMethod =
  | "UNSPECIFIED"
  | "RAW"
  | "BOILED"
  | "STEAMED"
  | "BAKED"
  | "ROASTED"
  | "GRILLED"
  | "BROILED"
  | "FRIED"
  | "PAN_FRIED"
  | "DEEP_FRIED"
  | "SAUTEED"
  | "MICROWAVED"
  | "SIMMERED"
  | "POACHED"
  | "BRAISED"
  | "STEWED"
  | "CANNED"
  | "DRIED"
  | "DEHYDRATED"
  | "FROZEN"
  | "SMOKED"
  | "FERMENTED"
  | "PICKLED"
  | "TOASTED"
  | "STIR_FRIED";

/**
 * Broad state compatible with the current MealMind product model.
 */
export type NormalizedFoodState = "UNSPECIFIED" | "RAW" | "COOKED" | "PROCESSED" | "READY_TO_EAT";

/**
 * Describes how confidently a preparation method was recognized.
 */
export type NormalizationConfidence = "HIGH" | "MEDIUM" | "LOW";

/**
 * One normalized food produced from a SelectedFood.
 */
export interface NormalizedProduct {
  readonly fdcId: number;
  readonly dataset: UsdaDataset;
  readonly dataType: string;

  readonly originalDescription: string;
  readonly normalizedNameEn: string;

  readonly preparationMethod: PreparationMethod;
  readonly foodState: NormalizedFoodState;
  readonly preparationConfidence: NormalizationConfidence;

  /**
   * Known qualifiers removed from the base name.
   *
   * Examples:
   * - without salt
   * - skinless
   * - meat only
   */
  readonly modifiersEn: readonly string[];

  /**
   * Parts that look like processing metadata but were not classified
   * by current deterministic rules.
   */
  readonly unclassifiedParts: readonly string[];

  readonly foodCategoryExternalId: string | null;
  readonly publicationDate: string | null;
  readonly ndbNumber: string | null;
}

/**
 * Statistics generated during normalization.
 */
export interface NormalizeFoodsStatistics {
  readonly inputFoodsTotal: number;
  readonly normalizedFoodsTotal: number;

  readonly rawFoods: number;
  readonly cookedFoods: number;
  readonly processedFoods: number;
  readonly readyToEatFoods: number;
  readonly unspecifiedFoods: number;

  readonly foodsWithModifiers: number;
  readonly foodsWithUnclassifiedParts: number;
}

/**
 * Deterministic normalized-products.json document.
 */
export interface NormalizedProductsDocument {
  readonly schemaVersion: 1;
  readonly sourceSchemaVersion: 1;
  readonly statistics: NormalizeFoodsStatistics;
  readonly products: readonly NormalizedProduct[];
}

/**
 * Result of parsing one USDA description.
 */
export interface NormalizedDescription {
  readonly normalizedNameEn: string;
  readonly preparationMethod: PreparationMethod;
  readonly foodState: NormalizedFoodState;
  readonly preparationConfidence: NormalizationConfidence;
  readonly modifiersEn: readonly string[];
  readonly unclassifiedParts: readonly string[];
}

/**
 * Final or suggested catalog decision.
 */
export type CurationDecision = "INCLUDE" | "EXCLUDE" | "NEEDS_REVIEW";

/**
 * Origin of the final decision.
 */
export type CurationDecisionSource = "AUTOMATIC" | "OVERRIDE";

/**
 * Stable machine-readable reasons used in reports and tests.
 */
export type CurationReasonCode =
  | "CATEGORY_INCLUDED"
  | "CATEGORY_EXCLUDED"
  | "CATEGORY_REQUIRES_REVIEW"
  | "CATEGORY_MISSING"
  | "DESCRIPTION_EXCLUDED"
  | "COMPOSITE_DISH"
  | "RESTAURANT_OR_FAST_FOOD"
  | "BABY_OR_INFANT_FOOD"
  | "SUPPLEMENT_OR_MEDICAL_PRODUCT"
  | "ALCOHOLIC_PRODUCT"
  | "OVERLY_SPECIFIC_MEAT_VARIANT"
  | "UNCLASSIFIED_PROCESSING"
  | "LOW_NORMALIZATION_CONFIDENCE"
  | "MULTIPLE_MODIFIERS"
  | "UNKNOWN_FOOD_STATE"
  | "MANUAL_INCLUDE"
  | "MANUAL_EXCLUDE"
  | "MANUAL_REVIEW";

/**
 * One manually maintained decision.
 */
export interface CurationOverride {
  readonly decision: CurationDecision;
  readonly note: string;
}

/**
 * Result produced by automatic curation rules.
 */
export interface AutomaticCurationResult {
  readonly decision: CurationDecision;
  readonly reasonCodes: readonly CurationReasonCode[];
}

/**
 * One entry in catalog-review.json.
 */
export interface CatalogReviewItem extends NormalizedProduct {
  readonly foodCategoryExternalName: string | null;
  readonly automaticDecision: CurationDecision;
  readonly finalDecision: CurationDecision;
  readonly decisionSource: CurationDecisionSource;
  readonly reasonCodes: readonly CurationReasonCode[];
  readonly overrideNote: string | null;
}

/**
 * Statistics for catalog-review.json.
 */
export interface CatalogReviewStatistics {
  readonly inputProductsTotal: number;

  readonly automaticIncludes: number;
  readonly automaticExcludes: number;
  readonly automaticNeedsReview: number;

  readonly finalIncludes: number;
  readonly finalExcludes: number;
  readonly finalNeedsReview: number;

  readonly overriddenProducts: number;
}

/**
 * Full local review document.
 */
export interface CatalogReviewDocument {
  readonly schemaVersion: 1;
  readonly sourceSchemaVersion: 1;
  readonly statistics: CatalogReviewStatistics;
  readonly items: readonly CatalogReviewItem[];
}

/**
 * Product approved for the curated catalog.
 */
export interface CuratedProduct extends NormalizedProduct {
  readonly curation: {
    readonly decisionSource: CurationDecisionSource;
    readonly reasonCodes: readonly CurationReasonCode[];
    readonly overrideNote: string | null;
  };
}

/**
 * Final curated-products.json document.
 */
export interface CuratedProductsDocument {
  readonly schemaVersion: 1;
  readonly sourceSchemaVersion: 1;
  readonly statistics: {
    readonly reviewItemsTotal: number;
    readonly includedProductsTotal: number;
    readonly excludedProductsTotal: number;
    readonly unresolvedProductsTotal: number;
  };
  readonly products: readonly CuratedProduct[];
}

/**
 * Information printed by the framework check command.
 */
export interface UsdaFrameworkInfo {
  readonly packageRoot: string;
  readonly usdaRoot: string;
  readonly rawDataDirectory: string;
  readonly workDataDirectory: string;
  readonly outputDataDirectory: string;
}

/**
 * Result of the framework smoke check.
 */
export interface UsdaFrameworkCheckResult {
  readonly success: boolean;
  readonly createdDirectories: readonly string[];
  readonly frameworkInfo: UsdaFrameworkInfo;
}
