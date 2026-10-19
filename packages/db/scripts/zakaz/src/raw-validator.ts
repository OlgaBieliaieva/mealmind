import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type RawValidationSeverity = "ERROR" | "WARNING";

export interface RawValidationIssue {
  readonly severity: RawValidationSeverity;
  readonly code: string;
  readonly file: string;
  readonly message: string;
}

export interface RawValidationSummary {
  readonly locales: number;
  readonly stores: number;
  readonly categories: number;
  readonly pages: number;
  readonly productRows: number;
  readonly errors: number;
  readonly warnings: number;
}

export interface RawValidationResult {
  readonly valid: boolean;
  readonly summary: RawValidationSummary;
  readonly issues: readonly RawValidationIssue[];
}

export interface ValidateZakazRawOptions {
  readonly rootDirectory: string;
  readonly locale?: string;
  readonly pageSize?: number;
}

interface MutableSummary {
  locales: number;
  stores: number;
  categories: number;
  pages: number;
  productRows: number;
}

interface PageSnapshot {
  readonly pageNumber: number;
  readonly file: string;
  readonly declaredCount: number;
  readonly availableCount: number;
  readonly rowCount: number;
  readonly skuValues: readonly string[];
  readonly hash: string;
}

interface ParsedPathContext {
  readonly locale: string;
  readonly storeId: string;
  readonly categoryId: string;
}

const PAGE_FILE_PATTERN = /^page-(\d{6})\.json$/u;

export async function validateZakazRawDataset(
  options: ValidateZakazRawOptions,
): Promise<RawValidationResult> {
  const pageSize = options.pageSize ?? 30;
  if (!Number.isSafeInteger(pageSize) || pageSize <= 0) {
    throw new Error("pageSize має бути додатним цілим числом");
  }

  const rootDirectory = path.resolve(options.rootDirectory);
  const issues: RawValidationIssue[] = [];
  const summary: MutableSummary = {
    locales: 0,
    stores: 0,
    categories: 0,
    pages: 0,
    productRows: 0,
  };
  const pageHashes = new Map<string, string[]>();

  const localeEntries = await readDirectories(rootDirectory, issues, rootDirectory);
  const selectedLocales = options.locale
    ? localeEntries.filter((entry) => entry === options.locale)
    : localeEntries;

  if (options.locale && selectedLocales.length === 0) {
    addIssue(
      issues,
      "ERROR",
      "LOCALE_NOT_FOUND",
      relativePath(rootDirectory, path.join(rootDirectory, options.locale)),
      `Локаль "${options.locale}" не знайдена`,
    );
  }

  for (const locale of selectedLocales) {
    summary.locales += 1;
    const localeDirectory = path.join(rootDirectory, locale);
    const storesFile = path.join(localeDirectory, "stores.json");
    const registeredStoreIds = await readStoreIds(storesFile, rootDirectory, issues);
    const storesDirectory = path.join(localeDirectory, "stores");
    const storeIds = await readDirectories(storesDirectory, issues, rootDirectory);

    for (const storeId of storeIds) {
      summary.stores += 1;
      const storeDirectory = path.join(storesDirectory, storeId);
      if (!registeredStoreIds.has(storeId)) {
        addIssue(
          issues,
          "ERROR",
          "STORE_NOT_REGISTERED",
          relativePath(rootDirectory, storeDirectory),
          `Store ${storeId} відсутній у ${locale}/stores.json`,
        );
      }

      const categoriesFile = path.join(storeDirectory, "categories.json");
      const registeredCategoryIds = await readCategoryIds(categoriesFile, rootDirectory, issues);
      const productsDirectory = path.join(storeDirectory, "products");
      const categoryIds = await readDirectories(productsDirectory, issues, rootDirectory);

      for (const categoryId of categoryIds) {
        summary.categories += 1;
        const categoryDirectory = path.join(productsDirectory, categoryId);
        if (!registeredCategoryIds.has(categoryId)) {
          addIssue(
            issues,
            "ERROR",
            "CATEGORY_NOT_REGISTERED",
            relativePath(rootDirectory, categoryDirectory),
            `Категорія ${categoryId} відсутня у categories.json store ${storeId}`,
          );
        }

        const snapshots = await validateCategoryPages({
          rootDirectory,
          categoryDirectory,
          context: { locale, storeId, categoryId },
          pageSize,
          issues,
          summary,
        });

        for (const snapshot of snapshots) {
          const files = pageHashes.get(snapshot.hash) ?? [];
          files.push(snapshot.file);
          pageHashes.set(snapshot.hash, files);
        }
      }
    }
  }

  for (const files of pageHashes.values()) {
    if (files.length < 2) continue;

    for (const file of files) {
      addIssue(
        issues,
        "ERROR",
        "DUPLICATE_PAGE_CONTENT",
        file,
        `Вміст сторінки ідентичний файлам: ${files.filter((item) => item !== file).join(", ")}`,
      );
    }
  }

  issues.sort(compareIssues);
  const errors = issues.filter((issue) => issue.severity === "ERROR").length;
  const warnings = issues.length - errors;

  return {
    valid: errors === 0,
    summary: Object.freeze({ ...summary, errors, warnings }),
    issues: Object.freeze(issues),
  };
}

