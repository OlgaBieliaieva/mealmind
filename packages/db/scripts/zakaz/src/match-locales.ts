import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  AGGREGATED_PRODUCTS_SCHEMA,
  type AggregatedProductsDocument,
  type AggregatedZakazProduct,
} from "./aggregate-products.js";

export const MATCHED_LOCALES_SCHEMA = "mealmind.zakaz.matched-locales/v1";

export type LocaleMatchStatus =
  "MATCHED" | "MATCH_REVIEW_REQUIRED" | "SOURCE_ONLY" | "LOCALIZED_ONLY";

export type IdentityConflictField = "ean" | "unit" | "weight" | "volume" | "pack_amount";

export interface IdentityConflict {
  readonly field: IdentityConflictField;
  readonly sourceValue: unknown;
  readonly localizedValue: unknown;
}

export interface MatchedLocaleProduct {
  readonly identity: {
    readonly provider: "ZAKAZ";
    readonly storeId: string;
    readonly sourceSku: string;
  };
  readonly matchStatus: LocaleMatchStatus;
  readonly identityConflicts: readonly IdentityConflict[];
  readonly source: AggregatedZakazProduct | null;
  readonly localized: AggregatedZakazProduct | null;
  readonly sourceFingerprint: string | null;
  readonly localizedFingerprint: string | null;
}

export interface MatchedLocalesDocument {
  readonly schema: typeof MATCHED_LOCALES_SCHEMA;
  readonly generatedAt: string;
  readonly sourceSchema: typeof AGGREGATED_PRODUCTS_SCHEMA;
  readonly provider: "ZAKAZ";
  readonly sourceLocale: string;
  readonly localizedLocale: string;
  readonly matchingKey: readonly ["sourceStoreId", "sourceSku"];
  readonly statistics: {
    readonly sourceProducts: number;
    readonly localizedProducts: number;
    readonly matchedProducts: number;
    readonly reviewRequiredMatches: number;
    readonly sourceOnlyProducts: number;
    readonly localizedOnlyProducts: number;
    readonly sourceMatchRatePercent: number;
    readonly identityConflictCounts: Readonly<Record<IdentityConflictField, number>>;
    readonly localizedCoverage: {
      readonly title: number;
      readonly description: number;
      readonly ingredients: number;
      readonly nutritionFacts: number;
      readonly shelfLife: number;
      readonly temperatureRange: number;
      readonly webUrl: number;
    };
  };
  readonly products: readonly MatchedLocaleProduct[];
}

export interface MatchLocalesCliOptions {
  readonly sourceLocale: string;
  readonly localizedLocale: string;
  readonly sourceInputFile: string;
  readonly localizedInputFile: string;
  readonly outputFile: string;
  readonly json: boolean;
}

const IDENTITY_FIELDS: readonly IdentityConflictField[] = [
  "ean",
  "unit",
  "weight",
  "volume",
  "pack_amount",
];
const SAFE_LOCALE_PATTERN = /^[a-z]{2,3}$/u;

