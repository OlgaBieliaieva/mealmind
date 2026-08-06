/**
 * Commands supported by the local USDA pipeline.
 *
 * More commands will be added in later PRs:
 * - select
 * - normalize
 * - translate
 * - validate
 * - generate
 */
export type UsdaCommand = "check";

/**
 * Common shape of a CSV row returned by csv-parse
 * when the `columns` option is enabled.
 */
export type CsvRow = Record<string, string>;

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