async function validateCategoryPages(input: {
  readonly rootDirectory: string;
  readonly categoryDirectory: string;
  readonly context: ParsedPathContext;
  readonly pageSize: number;
  readonly issues: RawValidationIssue[];
  readonly summary: MutableSummary;
}): Promise<readonly PageSnapshot[]> {
  const entries = await safeReadDirectory(
    input.categoryDirectory,
    input.issues,
    input.rootDirectory,
  );
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();
  const pageFiles: Array<{ fileName: string; pageNumber: number }> = [];

  for (const fileName of jsonFiles) {
    const match = PAGE_FILE_PATTERN.exec(fileName);
    if (!match) {
      addIssue(
        input.issues,
        "ERROR",
        "INVALID_PAGE_FILE_NAME",
        relativePath(input.rootDirectory, path.join(input.categoryDirectory, fileName)),
        "Очікується назва page-000001.json",
      );
      continue;
    }

    pageFiles.push({ fileName, pageNumber: Number(match[1]) });
  }

  if (pageFiles.length === 0) {
    addIssue(
      input.issues,
      "ERROR",
      "CATEGORY_WITHOUT_PAGES",
      relativePath(input.rootDirectory, input.categoryDirectory),
      "Категорія не містить жодної product page",
    );
    return [];
  }

  const duplicatePageNumbers = findDuplicates(pageFiles.map((page) => page.pageNumber));
  for (const pageNumber of duplicatePageNumbers) {
    addIssue(
      input.issues,
      "ERROR",
      "DUPLICATE_PAGE_NUMBER",
      relativePath(input.rootDirectory, input.categoryDirectory),
      `Номер сторінки ${pageNumber} зустрічається кілька разів`,
    );
  }

  const snapshots: PageSnapshot[] = [];
  for (const page of pageFiles) {
    const absoluteFile = path.join(input.categoryDirectory, page.fileName);
    const file = relativePath(input.rootDirectory, absoluteFile);
    const content = await readText(absoluteFile, file, input.issues);
    if (content === null) continue;

    input.summary.pages += 1;
    const value = parseJson(content, file, input.issues);
    if (value === null) continue;

    const snapshot = validatePageResponse({
      value,
      content,
      file,
      pageNumber: page.pageNumber,
      context: input.context,
      issues: input.issues,
    });
    if (snapshot === null) continue;

    input.summary.productRows += snapshot.rowCount;
    snapshots.push(snapshot);
  }

  validatePagination(
    snapshots,
    input.pageSize,
    input.categoryDirectory,
    input.rootDirectory,
    input.issues,
  );
  return snapshots;
}

