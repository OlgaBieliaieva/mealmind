import type { CurationOverride } from "../src/types.js";

/**
 * Manually reviewed curation decisions.
 *
 * Keys are USDA FDC IDs.
 *
 * Keep this file deterministic and version-controlled.
 * Never use array indexes or descriptions as identifiers.
 */
export const CURATION_OVERRIDES: Readonly<Record<number, CurationOverride>> = {
  /**
   * Examples only. Replace or remove them after reviewing
   * the actual catalog-review.json.
   *
   * 123456: {
   *   decision: "INCLUDE",
   *   note: "Generic unsalted product useful for recipe calculations.",
   * },
   *
   * 234567: {
   *   decision: "EXCLUDE",
   *   note: "Composite ready meal, not a base ingredient.",
   * },
   *
   * 345678: {
   *   decision: "NEEDS_REVIEW",
   *   note: "Unclear difference from another USDA entry.",
   * },
   */
};
