import type { ProductDetails } from "./product-repository.js";

export const PRODUCT_VERIFICATION_BLOCKING_ISSUES = [
  "MISSING_UA_NAME",
  "UNSPECIFIED_FOOD_STATE",
  "MISSING_ENERGY",
  "MISSING_PROTEIN",
  "MISSING_TOTAL_FAT",
  "MISSING_CARBOHYDRATE",
  "MISSING_BRAND",
  "MISSING_ACTIVE_PACKAGE",
  "MISSING_PACKAGE_GTIN",
  "MISSING_PACKAGE_QUANTITY",
] as const;

export type ProductVerificationBlockingIssue =
  (typeof PRODUCT_VERIFICATION_BLOCKING_ISSUES)[number];

export const PRODUCT_VERIFICATION_WARNINGS = [
  "MISSING_PRIMARY_IMAGE",
  "MISSING_DEFAULT_PORTION",
] as const;

export type ProductVerificationWarning = (typeof PRODUCT_VERIFICATION_WARNINGS)[number];

export interface ProductVerificationReadiness {
  readonly status: "READY" | "BLOCKED";
  readonly blockingIssues: readonly ProductVerificationBlockingIssue[];
  readonly warnings: readonly ProductVerificationWarning[];
}

const REQUIRED_NUTRIENTS = [
  ["energy_kcal", "MISSING_ENERGY"],
  ["protein", "MISSING_PROTEIN"],
  ["total_fat", "MISSING_TOTAL_FAT"],
  ["carbohydrate", "MISSING_CARBOHYDRATE"],
] as const satisfies readonly (readonly [string, ProductVerificationBlockingIssue])[];

export function evaluateProductVerification(
  product: Pick<
    ProductDetails,
    "type" | "nameUa" | "brandId" | "foodState" | "nutrients" | "packages" | "portions" | "media"
  >,
): ProductVerificationReadiness {
  const blockingIssues: ProductVerificationBlockingIssue[] = [];
  const warnings: ProductVerificationWarning[] = [];

  if (product.nameUa?.trim() === "") blockingIssues.push("MISSING_UA_NAME");
  if (product.nameUa === null) blockingIssues.push("MISSING_UA_NAME");
  if (product.foodState === "UNSPECIFIED") blockingIssues.push("UNSPECIFIED_FOOD_STATE");

  const nutrientCodes = new Set(product.nutrients.map((nutrient) => nutrient.nutrientCode));
  for (const [code, issue] of REQUIRED_NUTRIENTS) {
    if (!nutrientCodes.has(code)) blockingIssues.push(issue);
  }

  if (product.type === "BRANDED") {
    if (product.brandId === null) blockingIssues.push("MISSING_BRAND");

    const activePackages = product.packages.filter((item) => item.status === "ACTIVE");
    if (activePackages.length === 0) {
      blockingIssues.push("MISSING_ACTIVE_PACKAGE");
    } else {
      if (activePackages.every((item) => item.gtin === null)) {
        blockingIssues.push("MISSING_PACKAGE_GTIN");
      }
      if (
        activePackages.every(
          (item) => item.weightG === null && item.volumeMl === null && item.itemCount === null,
        )
      ) {
        blockingIssues.push("MISSING_PACKAGE_QUANTITY");
      }
    }
  }

  if (!product.media.some((item) => item.status === "ACTIVE" && item.isPrimary)) {
    warnings.push("MISSING_PRIMARY_IMAGE");
  }
  if (!product.portions.some((item) => item.isActive && item.isDefault)) {
    warnings.push("MISSING_DEFAULT_PORTION");
  }

  return Object.freeze({
    status: blockingIssues.length === 0 ? "READY" : "BLOCKED",
    blockingIssues: Object.freeze(blockingIssues),
    warnings: Object.freeze(warnings),
  });
}