function validatePageResponse(input: {
  readonly value: unknown;
  readonly content: string;
  readonly file: string;
  readonly pageNumber: number;
  readonly context: ParsedPathContext;
  readonly issues: RawValidationIssue[];
}): PageSnapshot | null {
  if (!isRecord(input.value)) {
    addIssue(input.issues, "ERROR", "INVALID_RESPONSE", input.file, "Корінь JSON має бути object");
    return null;
  }

  const declaredCount = readNonNegativeInteger(input.value.count);
  const availableCount = readNonNegativeInteger(input.value.count_available);
  const results = input.value.results;
  let structurallyValid = true;

  if (declaredCount === null) {
    structurallyValid = false;
    addIssue(
      input.issues,
      "ERROR",
      "INVALID_COUNT",
      input.file,
      "count має бути невід’ємним цілим числом",
    );
  }
  if (availableCount === null) {
    structurallyValid = false;
    addIssue(
      input.issues,
      "ERROR",
      "INVALID_AVAILABLE_COUNT",
      input.file,
      "count_available має бути невід’ємним цілим числом",
    );
  }
  if (!Array.isArray(results)) {
    structurallyValid = false;
    addIssue(input.issues, "ERROR", "INVALID_RESULTS", input.file, "results має бути array");
  }

  if (
    !structurallyValid ||
    declaredCount === null ||
    availableCount === null ||
    !Array.isArray(results)
  ) {
    return null;
  }

  if (availableCount > declaredCount) {
    addIssue(
      input.issues,
      "ERROR",
      "AVAILABLE_COUNT_EXCEEDS_COUNT",
      input.file,
      `count_available ${availableCount} перевищує count ${declaredCount}`,
    );
  }

  validateResponseMetadata(input.value, input.file, input.issues);

  const skuValues: string[] = [];
  results.forEach((product, index) => {
    const location = `${input.file}#results[${index}]`;
    if (!isRecord(product)) {
      addIssue(input.issues, "ERROR", "INVALID_PRODUCT", location, "Product має бути object");
      return;
    }

    const sku = readNonEmptyString(product.sku);
    const categoryId = readNonEmptyString(product.category_id);
    if (sku === null) {
      addIssue(
        input.issues,
        "ERROR",
        "INVALID_PRODUCT_SKU",
        location,
        "sku має бути непорожнім string",
      );
    } else {
      skuValues.push(sku);
    }
    if (categoryId === null) {
      addIssue(
        input.issues,
        "ERROR",
        "INVALID_PRODUCT_CATEGORY",
        location,
        "category_id має бути непорожнім string",
      );
    } else if (categoryId !== input.context.categoryId) {
      addIssue(
        input.issues,
        "ERROR",
        "PRODUCT_CATEGORY_MISMATCH",
        location,
        `category_id "${categoryId}" не відповідає директорії "${input.context.categoryId}"`,
      );
    }

    validateRequiredString(product.title, "title", location, input.issues);
    validateRequiredString(product.ean, "ean", location, input.issues);
    if (typeof product.in_stock !== "boolean") {
      addIssue(
        input.issues,
        "ERROR",
        "INVALID_PRODUCT_IN_STOCK",
        location,
        "in_stock має бути boolean",
      );
    }
  });

  return {
    pageNumber: input.pageNumber,
    file: input.file,
    declaredCount,
    availableCount,
    rowCount: results.length,
    skuValues,
    hash: createHash("sha256").update(input.content).digest("hex"),
  };
}

function validateResponseMetadata(
  value: Record<string, unknown>,
  file: string,
  issues: RawValidationIssue[],
): void {
  const arrayFields = ["categories", "filters"] as const;
  for (const field of arrayFields) {
    if (!Array.isArray(value[field])) {
      addIssue(issues, "ERROR", "INVALID_RESPONSE_FIELD", file, `${field} має бути array`);
    }
  }

  if (value.category_results !== null && !Array.isArray(value.category_results)) {
    addIssue(
      issues,
      "ERROR",
      "INVALID_RESPONSE_FIELD",
      file,
      "category_results має бути null або array",
    );
  }
  if (typeof value.is_fuzzy !== "boolean") {
    addIssue(issues, "ERROR", "INVALID_RESPONSE_FIELD", file, "is_fuzzy має бути boolean");
  }
  if (!isRecord(value.stats)) {
    addIssue(issues, "ERROR", "INVALID_RESPONSE_FIELD", file, "stats має бути object");
  }
}

