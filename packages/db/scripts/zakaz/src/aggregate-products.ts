import { isDeepStrictEqual } from "node:util";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validateZakazRawDataset } from "./raw-validator.js";

export const AGGREGATED_PRODUCTS_SCHEMA = "mealmind.zakaz.aggregated-products/v1";

export interface AggregateZakazOptions {
  readonly rootDirectory: string;
  readonly locale: string;
  readonly generatedAt?: string;
}

export interface AggregatedProductObservation {
  readonly sourceCategoryId: string;
  readonly pageNumber: number;
  readonly sourceFile: string;
}

export interface AggregatedZakazProduct {
  readonly sourceStoreId: string;
  readonly sourceSku: string;
  readonly sourceCategoryIds: readonly string[];
  readonly observationCount: number;
  readonly selectedObservation: AggregatedProductObservation;
  readonly observations: readonly AggregatedProductObservation[];
  readonly conflictingFields: readonly string[];
  readonly productData: Readonly<Record<string, unknown>>;
}

export interface AggregatedProductsDocument {
  readonly schema: typeof AGGREGATED_PRODUCTS_SCHEMA;
  readonly generatedAt: string;
  readonly provider: "ZAKAZ";
  readonly locale: string;
  readonly statistics: {
    readonly stores: number;
    readonly sourcePages: number;
    readonly inputObservations: number;
    readonly uniqueProducts: number;
    readonly duplicateObservations: number;
    readonly multiCategoryProducts: number;
    readonly productsWithConflicts: number;
  };
  readonly products: readonly AggregatedZakazProduct[];
}

export interface AggregateProductsCliOptions {
  readonly rootDirectory: string;
  readonly locale: string;
  readonly outputFile: string;
  readonly pageSize: number;
  readonly json: boolean;
}

interface RawObservation {
  readonly sourceStoreId: string;
  readonly sourceSku: string;
  readonly sourceCategoryId: string;
  readonly pageNumber: number;
  readonly sourceFile: string;
  readonly product: Readonly<Record<string, unknown>>;
}

const PAGE_FILE_PATTERN = /^page-(\d{6})\.json$/u;
const CATEGORY_CONTEXT_FIELDS = new Set(["category_id", "parent_category_id", "hits"]);
const ZAKAZ_IMAGE_HOST_PATTERN = /^https:\/\/img\d+\.zakaz\.ua(?=\/)/u;

export async function aggregateZakazProducts(
  options: AggregateZakazOptions,
): Promise<AggregatedProductsDocument> {
  const rootDirectory = path.resolve(options.rootDirectory);
  const localeDirectory = path.join(rootDirectory, options.locale);
  const storesDirectory = path.join(localeDirectory, "stores");
  const storeEntries = await readdir(storesDirectory, { withFileTypes: true });
  const storeIds = storeEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const observationsByProduct = new Map<string, RawObservation[]>();
  let sourcePages = 0;
  let inputObservations = 0;

  for (const storeId of storeIds) {
    const productsDirectory = path.join(storesDirectory, storeId, "products");
    const categoryEntries = await readdir(productsDirectory, { withFileTypes: true });
    const categoryIds = categoryEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    for (const categoryId of categoryIds) {
      const categoryDirectory = path.join(productsDirectory, categoryId);
      const pageEntries = await readdir(categoryDirectory, { withFileTypes: true });
      const pages = pageEntries
        .filter((entry) => entry.isFile() && PAGE_FILE_PATTERN.test(entry.name))
        .map((entry) => ({
          fileName: entry.name,
          pageNumber: Number(PAGE_FILE_PATTERN.exec(entry.name)?.[1]),
        }))
        .sort((left, right) => left.pageNumber - right.pageNumber);

      for (const page of pages) {
        const absoluteFile = path.join(categoryDirectory, page.fileName);
        const sourceFile = toRelativePath(rootDirectory, absoluteFile);
        const response = parsePageResponse(await readFile(absoluteFile, "utf8"), sourceFile);
        sourcePages += 1;

        for (const product of response.results) {
          const sourceSku = readSourceSku(product, sourceFile);
          const key = `${storeId}\u0000${sourceSku}`;
          const observations = observationsByProduct.get(key) ?? [];
          observations.push({
            sourceStoreId: storeId,
            sourceSku,
            sourceCategoryId: categoryId,
            pageNumber: page.pageNumber,
            sourceFile,
            product,
          });
          observationsByProduct.set(key, observations);
          inputObservations += 1;
        }
      }
    }
  }

  const products = [...observationsByProduct.values()]
    .map(aggregateProductObservations)
    .sort(
      (left, right) =>
        left.sourceStoreId.localeCompare(right.sourceStoreId) ||
        left.sourceSku.localeCompare(right.sourceSku, "en", { numeric: true }),
    );

  return {
    schema: AGGREGATED_PRODUCTS_SCHEMA,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    provider: "ZAKAZ",
    locale: options.locale,
    statistics: {
      stores: storeIds.length,
      sourcePages,
      inputObservations,
      uniqueProducts: products.length,
      duplicateObservations: inputObservations - products.length,
      multiCategoryProducts: products.filter((product) => product.sourceCategoryIds.length > 1)
        .length,
      productsWithConflicts: products.filter((product) => product.conflictingFields.length > 0)
        .length,
    },
    products,
  };
}

