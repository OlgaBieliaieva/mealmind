import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  AGGREGATED_PRODUCTS_SCHEMA,
  type AggregatedProductsDocument,
  type AggregatedZakazProduct,
} from "./aggregate-products.js";

export const CLASSIFIED_PRODUCTS_SCHEMA = "mealmind.zakaz.classified-products/v1";

export type GtinStatus =
  "VALID" | "MISSING" | "NON_NUMERIC" | "UNSUPPORTED_LENGTH" | "INVALID_CHECK_DIGIT";

export type PackageClassification =
  | "FIXED_MASS"
  | "FIXED_VOLUME"
  | "FIXED_MASS_AND_VOLUME"
  | "FIXED_COUNT"
  | "VARIABLE_MASS"
  | "UNKNOWN";

export type ProductClassificationDecision = "ELIGIBLE" | "REVIEW_REQUIRED" | "REJECTED";

export type ProductClassificationReason =
  | "BRAND_MISSING"
  | "BRAND_SENTINEL_WITHOUT_BRAND"
  | "GTIN_MISSING"
  | "GTIN_NON_NUMERIC"
  | "GTIN_UNSUPPORTED_LENGTH"
  | "GTIN_INVALID_CHECK_DIGIT"
  | "PACKAGE_VARIABLE_WEIGHT"
  | "PACKAGE_MEASURE_MISSING"
  | "PACKAGE_UNIT_UNSUPPORTED";

export interface ProductGtinClassification {
  readonly raw: string | null;
  readonly normalized: string | null;
  readonly format: "GTIN_8" | "GTIN_12" | "GTIN_13" | "GTIN_14" | null;
  readonly status: GtinStatus;
}

export interface ProductPackageClassification {
  readonly kind: PackageClassification;
  readonly sourceUnit: string | null;
  readonly weightG: number | null;
  readonly volumeMl: number | null;
  readonly itemCount: number | null;
  readonly quantity: unknown;
}

export interface ProductAvailabilitySnapshot {
  readonly inStock: boolean | null;
  readonly availableForCart: boolean | null;
  readonly verboseStock: unknown;
  readonly sourceObservation: AggregatedZakazProduct["selectedObservation"];
  readonly hasConflictingObservations: boolean;
}

export interface ProductSourceClassification {
  readonly decision: ProductClassificationDecision;
  readonly reasonCodes: readonly ProductClassificationReason[];
  readonly brand: {
    readonly rawTrademark: string | null;
    readonly usable: boolean;
  };
  readonly gtin: ProductGtinClassification;
  readonly package: ProductPackageClassification;
  readonly availabilitySnapshot: ProductAvailabilitySnapshot;
}

export interface ClassifiedZakazProduct extends AggregatedZakazProduct {
  readonly classification: ProductSourceClassification;
}

export interface ClassifiedProductsDocument {
  readonly schema: typeof CLASSIFIED_PRODUCTS_SCHEMA;
  readonly generatedAt: string;
  readonly sourceSchema: typeof AGGREGATED_PRODUCTS_SCHEMA;
  readonly provider: "ZAKAZ";
  readonly locale: string;
  readonly policy: {
    readonly availabilityAffectsEligibility: false;
    readonly variableWeightEligible: false;
    readonly standardGtinRequired: true;
    readonly usableBrandRequired: true;
  };
  readonly statistics: {
    readonly inputProducts: number;
    readonly eligibleProducts: number;
    readonly reviewRequiredProducts: number;
    readonly rejectedProducts: number;
    readonly eligibleInStock: number;
    readonly eligibleOutOfStock: number;
    readonly eligibleAvailabilityUnknown: number;
    readonly reasonCounts: Readonly<Record<ProductClassificationReason, number>>;
    readonly packageCounts: Readonly<Record<PackageClassification, number>>;
    readonly gtinStatusCounts: Readonly<Record<GtinStatus, number>>;
  };
  readonly products: readonly ClassifiedZakazProduct[];
}

export interface ClassifyProductsCliOptions {
  readonly locale: string;
  readonly inputFile: string;
  readonly outputFile: string;
  readonly json: boolean;
}