export function matchLocaleDocuments(
  sourceDocument: AggregatedProductsDocument,
  localizedDocument: AggregatedProductsDocument,
  generatedAt = new Date().toISOString(),
): MatchedLocalesDocument {
  validateDocumentPair(sourceDocument, localizedDocument);
  const sourceByKey = indexProducts(sourceDocument.products, sourceDocument.locale);
  const localizedByKey = indexProducts(localizedDocument.products, localizedDocument.locale);
  const keys = [...new Set([...sourceByKey.keys(), ...localizedByKey.keys()])].sort();
  const products: MatchedLocaleProduct[] = [];

  for (const key of keys) {
    const source = sourceByKey.get(key) ?? null;
    const localized = localizedByKey.get(key) ?? null;
    const reference = source ?? localized;
    if (!reference) continue;
    const identityConflicts =
      source && localized ? compareIdentityFields(source.productData, localized.productData) : [];
    let matchStatus: LocaleMatchStatus;
    if (!localized) matchStatus = "SOURCE_ONLY";
    else if (!source) matchStatus = "LOCALIZED_ONLY";
    else if (identityConflicts.length > 0) matchStatus = "MATCH_REVIEW_REQUIRED";
    else matchStatus = "MATCHED";

    products.push({
      identity: {
        provider: "ZAKAZ",
        storeId: reference.sourceStoreId,
        sourceSku: reference.sourceSku,
      },
      matchStatus,
      identityConflicts,
      source,
      localized,
      sourceFingerprint: source ? fingerprintProduct(source) : null,
      localizedFingerprint: localized ? fingerprintProduct(localized) : null,
    });
  }

  const conflictCounts = initializeConflictCounts();
  for (const product of products) {
    for (const conflict of product.identityConflicts) conflictCounts[conflict.field] += 1;
  }
  const matchedProducts = products.filter((product) => product.matchStatus === "MATCHED").length;
  const reviewRequiredMatches = products.filter(
    (product) => product.matchStatus === "MATCH_REVIEW_REQUIRED",
  ).length;
  const localizedProducts = products
    .map((product) => product.localized)
    .filter((product): product is AggregatedZakazProduct => product !== null);
  const overlappingProducts = matchedProducts + reviewRequiredMatches;

  return {
    schema: MATCHED_LOCALES_SCHEMA,
    generatedAt,
    sourceSchema: AGGREGATED_PRODUCTS_SCHEMA,
    provider: "ZAKAZ",
    sourceLocale: sourceDocument.locale,
    localizedLocale: localizedDocument.locale,
    matchingKey: ["sourceStoreId", "sourceSku"],
    statistics: {
      sourceProducts: sourceDocument.products.length,
      localizedProducts: localizedDocument.products.length,
      matchedProducts,
      reviewRequiredMatches,
      sourceOnlyProducts: products.filter((product) => product.matchStatus === "SOURCE_ONLY")
        .length,
      localizedOnlyProducts: products.filter((product) => product.matchStatus === "LOCALIZED_ONLY")
        .length,
      sourceMatchRatePercent:
        sourceDocument.products.length === 0
          ? 100
          : roundPercent(overlappingProducts, sourceDocument.products.length),
      identityConflictCounts: conflictCounts,
      localizedCoverage: {
        title: countPopulated(localizedProducts, "title"),
        description: countPopulated(localizedProducts, "description"),
        ingredients: countPopulated(localizedProducts, "ingredients"),
        nutritionFacts: countPopulated(localizedProducts, "nutrition_facts"),
        shelfLife: countPopulated(localizedProducts, "shelf_life"),
        temperatureRange: countPopulated(localizedProducts, "temperature_range"),
        webUrl: countPopulated(localizedProducts, "web_url"),
      },
    },
    products,
  };
}

export async function runMatchLocalesCommand(arguments_: readonly string[]): Promise<void> {
  const options = parseMatchLocalesArguments(arguments_);
  const [sourceDocument, localizedDocument] = await Promise.all([
    readAggregatedDocument(options.sourceInputFile),
    readAggregatedDocument(options.localizedInputFile),
  ]);
  if (sourceDocument.locale !== options.sourceLocale) {
    throw new Error(
      `Source artifact locale ${sourceDocument.locale} не відповідає --source-locale ${options.sourceLocale}`,
    );
  }
  if (localizedDocument.locale !== options.localizedLocale) {
    throw new Error(
      `Localized artifact locale ${localizedDocument.locale} не відповідає --localized-locale ${options.localizedLocale}`,
    );
  }

  const document = matchLocaleDocuments(sourceDocument, localizedDocument);
  await mkdir(path.dirname(options.outputFile), { recursive: true });
  await writeFile(options.outputFile, `${JSON.stringify(document, null, 2)}\n`, "utf8");

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify({ success: true, outputFile: options.outputFile, statistics: document.statistics }, null, 2)}\n`,
    );
    return;
  }
  printMatchingSummary(options.outputFile, document);
}

export function parseMatchLocalesArguments(arguments_: readonly string[]): MatchLocalesCliOptions {
  let sourceLocale = "en";
  let localizedLocale = "uk";
  let sourceInputFile: string | undefined;
  let localizedInputFile: string | undefined;
  let outputFile: string | undefined;
  let json = false;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--source-locale") {
      sourceLocale = requireValue(arguments_, ++index, argument);
    } else if (argument === "--localized-locale") {
      localizedLocale = requireValue(arguments_, ++index, argument);
    } else if (argument === "--source-input") {
      sourceInputFile = path.resolve(requireValue(arguments_, ++index, argument));
    } else if (argument === "--localized-input") {
      localizedInputFile = path.resolve(requireValue(arguments_, ++index, argument));
    } else if (argument === "--output") {
      outputFile = path.resolve(requireValue(arguments_, ++index, argument));
    } else if (argument === "--json") {
      json = true;
    } else {
      throw new Error(`Невідомий аргумент match-locales: ${argument}`);
    }
  }

  if (!SAFE_LOCALE_PATTERN.test(sourceLocale)) {
    throw new Error(`Некоректний --source-locale: ${sourceLocale}`);
  }
  if (!SAFE_LOCALE_PATTERN.test(localizedLocale)) {
    throw new Error(`Некоректний --localized-locale: ${localizedLocale}`);
  }
  if (sourceLocale === localizedLocale) {
    throw new Error("Source і localized locale мають відрізнятися");
  }

  return {
    sourceLocale,
    localizedLocale,
    sourceInputFile:
      sourceInputFile ??
      path.resolve(`scripts/zakaz/data/work/products-${sourceLocale}-aggregated.json`),
    localizedInputFile:
      localizedInputFile ??
      path.resolve(`scripts/zakaz/data/work/products-${localizedLocale}-aggregated.json`),
    outputFile:
      outputFile ??
      path.resolve(
        `scripts/zakaz/data/work/products-${sourceLocale}-${localizedLocale}-matched.json`,
      ),
    json,
  };
}

export const MATCH_LOCALES_USAGE = `Глобальне зіставлення Zakaz products між локалями за store + SKU.

