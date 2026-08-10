import type { CurationReasonCode, NormalizedProduct } from "../src/types.js";

interface ReviewRule {
  readonly reasonCode: CurationReasonCode;
  readonly patterns: readonly RegExp[];
}

/**
 * Composite foods should not be silently included because some
 * of them may still require manual review.
 */
const DESCRIPTION_REVIEW_RULES: readonly ReviewRule[] = [
  {
    reasonCode: "COMPOSITE_DISH",
    patterns: [
      /\bfrozen dinner\b/i,
      /\bprepared meal\b/i,
      /\bmeal,? ready[- ]to[- ]eat\b/i,
      /\bcomplete meal\b/i,
      /\bcasserole\b/i,
      /\bentree\b/i,
    ],
  },
] as const;

export function findReviewReasons(product: NormalizedProduct): CurationReasonCode[] {
  const reasons = DESCRIPTION_REVIEW_RULES.filter((rule) =>
    rule.patterns.some((pattern) => pattern.test(product.originalDescription)),
  ).map((rule) => rule.reasonCode);

  /**
   * Unknown processing fragments remain a genuine review reason
   * because normalization could not classify them confidently.
   */
  if (product.unclassifiedParts.length > 0) {
    reasons.push("UNCLASSIFIED_PROCESSING");
  }

  /**
   * The number of recognized modifiers is intentionally not used
   * as a review criterion.
   *
   * Multiple valid modifiers such as:
   * - skinless + boneless + meat only
   * - chopped + drained + with salt
   * - whole + boneless + separable lean only
   *
   * are legitimate USDA product attributes and do not make a
   * product ambiguous by themselves.
   */

  return [...new Set(reasons)];
}