const GTIN_LENGTHS = [8, 12, 13, 14] as const;
const AVAILABILITY_FIELDS = new Set(["in_stock", "available_for_cart", "verbose_stock"]);
const REJECTION_REASONS = new Set<ProductClassificationReason>([
  "BRAND_MISSING",
  "BRAND_SENTINEL_WITHOUT_BRAND",
  "GTIN_MISSING",
  "GTIN_NON_NUMERIC",
  "GTIN_UNSUPPORTED_LENGTH",
  "GTIN_INVALID_CHECK_DIGIT",
  "PACKAGE_VARIABLE_WEIGHT",
]);

export function classifyAggregatedProduct(product: AggregatedZakazProduct): ClassifiedZakazProduct {
  const gtin = classifyGtin(product.productData.ean);
  const packageClassification = classifyPackage(product.productData);
  const brand = classifyBrand(product.productData.producer);
  const reasonCodes = collectReasonCodes(gtin, packageClassification, brand);
  const decision = resolveDecision(reasonCodes);

  return {
    ...product,
    classification: {
      decision,
      reasonCodes,
      brand,
      gtin,
      package: packageClassification,
      availabilitySnapshot: {
        inStock: readBoolean(product.productData.in_stock),
        availableForCart: readBoolean(product.productData.available_for_cart),
        verboseStock: product.productData.verbose_stock ?? null,
        sourceObservation: product.selectedObservation,
        hasConflictingObservations: product.conflictingFields.some((field) =>
          AVAILABILITY_FIELDS.has(field),
        ),
      },
    },
  };
}

export function classifyProductsDocument(
  document: AggregatedProductsDocument,
  generatedAt = new Date().toISOString(),
): ClassifiedProductsDocument {
  if (document.schema !== AGGREGATED_PRODUCTS_SCHEMA) {
    throw new Error(`Непідтримувана aggregated schema: ${String(document.schema)}`);
  }

  const products = document.products.map(classifyAggregatedProduct);
  const decisions = countBy(products, (product) => product.classification.decision);
  const packageCounts = initializeCountRecord<PackageClassification>([
    "FIXED_MASS",
    "FIXED_VOLUME",
    "FIXED_MASS_AND_VOLUME",
    "FIXED_COUNT",
    "VARIABLE_MASS",
    "UNKNOWN",
  ]);
  const gtinStatusCounts = initializeCountRecord<GtinStatus>([
    "VALID",
    "MISSING",
    "NON_NUMERIC",
    "UNSUPPORTED_LENGTH",
    "INVALID_CHECK_DIGIT",
  ]);
  const reasonCounts = initializeCountRecord<ProductClassificationReason>([
    "BRAND_MISSING",
    "BRAND_SENTINEL_WITHOUT_BRAND",
    "GTIN_MISSING",
    "GTIN_NON_NUMERIC",
    "GTIN_UNSUPPORTED_LENGTH",
    "GTIN_INVALID_CHECK_DIGIT",
    "PACKAGE_VARIABLE_WEIGHT",
    "PACKAGE_MEASURE_MISSING",
    "PACKAGE_UNIT_UNSUPPORTED",
  ]);

  for (const product of products) {
    packageCounts[product.classification.package.kind] += 1;
    gtinStatusCounts[product.classification.gtin.status] += 1;
    for (const reason of product.classification.reasonCodes) reasonCounts[reason] += 1;
  }

  const eligible = products.filter((product) => product.classification.decision === "ELIGIBLE");

  return {
    schema: CLASSIFIED_PRODUCTS_SCHEMA,
    generatedAt,
    sourceSchema: AGGREGATED_PRODUCTS_SCHEMA,
    provider: "ZAKAZ",
    locale: document.locale,
    policy: {
      availabilityAffectsEligibility: false,
      variableWeightEligible: false,
      standardGtinRequired: true,
      usableBrandRequired: true,
    },
    statistics: {
      inputProducts: products.length,
      eligibleProducts: decisions.ELIGIBLE ?? 0,
      reviewRequiredProducts: decisions.REVIEW_REQUIRED ?? 0,
      rejectedProducts: decisions.REJECTED ?? 0,
      eligibleInStock: eligible.filter(
        (product) => product.classification.availabilitySnapshot.inStock === true,
      ).length,
      eligibleOutOfStock: eligible.filter(
        (product) => product.classification.availabilitySnapshot.inStock === false,
      ).length,
      eligibleAvailabilityUnknown: eligible.filter(
        (product) => product.classification.availabilitySnapshot.inStock === null,
      ).length,
      reasonCounts,
      packageCounts,
      gtinStatusCounts,
    },
    products,
  };
}

