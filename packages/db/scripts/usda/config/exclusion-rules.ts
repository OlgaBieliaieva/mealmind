import type { CurationReasonCode } from "../src/types.js";

export interface ExclusionRule {
  readonly reasonCode: CurationReasonCode;
  readonly patterns: readonly RegExp[];
}

export const EXCLUSION_RULES: readonly ExclusionRule[] = [
  {
    reasonCode: "BABY_OR_INFANT_FOOD",
    patterns: [/\bbaby food\b/i, /\binfant formula\b/i, /\binfant food\b/i, /\btoddler formula\b/i],
  },
  {
    reasonCode: "SUPPLEMENT_OR_MEDICAL_PRODUCT",
    patterns: [
      /\bdietary supplement\b/i,
      /\bprotein supplement\b/i,
      /\bmeal replacement\b/i,
      /\bnutritional supplement\b/i,
      /\bmedical food\b/i,
    ],
  },
  {
    reasonCode: "OVERLY_SPECIFIC_MEAT_VARIANT",
    patterns: [
      /\btrimmed to\s+(?:0|1\/8)\s*(?:["”]|inch(?:es)?)\s+fat\b/i,
      /\blip[- ]on\b/i,
      /\blip[- ]off\b/i,
    ],
  },
  {
    reasonCode: "DESCRIPTION_EXCLUDED",
    patterns: [
      /^yokan\b/i,
      /^beef, new zealand, imported, ribs prepared\b/i,
      /^pate de foie gras\b/i,
    ],
  },
] as const;

export function findDescriptionExclusionReasons(description: string): CurationReasonCode[] {
  return EXCLUSION_RULES.filter((rule) =>
    rule.patterns.some((pattern) => pattern.test(description)),
  ).map((rule) => rule.reasonCode);
}