function validatePagination(
  snapshots: readonly PageSnapshot[],
  pageSize: number,
  categoryDirectory: string,
  rootDirectory: string,
  issues: RawValidationIssue[],
): void {
  if (snapshots.length === 0) return;

  const categoryPath = relativePath(rootDirectory, categoryDirectory);
  const declaredCounts = [...new Set(snapshots.map((page) => page.declaredCount))];
  if (declaredCounts.length !== 1) {
    addIssue(
      issues,
      "ERROR",
      "COUNT_CHANGED_BETWEEN_PAGES",
      categoryPath,
      `Сторінки містять різні count: ${declaredCounts.join(", ")}`,
    );
    return;
  }

  const declaredCount = declaredCounts[0] ?? 0;
  const expectedPageCount = Math.max(1, Math.ceil(declaredCount / pageSize));
  const actualPageNumbers = new Set(snapshots.map((page) => page.pageNumber));
  const missingPages: number[] = [];
  for (let pageNumber = 1; pageNumber <= expectedPageCount; pageNumber += 1) {
    if (!actualPageNumbers.has(pageNumber)) missingPages.push(pageNumber);
  }
  if (missingPages.length > 0) {
    addIssue(
      issues,
      "ERROR",
      "MISSING_PAGES",
      categoryPath,
      `Відсутні сторінки: ${missingPages.join(", ")}`,
    );
  }

  const unexpectedPages = [...actualPageNumbers].filter(
    (pageNumber) => pageNumber > expectedPageCount,
  );
  if (unexpectedPages.length > 0) {
    addIssue(
      issues,
      "ERROR",
      "UNEXPECTED_PAGES",
      categoryPath,
      `Зайві сторінки: ${unexpectedPages.sort((a, b) => a - b).join(", ")}`,
    );
  }

  const rowCount = snapshots.reduce((sum, page) => sum + page.rowCount, 0);
  if (rowCount !== declaredCount) {
    addIssue(
      issues,
      "ERROR",
      "ROW_COUNT_MISMATCH",
      categoryPath,
      `Сума results ${rowCount} не відповідає count ${declaredCount}`,
    );
  }

  const duplicateSkus = findDuplicates(snapshots.flatMap((page) => page.skuValues));
  if (duplicateSkus.length > 0) {
    addIssue(
      issues,
      "ERROR",
      "DUPLICATE_SKU_IN_CATEGORY",
      categoryPath,
      `SKU повторюються між сторінками: ${duplicateSkus.slice(0, 20).join(", ")}`,
    );
  }

  const availableCounts = [...new Set(snapshots.map((page) => page.availableCount))];
  if (availableCounts.length > 1) {
    addIssue(
      issues,
      "WARNING",
      "AVAILABLE_COUNT_CHANGED_BETWEEN_PAGES",
      categoryPath,
      `count_available змінився під час завантаження: ${availableCounts.join(", ")}`,
    );
  }
}

async function readStoreIds(
  filePath: string,
  rootDirectory: string,
  issues: RawValidationIssue[],
): Promise<ReadonlySet<string>> {
  const file = relativePath(rootDirectory, filePath);
  const value = await readJson(filePath, file, issues);
  const ids = new Set<string>();
  if (value === null) return ids;
  if (!Array.isArray(value)) {
    addIssue(issues, "ERROR", "INVALID_STORES", file, "stores.json має містити array");
    return ids;
  }

  value.forEach((store, index) => {
    const id = isRecord(store) ? readNonEmptyString(store.id) : null;
    if (id === null) {
      addIssue(
        issues,
        "ERROR",
        "INVALID_STORE_ID",
        `${file}#[${index}]`,
        "Store id має бути непорожнім string",
      );
    } else if (ids.has(id)) {
      addIssue(
        issues,
        "ERROR",
        "DUPLICATE_STORE_ID",
        `${file}#[${index}]`,
        `Store id ${id} дублюється`,
      );
    } else {
      ids.add(id);
    }
  });
  return ids;
}