export function classifyGtin(value: unknown): ProductGtinClassification {
  const raw = typeof value === "string" ? value.trim() : null;
  if (!raw) return { raw, normalized: null, format: null, status: "MISSING" };
  if (!/^\d+$/u.test(raw)) {
    return { raw, normalized: null, format: null, status: "NON_NUMERIC" };
  }
  if (!GTIN_LENGTHS.includes(raw.length as (typeof GTIN_LENGTHS)[number])) {
    return { raw, normalized: null, format: null, status: "UNSUPPORTED_LENGTH" };
  }

  const format = `GTIN_${raw.length}` as ProductGtinClassification["format"];
  if (!hasValidGtinCheckDigit(raw)) {
    return { raw, normalized: null, format, status: "INVALID_CHECK_DIGIT" };
  }
  return { raw, normalized: raw.padStart(14, "0"), format, status: "VALID" };
}

export function classifyPackage(
  productData: Readonly<Record<string, unknown>>,
): ProductPackageClassification {
  const sourceUnit = readString(productData.unit);
  const weightG = readPositiveNumber(productData.weight);
  const volumeMl = readPositiveNumber(productData.volume);
  const itemCount = readPositiveNumber(productData.pack_amount);
  let kind: PackageClassification;

  if (sourceUnit === "kg") {
    kind = "VARIABLE_MASS";
  } else if (sourceUnit !== "pcs") {
    kind = "UNKNOWN";
  } else if (weightG !== null && volumeMl !== null) {
    kind = "FIXED_MASS_AND_VOLUME";
  } else if (weightG !== null) {
    kind = "FIXED_MASS";
  } else if (volumeMl !== null) {
    kind = "FIXED_VOLUME";
  } else if (itemCount !== null) {
    kind = "FIXED_COUNT";
  } else {
    kind = "UNKNOWN";
  }

  return {
    kind,
    sourceUnit,
    weightG,
    volumeMl,
    itemCount,
    quantity: productData.quantity ?? null,
  };
}

export async function runClassifyProductsCommand(arguments_: readonly string[]): Promise<void> {
  const options = parseClassifyProductsArguments(arguments_);
  const aggregated = await readAggregatedDocument(options.inputFile);
  if (aggregated.locale !== options.locale) {
    throw new Error(
      `Локаль aggregated artifact "${aggregated.locale}" не відповідає --locale "${options.locale}"`,
    );
  }

  const document = classifyProductsDocument(aggregated);
  await mkdir(path.dirname(options.outputFile), { recursive: true });
  await writeFile(options.outputFile, `${JSON.stringify(document, null, 2)}\n`, "utf8");

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify({ success: true, outputFile: options.outputFile, statistics: document.statistics }, null, 2)}\n`,
    );
  } else {
    printClassificationSummary(options.outputFile, document);
  }
}

export function parseClassifyProductsArguments(
  arguments_: readonly string[],
): ClassifyProductsCliOptions {
  let locale: string | undefined;
  let inputFile: string | undefined;
  let outputFile: string | undefined;
  let json = false;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--locale") {
      locale = requireValue(arguments_, ++index, "--locale");
      continue;
    }
    if (argument === "--input") {
      inputFile = path.resolve(requireValue(arguments_, ++index, "--input"));
      continue;
    }
    if (argument === "--output") {
      outputFile = path.resolve(requireValue(arguments_, ++index, "--output"));
      continue;
    }
    if (argument === "--json") {
      json = true;
      continue;
    }
    throw new Error(`Невідомий аргумент classify: ${argument}`);
  }

  if (!locale) throw new Error("Для classify потрібно передати --locale <locale>");

  return {
    locale,
    inputFile:
      inputFile ?? path.resolve(`scripts/zakaz/data/work/products-${locale}-aggregated.json`),
    outputFile:
      outputFile ?? path.resolve(`scripts/zakaz/data/work/products-${locale}-classified.json`),
    json,
  };
}

export const CLASSIFY_PRODUCTS_USAGE = `Класифікація GTIN, package та first-wave eligibility.

Usage:
  npm run zakaz -- classify --locale <locale> [options]

Options:
  --locale <locale>   Обов'язкова локаль, наприклад en або uk
  --input <path>      Aggregated JSON (default: products-<locale>-aggregated.json)
  --output <path>     Classified JSON (default: products-<locale>-classified.json)
  --json              Вивести machine-readable summary
  --help              Показати цю довідку
