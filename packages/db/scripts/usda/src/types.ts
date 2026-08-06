/**
 * Commands supported by the local USDA pipeline.
 *
 * More commands will be added in later PRs:
 * - normalize
 * - translate
 * - validate
 * - generate
 */
export type UsdaCommand = "check" | "select";

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