async function readCategoryIds(
  filePath: string,
  rootDirectory: string,
  issues: RawValidationIssue[],
): Promise<ReadonlySet<string>> {
  const file = relativePath(rootDirectory, filePath);
  const value = await readJson(filePath, file, issues);
  const ids = new Set<string>();
  if (value === null) return ids;
  if (!Array.isArray(value)) {
    addIssue(issues, "ERROR", "INVALID_CATEGORIES", file, "categories.json має містити array");
    return ids;
  }

  visitCategories(value, file, ids, issues);
  return ids;
}

function visitCategories(
  categories: readonly unknown[],
  file: string,
  ids: Set<string>,
  issues: RawValidationIssue[],
): void {
  categories.forEach((category, index) => {
    const location = `${file}#category[${index}]`;
    if (!isRecord(category)) {
      addIssue(issues, "ERROR", "INVALID_CATEGORY", location, "Category має бути object");
      return;
    }

    const id = readNonEmptyString(category.id);
    if (id === null) {
      addIssue(
        issues,
        "ERROR",
        "INVALID_CATEGORY_ID",
        location,
        "Category id має бути непорожнім string",
      );
    } else if (ids.has(id)) {
      addIssue(
        issues,
        "ERROR",
        "DUPLICATE_CATEGORY_ID",
        location,
        `Category id ${id} дублюється у taxonomy`,
      );
    } else {
      ids.add(id);
    }

    if (category.children === undefined || category.children === null) return;
    if (!Array.isArray(category.children)) {
      addIssue(issues, "ERROR", "INVALID_CATEGORY_CHILDREN", location, "children має бути array");
      return;
    }
    visitCategories(category.children, file, ids, issues);
  });
}

async function readJson(
  absoluteFile: string,
  file: string,
  issues: RawValidationIssue[],
): Promise<unknown | null> {
  const content = await readText(absoluteFile, file, issues);
  return content === null ? null : parseJson(content, file, issues);
}

async function readText(
  absoluteFile: string,
  file: string,
  issues: RawValidationIssue[],
): Promise<string | null> {
  try {
    return await readFile(absoluteFile, "utf8");
  } catch (error: unknown) {
    addIssue(issues, "ERROR", "FILE_READ_FAILED", file, errorMessage(error));
    return null;
  }
}

function parseJson(content: string, file: string, issues: RawValidationIssue[]): unknown | null {
  try {
    return JSON.parse(content) as unknown;
  } catch (error: unknown) {
    addIssue(issues, "ERROR", "INVALID_JSON", file, errorMessage(error));
    return null;
  }
}

async function readDirectories(
  directory: string,
  issues: RawValidationIssue[],
  rootDirectory: string,
): Promise<readonly string[]> {
  const entries = await safeReadDirectory(directory, issues, rootDirectory);
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function safeReadDirectory(
  directory: string,
  issues: RawValidationIssue[],
  rootDirectory: string,
) {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch (error: unknown) {
    addIssue(
      issues,
      "ERROR",
      "DIRECTORY_READ_FAILED",
      relativePath(rootDirectory, directory),
      errorMessage(error),
    );
    return [];
  }
}

function validateRequiredString(
  value: unknown,
  field: string,
  location: string,
  issues: RawValidationIssue[],
): void {
  if (readNonEmptyString(value) !== null) return;
  addIssue(
    issues,
    "ERROR",
    "INVALID_PRODUCT_FIELD",
    location,
    `${field} має бути непорожнім string`,
  );
}

function readNonNegativeInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : null;
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findDuplicates<TValue extends string | number>(values: readonly TValue[]): TValue[] {
  const seen = new Set<TValue>();
  const duplicates = new Set<TValue>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort((left, right) => String(left).localeCompare(String(right)));
}

function addIssue(
  issues: RawValidationIssue[],
  severity: RawValidationSeverity,
  code: string,
  file: string,
  message: string,
): void {
  issues.push({ severity, code, file, message });
}

function relativePath(rootDirectory: string, target: string): string {
  const relative = path.relative(rootDirectory, target);
  return (relative || ".").split(path.sep).join("/");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function compareIssues(left: RawValidationIssue, right: RawValidationIssue): number {
  if (left.severity !== right.severity) return left.severity === "ERROR" ? -1 : 1;
  return left.file.localeCompare(right.file) || left.code.localeCompare(right.code);
}
