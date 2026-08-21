import { evaluateCategoryPolicy } from "../config/category-policy.js";
import { findDescriptionExclusionReasons } from "../config/exclusion-rules.js";
import { evaluateMixedCategory } from "../config/mixed-category-rules.js";
import { findReviewReasons } from "../config/review-rules.js";
import type { AutomaticCurationResult, CurationReasonCode, NormalizedProduct } from "./types.js";

function uniqueReasons(reasons: readonly CurationReasonCode[]): CurationReasonCode[] {
  return [...new Set(reasons)];
}

export function evaluateAutomaticCuration(product: NormalizedProduct): AutomaticCurationResult {
  const categoryResult = evaluateCategoryPolicy(product.foodCategoryExternalId);

  /**
   * Categories with a top-level NEEDS_REVIEW policy can receive
   * a more specific product-level category decision.
   *
   * Example:
   * Beverages -> NEEDS_REVIEW
   * Coffee    -> INCLUDE
   */
  const mixedCategoryResult =
    categoryResult.decision === "NEEDS_REVIEW" ? evaluateMixedCategory(product) : null;

  const effectiveCategoryResult = mixedCategoryResult ?? categoryResult;

  /**
   * Description-level exclusion rules always have priority.
   *
   * This allows clearly unwanted products to be excluded even when
   * their category or mixed-category policy would otherwise include
   * them.
   */
  const exclusionReasons = findDescriptionExclusionReasons(product.originalDescription);

  if (effectiveCategoryResult.decision === "EXCLUDE" || exclusionReasons.length > 0) {
    const reasonCodes: CurationReasonCode[] = [
      effectiveCategoryResult.reasonCode,
      ...exclusionReasons,
    ];

    if (exclusionReasons.length > 0) {
      reasonCodes.push("DESCRIPTION_EXCLUDED");
    }

    return {
      decision: "EXCLUDE",
      reasonCodes: uniqueReasons(reasonCodes),
    };
  }

  /**
   * Product-level review rules are evaluated only after all
   * exclusion logic has completed.
   *
   * A product whose category is otherwise includable may still
   * require review when there is a genuine unresolved condition,
   * such as:
   *
   * - COMPOSITE_DISH
   * - UNCLASSIFIED_PROCESSING
   *
   * The number of recognized modifiers alone is intentionally not
   * a reason for review.
   */
  const reviewReasons = findReviewReasons(product);

  if (effectiveCategoryResult.decision === "NEEDS_REVIEW" || reviewReasons.length > 0) {
    return {
      decision: "NEEDS_REVIEW",
      reasonCodes: uniqueReasons([effectiveCategoryResult.reasonCode, ...reviewReasons]),
    };
  }

  return {
    decision: "INCLUDE",
    reasonCodes: [effectiveCategoryResult.reasonCode],
  };
}