Usage:
  npm run zakaz -- match-locales [options]

Options:
  --source-locale <locale>     Source locale (default: en)
  --localized-locale <locale>  Localized locale (default: uk)
  --source-input <path>        Source aggregated JSON
  --localized-input <path>     Localized aggregated JSON
  --output <path>              Matched output JSON
  --json                       Вивести machine-readable summary
  --help                       Показати цю довідку
`;

function compareIdentityFields(
  sourceData: Readonly<Record<string, unknown>>,
  localizedData: Readonly<Record<string, unknown>>,
): readonly IdentityConflict[] {
  const conflicts: IdentityConflict[] = [];
  for (const field of IDENTITY_FIELDS) {
    const sourceValue = normalizeComparable(sourceData[field]);
    const localizedValue = normalizeComparable(localizedData[field]);
    if (stableStringify(sourceValue) !== stableStringify(localizedValue)) {
      conflicts.push({ field, sourceValue, localizedValue });
    }
  }
  return conflicts;
}

function indexProducts(
  products: readonly AggregatedZakazProduct[],
  locale: string,
): ReadonlyMap<string, AggregatedZakazProduct> {
  const index = new Map<string, AggregatedZakazProduct>();
  for (const product of products) {
    const key = productKey(product);
    if (index.has(key)) {
      throw new Error(
        `Aggregated artifact ${locale} містить duplicate store + SKU: ${product.sourceStoreId}/${product.sourceSku}`,
      );
    }
    index.set(key, product);
  }
  return index;
}

function productKey(product: AggregatedZakazProduct): string {
  return `${product.sourceStoreId}\u0000${product.sourceSku}`;
}

function fingerprintProduct(product: AggregatedZakazProduct): string {
  return `sha256:${createHash("sha256").update(stableStringify(product)).digest("hex")}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function normalizeComparable(value: unknown): unknown {
  if (value === undefined || value === "") return null;
  return value;
}

function countPopulated(products: readonly AggregatedZakazProduct[], field: string): number {
  return products.filter((product) => isPopulated(product.productData[field])).length;
}

function isPopulated(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined;
}

function roundPercent(value: number, total: number): number {
  return Math.round((value / total) * 10_000) / 100;
}

function initializeConflictCounts(): Record<IdentityConflictField, number> {
  return { ean: 0, unit: 0, weight: 0, volume: 0, pack_amount: 0 };
}

function validateDocumentPair(
  sourceDocument: AggregatedProductsDocument,
  localizedDocument: AggregatedProductsDocument,
): void {
  if (
    sourceDocument.schema !== AGGREGATED_PRODUCTS_SCHEMA ||
    localizedDocument.schema !== AGGREGATED_PRODUCTS_SCHEMA
  ) {
    throw new Error("Matching підтримує лише aggregated-products/v1 artifacts");
  }
  if (sourceDocument.provider !== "ZAKAZ" || localizedDocument.provider !== "ZAKAZ") {
    throw new Error("Matching підтримує лише provider ZAKAZ");
  }
  if (sourceDocument.locale === localizedDocument.locale) {
    throw new Error("Source і localized documents повинні мати різні locale");
  }
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

function printMatchingSummary(outputFile: string, document: MatchedLocalesDocument): void {
  const { statistics } = document;
  process.stdout.write(
    [
      "Zakaz locale matching: OK",
      `Locales: ${document.sourceLocale} -> ${document.localizedLocale}`,
      `Source products: ${statistics.sourceProducts}`,
      `Localized products: ${statistics.localizedProducts}`,
      `Matched: ${statistics.matchedProducts}`,
      `Match review required: ${statistics.reviewRequiredMatches}`,
      `Source only: ${statistics.sourceOnlyProducts}`,
      `Localized only: ${statistics.localizedOnlyProducts}`,
      `Source match rate: ${statistics.sourceMatchRatePercent}%`,
      `Output: ${outputFile}`,
    ].join("\n") + "\n",
  );
}

function requireValue(arguments_: readonly string[], index: number, option: string): string {
  const value = arguments_[index];
  if (!value) throw new Error(`Для ${option} потрібно передати значення`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