`;

function classifyBrand(value: unknown): ProductSourceClassification["brand"] {
  const producer = isRecord(value) ? value : null;
  const rawTrademark = producer ? readString(producer.trademark) : null;
  const usable = rawTrademark !== null && rawTrademark.toLocaleLowerCase("en") !== "without brand";
  return { rawTrademark, usable };
}

function collectReasonCodes(
  gtin: ProductGtinClassification,
  packageClassification: ProductPackageClassification,
  brand: ProductSourceClassification["brand"],
): readonly ProductClassificationReason[] {
  const reasons: ProductClassificationReason[] = [];

  if (!brand.rawTrademark) reasons.push("BRAND_MISSING");
  else if (!brand.usable) reasons.push("BRAND_SENTINEL_WITHOUT_BRAND");

  const gtinReasonByStatus: Partial<Record<GtinStatus, ProductClassificationReason>> = {
    MISSING: "GTIN_MISSING",
    NON_NUMERIC: "GTIN_NON_NUMERIC",
    UNSUPPORTED_LENGTH: "GTIN_UNSUPPORTED_LENGTH",
    INVALID_CHECK_DIGIT: "GTIN_INVALID_CHECK_DIGIT",
  };
  const gtinReason = gtinReasonByStatus[gtin.status];
  if (gtinReason) reasons.push(gtinReason);

  if (packageClassification.kind === "VARIABLE_MASS") {
    reasons.push("PACKAGE_VARIABLE_WEIGHT");
  } else if (packageClassification.kind === "UNKNOWN") {
    reasons.push(
      packageClassification.sourceUnit === "pcs"
        ? "PACKAGE_MEASURE_MISSING"
        : "PACKAGE_UNIT_UNSUPPORTED",
    );
  }

  return reasons;
}

function resolveDecision(
  reasons: readonly ProductClassificationReason[],
): ProductClassificationDecision {
  if (reasons.some((reason) => REJECTION_REASONS.has(reason))) return "REJECTED";
  if (reasons.length > 0) return "REVIEW_REQUIRED";
  return "ELIGIBLE";
}

function hasValidGtinCheckDigit(value: string): boolean {
  const digits = [...value].map(Number);
  const checkDigit = digits.at(-1);
  if (checkDigit === undefined) return false;

  let sum = 0;
  let weight = 3;
  for (let index = digits.length - 2; index >= 0; index -= 1) {
    sum += (digits[index] ?? 0) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return (10 - (sum % 10)) % 10 === checkDigit;
}

async function readAggregatedDocument(filePath: string): Promise<AggregatedProductsDocument> {
  const value = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  if (
    !isRecord(value) ||
    value.schema !== AGGREGATED_PRODUCTS_SCHEMA ||
    !Array.isArray(value.products)
  ) {
    throw new Error(`Некоректний aggregated artifact: ${filePath}`);
  }
  return value as unknown as AggregatedProductsDocument;
}

function countBy<TValue, TKey extends string>(
  values: readonly TValue[],
  selectKey: (value: TValue) => TKey,
): Partial<Record<TKey, number>> {
  const result: Partial<Record<TKey, number>> = {};
  for (const value of values) {
    const key = selectKey(value);
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

function initializeCountRecord<TKey extends string>(keys: readonly TKey[]): Record<TKey, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<TKey, number>;
}

function readPositiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireValue(arguments_: readonly string[], index: number, option: string): string {
  const value = arguments_[index];
  if (!value) throw new Error(`Для ${option} потрібно передати значення`);
  return value;
}

function printClassificationSummary(
  outputFile: string,
  document: ClassifiedProductsDocument,
): void {
  const { statistics } = document;
  process.stdout.write(
    [
      "Zakaz product classification: OK",
      `Locale: ${document.locale}`,
      `Input products: ${statistics.inputProducts}`,
      `Eligible: ${statistics.eligibleProducts}`,
      `Review required: ${statistics.reviewRequiredProducts}`,
      `Rejected: ${statistics.rejectedProducts}`,
      `Eligible in stock: ${statistics.eligibleInStock}`,
      `Eligible out of stock: ${statistics.eligibleOutOfStock}`,
      `Eligible availability unknown: ${statistics.eligibleAvailabilityUnknown}`,
      `Output: ${outputFile}`,
    ].join("\n") + "\n",
  );
}