export async function runAggregateProductsCommand(arguments_: readonly string[]): Promise<boolean> {
  const options = parseAggregateProductsArguments(arguments_);
  const validation = await validateZakazRawDataset({
    rootDirectory: options.rootDirectory,
    locale: options.locale,
    pageSize: options.pageSize,
  });

  if (!validation.valid) {
    if (options.json) {
      process.stdout.write(`${JSON.stringify({ success: false, validation }, null, 2)}\n`);
    } else {
      printValidationFailure(validation);
    }
    return false;
  }

  const document = await aggregateZakazProducts({
    rootDirectory: options.rootDirectory,
    locale: options.locale,
  });
  await writeAggregatedProducts(options.outputFile, document);

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          success: true,
          outputFile: options.outputFile,
          validation: validation.summary,
          statistics: document.statistics,
        },
        null,
        2,
      )}\n`,
    );
  } else {
    printAggregationSummary(options.outputFile, document, validation.summary.warnings);
    for (const issue of validation.issues) {
      process.stdout.write(`[${issue.severity}] ${issue.code} ${issue.file}: ${issue.message}\n`);
    }
  }

  return true;
}

export function parseAggregateProductsArguments(
  arguments_: readonly string[],
): AggregateProductsCliOptions {
  let rootDirectory = path.resolve("scripts/zakaz/data/raw");
  let locale: string | undefined;
  let outputFile: string | undefined;
  let pageSize = 30;
  let json = false;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--root") {
      rootDirectory = path.resolve(requireValue(arguments_, ++index, "--root"));
      continue;
    }
    if (argument === "--locale") {
      locale = requireValue(arguments_, ++index, "--locale");
      continue;
    }
    if (argument === "--output") {
      outputFile = path.resolve(requireValue(arguments_, ++index, "--output"));
      continue;
    }
    if (argument === "--page-size") {
      pageSize = Number(requireValue(arguments_, ++index, "--page-size"));
      if (!Number.isSafeInteger(pageSize) || pageSize <= 0) {
        throw new Error("--page-size має бути додатним цілим числом");
      }
      continue;
    }
    if (argument === "--json") {
      json = true;
      continue;
    }
    throw new Error(`Невідомий аргумент aggregate: ${argument}`);
  }

  if (!locale) throw new Error("Для aggregate потрібно передати --locale <locale>");

  return {
    rootDirectory,
    locale,
    outputFile:
      outputFile ?? path.resolve(`scripts/zakaz/data/work/products-${locale}-aggregated.json`),
    pageSize,
    json,
  };
}

export const AGGREGATE_PRODUCTS_USAGE = `Агрегація Zakaz product observations за store + SKU.

Usage:
  npm run zakaz -- aggregate --locale <locale> [options]

Options:
  --locale <locale>   Обов'язкова локаль, наприклад en або uk
  --root <path>       Raw root (default: scripts/zakaz/data/raw)
  --output <path>     Output JSON (default: data/work/products-<locale>-aggregated.json)
  --page-size <n>     Розмір сторінки API (default: 30)
  --json              Вивести machine-readable summary
  --help              Показати цю довідку
`;

async function writeAggregatedProducts(
  outputFile: string,
  document: AggregatedProductsDocument,
): Promise<void> {
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(document, null, 2)}\n`, "utf8");
}

