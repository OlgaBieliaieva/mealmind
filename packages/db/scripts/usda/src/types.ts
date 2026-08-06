/**
 * Commands supported by the local USDA pipeline.
 *
 * More commands will be added in later PRs:
 * - normalize
 * - translate
 * - validate
 * - generate
 */
export type UsdaCommand = "check" | "select" | "normalize";

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
  | "TOASTED";

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