function aggregateProductObservations(
  observations: readonly RawObservation[],
): AggregatedZakazProduct {
  const sorted = [...observations].sort(
    (left, right) =>
      left.sourceFile.localeCompare(right.sourceFile) || left.pageNumber - right.pageNumber,
  );
  const selected = sorted[0];
  if (!selected) throw new Error("Не вдалося вибрати observation для агрегованого товару");

  const productData: Record<string, unknown> = { ...selected.product };
  for (const field of CATEGORY_CONTEXT_FIELDS) Reflect.deleteProperty(productData, field);

  return {
    sourceStoreId: selected.sourceStoreId,
    sourceSku: selected.sourceSku,
    sourceCategoryIds: [...new Set(sorted.map((item) => item.sourceCategoryId))].sort(),
    observationCount: sorted.length,
    selectedObservation: toPublicObservation(selected),
    observations: sorted.map(toPublicObservation),
    conflictingFields: findConflictingFields(sorted),
    productData,
  };
}

function findConflictingFields(observations: readonly RawObservation[]): readonly string[] {
  const selected = observations[0];
  if (!selected) return [];

  const fields = new Set<string>();
  for (const observation of observations) {
    for (const field of new Set([
      ...Object.keys(selected.product),
      ...Object.keys(observation.product),
    ])) {
      if (CATEGORY_CONTEXT_FIELDS.has(field)) continue;
      if (
        !isDeepStrictEqual(
          normalizeForConflictComparison(selected.product[field]),
          normalizeForConflictComparison(observation.product[field]),
        )
      )
        fields.add(field);
    }
  }
  return [...fields].sort();
}

function normalizeForConflictComparison(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(ZAKAZ_IMAGE_HOST_PATTERN, "https://img.zakaz.ua");
  }
  if (Array.isArray(value)) return value.map(normalizeForConflictComparison);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      normalizeForConflictComparison(nestedValue),
    ]),
  );
}

function toPublicObservation(observation: RawObservation): AggregatedProductObservation {
  return {
    sourceCategoryId: observation.sourceCategoryId,
    pageNumber: observation.pageNumber,
    sourceFile: observation.sourceFile,
  };
}

function parsePageResponse(
  content: string,
  sourceFile: string,
): {
  readonly results: readonly Readonly<Record<string, unknown>>[];
} {
  const value = JSON.parse(content) as unknown;
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new Error(`Некоректний product response: ${sourceFile}`);
  }
  if (!value.results.every(isRecord)) {
    throw new Error(`Некоректний product у results: ${sourceFile}`);
  }
  return { results: value.results };
}

function readSourceSku(product: Readonly<Record<string, unknown>>, sourceFile: string): string {
  if (typeof product.sku !== "string" || product.sku.trim().length === 0) {
    throw new Error(`Product без валідного SKU: ${sourceFile}`);
  }
  return product.sku;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireValue(arguments_: readonly string[], index: number, option: string): string {
  const value = arguments_[index];
  if (!value) throw new Error(`Для ${option} потрібно передати значення`);
  return value;
}

function toRelativePath(rootDirectory: string, target: string): string {
  return path.relative(rootDirectory, target).split(path.sep).join("/");
}

function printValidationFailure(
  validation: Awaited<ReturnType<typeof validateZakazRawDataset>>,
): void {
  process.stdout.write(
    `Zakaz raw validation: FAILED (${validation.summary.errors} errors, ${validation.summary.warnings} warnings)\n`,
  );
  for (const issue of validation.issues) {
    process.stdout.write(`[${issue.severity}] ${issue.code} ${issue.file}: ${issue.message}\n`);
  }
}

function printAggregationSummary(
  outputFile: string,
  document: AggregatedProductsDocument,
  validationWarnings: number,
): void {
  const { statistics } = document;
  process.stdout.write(
    [
      "Zakaz product aggregation: OK",
      `Locale: ${document.locale}`,
      `Stores: ${statistics.stores}`,
      `Source pages: ${statistics.sourcePages}`,
      `Input observations: ${statistics.inputObservations}`,
      `Unique products: ${statistics.uniqueProducts}`,
      `Duplicate observations: ${statistics.duplicateObservations}`,
      `Multi-category products: ${statistics.multiCategoryProducts}`,
      `Products with conflicts: ${statistics.productsWithConflicts}`,
      `Validation warnings: ${validationWarnings}`,
      `Output: ${outputFile}`,
    ].join("\n") + "\n",
  );
}
