import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { validateZakazRawDataset } from "./raw-validator.js";

export const ZAKAZ_API_ORIGIN = "https://stores-api.zakaz.ua";
export const DOWNLOAD_MANIFEST_SCHEMA = "mealmind.zakaz.download-manifest/v1";

type FetchImplementation = typeof fetch;
type SleepImplementation = (milliseconds: number) => Promise<void>;

export interface DownloadLocaleOptions {
  readonly rootDirectory: string;
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly acceptLanguage: string;
  readonly pageSize: number;
  readonly concurrency: number;
  readonly delayMs: number;
  readonly timeoutMs: number;
  readonly retries: number;
  readonly resume: boolean;
  readonly json: boolean;
}

export interface DownloadLocaleDependencies {
  readonly fetch?: FetchImplementation;
  readonly sleep?: SleepImplementation;
  readonly now?: () => string;
}

export interface DownloadLocaleResult {
  readonly manifestFile: string;
  readonly stores: number;
  readonly categories: number;
  readonly downloadedCategories: number;
  readonly skippedCategories: number;
  readonly pages: number;
  readonly products: number;
}

interface DownloadManifestFile {
  path: string;
  sha256: string;
}

interface DownloadManifestCategory {
  categoryId: string;
  status: "PENDING" | "DOWNLOADING" | "COMPLETE" | "FAILED";
  attempts: number;
  pages: number;
  products: number;
  files: DownloadManifestFile[];
  error: string | null;
}

interface DownloadManifestStore {
  storeId: string;
  categories: DownloadManifestCategory[];
}

interface DownloadManifest {
  schema: typeof DOWNLOAD_MANIFEST_SCHEMA;
  sourceLocale: string;
  targetLocale: string;
  acceptLanguage: string;
  apiOrigin: typeof ZAKAZ_API_ORIGIN;
  pageSize: number;
  status: "IN_PROGRESS" | "COMPLETE" | "FAILED";
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  stores: DownloadManifestStore[];
}

interface DownloadScopeStore {
  readonly storeId: string;
  readonly categoryIds: readonly string[];
}

interface JsonResponse {
  readonly value: unknown;
  readonly text: string;
}

interface DownloadedCategory {
  readonly pages: number;
  readonly products: number;
  readonly files: readonly DownloadManifestFile[];
}

interface ProductPage {
  readonly count: number;
  readonly results: readonly Record<string, unknown>[];
}

const SAFE_LOCALE_PATTERN = /^[a-z]{2,3}$/u;
const ACCEPT_LANGUAGE_PATTERN = /^[a-z]{2,3}(?:-[A-Z]{2})?$/u;
const CATEGORY_DOWNLOAD_ATTEMPTS = 2;

export async function downloadLocalizedSnapshot(
  options: DownloadLocaleOptions,
  dependencies: DownloadLocaleDependencies = {},
): Promise<DownloadLocaleResult> {
  validateDownloadOptions(options);
  const rootDirectory = path.resolve(options.rootDirectory);
  const sourceDirectory = path.join(rootDirectory, options.sourceLocale);
  const targetDirectory = path.join(rootDirectory, options.targetLocale);
  const manifestFile = path.join(targetDirectory, "download-manifest.json");
  const fetchImplementation = dependencies.fetch ?? globalThis.fetch;
  const sleepImplementation = dependencies.sleep ?? defaultSleep;
  const now = dependencies.now ?? (() => new Date().toISOString());

  if (typeof fetchImplementation !== "function") {
    throw new Error("Поточна версія Node.js не підтримує fetch");
  }

  const sourceValidation = await validateZakazRawDataset({
    rootDirectory,
    locale: options.sourceLocale,
    pageSize: options.pageSize,
  });
  if (!sourceValidation.valid) {
    throw new Error(
      `Source raw dataset ${options.sourceLocale} не пройшов validation: ${sourceValidation.summary.errors} errors`,
    );
  }

  const scope = await discoverDownloadScope(sourceDirectory);
  if (scope.length === 0) {
    throw new Error(`У source locale ${options.sourceLocale} не знайдено product categories`);
  }

  const targetExists = await pathExists(targetDirectory);
  if (targetExists && !options.resume) {
    throw new Error(
      `Target locale ${options.targetLocale} уже існує. Використайте --resume лише для продовження цього snapshot`,
    );
  }

  let manifest: DownloadManifest;
  if (targetExists) {
    manifest = await readManifest(manifestFile);
    validateResumeManifest(manifest, options, scope);
  } else {
    await mkdir(targetDirectory, { recursive: true });
    manifest = createManifest(options, scope, now());
  }

  let manifestWrites = Promise.resolve();
  const persistManifest = (): Promise<void> => {
    manifest.updatedAt = now();
    const snapshot = `${JSON.stringify(manifest, null, 2)}\n`;
    manifestWrites = manifestWrites.then(() => writeTextAtomic(manifestFile, snapshot));
    return manifestWrites;
  };

  await persistManifest();
  await ensureStoresRegistry(sourceDirectory, targetDirectory);
  await ensureLocalizedCategoryTaxonomies({
    scope,
    targetDirectory,
    options,
    fetchImplementation,
    sleepImplementation,
  });

  const categoryTasks = manifest.stores.flatMap((store) =>
    store.categories.map((category) => ({ store, category })),
  );
  let downloadedCategories = 0;
  let skippedCategories = 0;
  const failures: string[] = [];
  let nextTaskIndex = 0;

  const worker = async (): Promise<void> => {
    while (nextTaskIndex < categoryTasks.length) {
      const task = categoryTasks[nextTaskIndex++];
      if (!task) return;
      const finalDirectory = categoryDirectory(
        targetDirectory,
        task.store.storeId,
        task.category.categoryId,
      );

      if (task.category.status === "COMPLETE" && (await pathExists(finalDirectory))) {
        skippedCategories += 1;
        continue;
      }

      if (await pathExists(finalDirectory)) {
        throw new Error(
          `Знайдено category directory без COMPLETE manifest state: ${finalDirectory}`,
        );
      }

      task.category.status = "DOWNLOADING";
      task.category.attempts += 1;
      task.category.error = null;
      await persistManifest();

      try {
        const result = await downloadCategoryWithConsistencyRetry({
          targetDirectory,
          storeId: task.store.storeId,
          categoryId: task.category.categoryId,
          options,
          fetchImplementation,
          sleepImplementation,
        });
        task.category.status = "COMPLETE";
        task.category.pages = result.pages;
        task.category.products = result.products;
        task.category.files = [...result.files];
        downloadedCategories += 1;
      } catch (error: unknown) {
        const message = errorMessage(error);
        task.category.status = "FAILED";
        task.category.error = message;
        failures.push(`${task.store.storeId}/${task.category.categoryId}: ${message}`);
      }
      await persistManifest();
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(options.concurrency, categoryTasks.length) }, () => worker()),
  );
  await manifestWrites;

  if (failures.length > 0) {
    manifest.status = "FAILED";
    await persistManifest();
    throw new Error(
      `Не вдалося завантажити ${failures.length} categories:\n${failures.slice(0, 20).join("\n")}`,
    );
  }

  const validation = await validateZakazRawDataset({
    rootDirectory,
    locale: options.targetLocale,
    pageSize: options.pageSize,
  });
  if (!validation.valid) {
    manifest.status = "FAILED";
    await persistManifest();
    throw new Error(
      `Завантажений ${options.targetLocale} snapshot не пройшов validation: ${validation.summary.errors} errors`,
    );
  }

  manifest.status = "COMPLETE";
  manifest.completedAt = now();
  await persistManifest();

  const completed = manifest.stores.flatMap((store) => store.categories);
  return {
    manifestFile,
    stores: manifest.stores.length,
    categories: completed.length,
    downloadedCategories,
    skippedCategories,
    pages: completed.reduce((sum, category) => sum + category.pages, 0),
    products: completed.reduce((sum, category) => sum + category.products, 0),
  };
}

export async function runDownloadLocaleCommand(arguments_: readonly string[]): Promise<void> {
  const options = parseDownloadLocaleArguments(arguments_);
  const result = await downloadLocalizedSnapshot(options);

  if (options.json) {
    process.stdout.write(`${JSON.stringify({ success: true, ...result }, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    [
      "Zakaz localized snapshot download: OK",
      `Locale: ${options.targetLocale} (${options.acceptLanguage})`,
      `Stores: ${result.stores}`,
      `Categories: ${result.categories}`,
      `Downloaded categories: ${result.downloadedCategories}`,
      `Skipped categories: ${result.skippedCategories}`,
      `Pages: ${result.pages}`,
      `Product observations: ${result.products}`,
      `Manifest: ${result.manifestFile}`,
    ].join("\n") + "\n",
  );
}

export function parseDownloadLocaleArguments(arguments_: readonly string[]): DownloadLocaleOptions {
  let rootDirectory = path.resolve("scripts/zakaz/data/raw");
  let sourceLocale = "en";
  let targetLocale = "uk";
  let acceptLanguage = "uk-UA";
  let pageSize = 30;
  let concurrency = 2;
  let delayMs = 200;
  let timeoutMs = 20_000;
  let retries = 3;
  let resume = false;
  let json = false;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--root") {
      rootDirectory = path.resolve(requireValue(arguments_, ++index, argument));
    } else if (argument === "--source-locale") {
      sourceLocale = requireValue(arguments_, ++index, argument);
    } else if (argument === "--locale") {
      targetLocale = requireValue(arguments_, ++index, argument);
    } else if (argument === "--accept-language") {
      acceptLanguage = requireValue(arguments_, ++index, argument);
    } else if (argument === "--page-size") {
      pageSize = parseNonNegativeInteger(requireValue(arguments_, ++index, argument), argument, 1);
    } else if (argument === "--concurrency") {
      concurrency = parseNonNegativeInteger(
        requireValue(arguments_, ++index, argument),
        argument,
        1,
      );
    } else if (argument === "--delay-ms") {
      delayMs = parseNonNegativeInteger(requireValue(arguments_, ++index, argument), argument, 0);
    } else if (argument === "--timeout-ms") {
      timeoutMs = parseNonNegativeInteger(requireValue(arguments_, ++index, argument), argument, 1);
    } else if (argument === "--retries") {
      retries = parseNonNegativeInteger(requireValue(arguments_, ++index, argument), argument, 0);
    } else if (argument === "--resume") {
      resume = true;
    } else if (argument === "--json") {
      json = true;
    } else {
      throw new Error(`Невідомий аргумент download-locale: ${argument}`);
    }
  }

  const options = {
    rootDirectory,
    sourceLocale,
    targetLocale,
    acceptLanguage,
    pageSize,
    concurrency,
    delayMs,
    timeoutMs,
    retries,
    resume,
    json,
  };
  validateDownloadOptions(options);
  return options;
}

export const DOWNLOAD_LOCALE_USAGE = `Завантаження локалізованого Zakaz raw snapshot.

Usage:
  npm run zakaz -- download-locale [options]

Options:
  --source-locale <locale>  Локаль зі scope категорій (default: en)
  --locale <locale>         Цільова локаль (default: uk)
  --accept-language <tag>   HTTP Accept-Language (default: uk-UA)
  --root <path>             Raw data root (default: data/raw)
  --page-size <number>      Розмір сторінки Zakaz (default: 30)
  --concurrency <number>    Паралельні category downloads (default: 2)
  --delay-ms <number>       Мінімальна затримка після request (default: 200)
  --timeout-ms <number>     Timeout одного request (default: 20000)
  --retries <number>        Retry після 429/5xx/network error (default: 3)
  --resume                  Продовжити незавершений snapshot
  --json                    Вивести machine-readable summary
  --help                    Показати цю довідку
`;

export function buildCategoriesUrl(storeId: string): string {
  return new URL(`/stores/${encodeURIComponent(storeId)}/categories`, ZAKAZ_API_ORIGIN).href;
}

export function buildProductsUrl(storeId: string, categoryId: string, pageNumber: number): string {
  const url = new URL(
    `/stores/${encodeURIComponent(storeId)}/categories/${encodeURIComponent(categoryId)}/products`,
    ZAKAZ_API_ORIGIN,
  );
  url.searchParams.set("page", String(pageNumber));
  return url.href;
}

async function discoverDownloadScope(
  sourceDirectory: string,
): Promise<readonly DownloadScopeStore[]> {
  const storesDirectory = path.join(sourceDirectory, "stores");
  const storeEntries = await readdir(storesDirectory, { withFileTypes: true });
  const stores: DownloadScopeStore[] = [];

  for (const storeEntry of storeEntries.filter((entry) => entry.isDirectory())) {
    const productsDirectory = path.join(storesDirectory, storeEntry.name, "products");
    const categoryEntries = await readdir(productsDirectory, { withFileTypes: true });
    const categoryIds = categoryEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    if (categoryIds.length > 0) stores.push({ storeId: storeEntry.name, categoryIds });
  }

  return stores.sort((left, right) => left.storeId.localeCompare(right.storeId));
}

function createManifest(
  options: DownloadLocaleOptions,
  scope: readonly DownloadScopeStore[],
  startedAt: string,
): DownloadManifest {
  return {
    schema: DOWNLOAD_MANIFEST_SCHEMA,
    sourceLocale: options.sourceLocale,
    targetLocale: options.targetLocale,
    acceptLanguage: options.acceptLanguage,
    apiOrigin: ZAKAZ_API_ORIGIN,
    pageSize: options.pageSize,
    status: "IN_PROGRESS",
    startedAt,
    updatedAt: startedAt,
    completedAt: null,
    stores: scope.map((store) => ({
      storeId: store.storeId,
      categories: store.categoryIds.map((categoryId) => ({
        categoryId,
        status: "PENDING",
        attempts: 0,
        pages: 0,
        products: 0,
        files: [],
        error: null,
      })),
    })),
  };
}

function validateResumeManifest(
  manifest: DownloadManifest,
  options: DownloadLocaleOptions,
  scope: readonly DownloadScopeStore[],
): void {
  if (
    manifest.sourceLocale !== options.sourceLocale ||
    manifest.targetLocale !== options.targetLocale ||
    manifest.acceptLanguage !== options.acceptLanguage ||
    manifest.pageSize !== options.pageSize
  ) {
    throw new Error("Параметри --resume не відповідають download-manifest.json");
  }

  const expected = scope.flatMap((store) =>
    store.categoryIds.map((categoryId) => `${store.storeId}\u0000${categoryId}`),
  );
  const actual = manifest.stores.flatMap((store) =>
    store.categories.map((category) => `${store.storeId}\u0000${category.categoryId}`),
  );
  if (
    expected.length !== actual.length ||
    expected.some((value, index) => value !== actual[index])
  ) {
    throw new Error("Source scope змінився після створення download manifest");
  }
}

async function readManifest(filePath: string): Promise<DownloadManifest> {
  let value: unknown;
  try {
    value = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  } catch (error: unknown) {
    throw new Error(`Не вдалося прочитати download manifest ${filePath}: ${errorMessage(error)}`);
  }
  if (!isRecord(value) || value.schema !== DOWNLOAD_MANIFEST_SCHEMA) {
    throw new Error(`Некоректний download manifest: ${filePath}`);
  }
  return value as unknown as DownloadManifest;
}

async function ensureStoresRegistry(
  sourceDirectory: string,
  targetDirectory: string,
): Promise<void> {
  const targetFile = path.join(targetDirectory, "stores.json");
  if (await pathExists(targetFile)) return;
  const temporaryFile = `${targetFile}.tmp-${randomUUID()}`;
  await copyFile(path.join(sourceDirectory, "stores.json"), temporaryFile);
  await rename(temporaryFile, targetFile);
}

async function ensureLocalizedCategoryTaxonomies(input: {
  readonly scope: readonly DownloadScopeStore[];
  readonly targetDirectory: string;
  readonly options: DownloadLocaleOptions;
  readonly fetchImplementation: FetchImplementation;
  readonly sleepImplementation: SleepImplementation;
}): Promise<void> {
  for (const store of input.scope) {
    const storeDirectory = path.join(input.targetDirectory, "stores", store.storeId);
    const categoriesFile = path.join(storeDirectory, "categories.json");
    await mkdir(storeDirectory, { recursive: true });
    if (await pathExists(categoriesFile)) continue;

    const response = await fetchJsonWithRetry(buildCategoriesUrl(store.storeId), input);
    const categoryIds = collectCategoryIds(response.value);
    const missing = store.categoryIds.filter((categoryId) => !categoryIds.has(categoryId));
    if (missing.length > 0) {
      throw new Error(
        `Українська taxonomy store ${store.storeId} не містить categories: ${missing.slice(0, 20).join(", ")}`,
      );
    }
    await writeTextAtomic(categoriesFile, normalizeJsonText(response.text));
  }
}

async function downloadCategoryWithConsistencyRetry(input: {
  readonly targetDirectory: string;
  readonly storeId: string;
  readonly categoryId: string;
  readonly options: DownloadLocaleOptions;
  readonly fetchImplementation: FetchImplementation;
  readonly sleepImplementation: SleepImplementation;
}): Promise<DownloadedCategory> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= CATEGORY_DOWNLOAD_ATTEMPTS; attempt += 1) {
    try {
      return await downloadCategory(input);
    } catch (error: unknown) {
      lastError = error;
      if (attempt < CATEGORY_DOWNLOAD_ATTEMPTS) continue;
    }
  }
  throw lastError;
}

async function downloadCategory(input: {
  readonly targetDirectory: string;
  readonly storeId: string;
  readonly categoryId: string;
  readonly options: DownloadLocaleOptions;
  readonly fetchImplementation: FetchImplementation;
  readonly sleepImplementation: SleepImplementation;
}): Promise<DownloadedCategory> {
  const temporaryDirectory = path.join(
    input.targetDirectory,
    ".download-tmp",
    input.storeId,
    `${input.categoryId}-${randomUUID()}`,
  );
  const finalDirectory = categoryDirectory(input.targetDirectory, input.storeId, input.categoryId);
  await mkdir(temporaryDirectory, { recursive: true });

  try {
    const firstResponse = await fetchJsonWithRetry(
      buildProductsUrl(input.storeId, input.categoryId, 1),
      input,
    );
    const firstPage = parseProductPage(firstResponse.value, input.categoryId, 1);
    const pageCount = Math.max(1, Math.ceil(firstPage.count / input.options.pageSize));
    const responses: JsonResponse[] = [firstResponse];
    const pages: ProductPage[] = [firstPage];

    for (let pageNumber = 2; pageNumber <= pageCount; pageNumber += 1) {
      const response = await fetchJsonWithRetry(
        buildProductsUrl(input.storeId, input.categoryId, pageNumber),
        input,
      );
      responses.push(response);
      pages.push(parseProductPage(response.value, input.categoryId, pageNumber));
    }

    validateDownloadedPages(pages, input.categoryId, input.options.pageSize);
    const files: DownloadManifestFile[] = [];
    for (let index = 0; index < responses.length; index += 1) {
      const pageNumber = index + 1;
      const fileName = `page-${String(pageNumber).padStart(6, "0")}.json`;
      const content = normalizeJsonText(responses[index]?.text ?? "");
      await writeTextAtomic(path.join(temporaryDirectory, fileName), content);
      files.push({
        path: path.posix.join(
          input.options.targetLocale,
          "stores",
          input.storeId,
          "products",
          input.categoryId,
          fileName,
        ),
        sha256: createHash("sha256").update(content).digest("hex"),
      });
    }

    await mkdir(path.dirname(finalDirectory), { recursive: true });
    await rename(temporaryDirectory, finalDirectory);
    return {
      pages: pages.length,
      products: pages.reduce((sum, page) => sum + page.results.length, 0),
      files,
    };
  } catch (error: unknown) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
}

async function fetchJsonWithRetry(
  url: string,
  input: {
    readonly options: DownloadLocaleOptions;
    readonly fetchImplementation: FetchImplementation;
    readonly sleepImplementation: SleepImplementation;
  },
): Promise<JsonResponse> {
  assertZakazUrl(url);
  let lastError: unknown;

  for (let attempt = 0; attempt <= input.options.retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.options.timeoutMs);
    try {
      const response = await input.fetchImplementation(url, {
        headers: {
          Accept: "application/json",
          "Accept-Language": input.options.acceptLanguage,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable || attempt === input.options.retries) {
          throw new Error(`Zakaz request ${url} повернув HTTP ${response.status}`);
        }
        await input.sleepImplementation(
          resolveRetryDelay(response.headers.get("retry-after"), attempt, input.options.delayMs),
        );
        continue;
      }

      const text = await response.text();
      let value: unknown;
      try {
        value = JSON.parse(text) as unknown;
      } catch {
        if (attempt === input.options.retries) {
          throw new Error(`Zakaz request ${url} повернув некоректний JSON`);
        }
        await input.sleepImplementation(backoffDelay(attempt, input.options.delayMs));
        continue;
      }
      if (input.options.delayMs > 0) await input.sleepImplementation(input.options.delayMs);
      return { value, text };
    } catch (error: unknown) {
      lastError = error;
      if (error instanceof Error && error.message.startsWith("Zakaz request")) throw error;
      if (attempt === input.options.retries) break;
      await input.sleepImplementation(backoffDelay(attempt, input.options.delayMs));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`Zakaz request ${url} не виконано: ${errorMessage(lastError)}`);
}

function parseProductPage(value: unknown, categoryId: string, pageNumber: number): ProductPage {
  if (!isRecord(value)) throw new Error(`${categoryId} page ${pageNumber}: response не є object`);
  const count = readNonNegativeInteger(value.count);
  if (count === null) throw new Error(`${categoryId} page ${pageNumber}: некоректний count`);
  if (!Array.isArray(value.results)) {
    throw new Error(`${categoryId} page ${pageNumber}: results не є array`);
  }

  const results: Record<string, unknown>[] = [];
  value.results.forEach((product, index) => {
    if (!isRecord(product)) {
      throw new Error(`${categoryId} page ${pageNumber} result ${index}: product не є object`);
    }
    if (typeof product.sku !== "string" || product.sku.trim().length === 0) {
      throw new Error(`${categoryId} page ${pageNumber} result ${index}: відсутній SKU`);
    }
    if (product.category_id !== categoryId) {
      throw new Error(
        `${categoryId} page ${pageNumber} result ${index}: category_id ${String(product.category_id)} не збігається`,
      );
    }
    results.push(product);
  });
  return { count, results };
}

function validateDownloadedPages(
  pages: readonly ProductPage[],
  categoryId: string,
  pageSize: number,
): void {
  const declaredCounts = [...new Set(pages.map((page) => page.count))];
  if (declaredCounts.length !== 1) {
    throw new Error(`${categoryId}: count змінився між сторінками (${declaredCounts.join(", ")})`);
  }
  const declaredCount = declaredCounts[0] ?? 0;
  const expectedPages = Math.max(1, Math.ceil(declaredCount / pageSize));
  if (pages.length !== expectedPages) {
    throw new Error(`${categoryId}: очікується ${expectedPages} pages, отримано ${pages.length}`);
  }
  const products = pages.flatMap((page) => page.results);
  if (products.length !== declaredCount) {
    throw new Error(`${categoryId}: count=${declaredCount}, отримано products=${products.length}`);
  }
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const product of products) {
    const sku = String(product.sku);
    if (seen.has(sku)) duplicates.add(sku);
    seen.add(sku);
  }
  if (duplicates.size > 0) {
    throw new Error(`${categoryId}: дублікати SKU ${[...duplicates].slice(0, 20).join(", ")}`);
  }
}

function collectCategoryIds(value: unknown): ReadonlySet<string> {
  if (!Array.isArray(value)) throw new Error("Zakaz categories response має містити array");
  const ids = new Set<string>();
  const visit = (categories: readonly unknown[]): void => {
    for (const category of categories) {
      if (!isRecord(category) || typeof category.id !== "string" || !category.id) {
        throw new Error("Zakaz categories response містить некоректний category");
      }
      ids.add(category.id);
      if (category.children !== undefined && category.children !== null) {
        if (!Array.isArray(category.children)) {
          throw new Error(`Zakaz category ${category.id} містить некоректний children`);
        }
        visit(category.children);
      }
    }
  };
  visit(value);
  return ids;
}

function validateDownloadOptions(options: DownloadLocaleOptions): void {
  if (!SAFE_LOCALE_PATTERN.test(options.sourceLocale)) {
    throw new Error(`Некоректний --source-locale: ${options.sourceLocale}`);
  }
  if (!SAFE_LOCALE_PATTERN.test(options.targetLocale)) {
    throw new Error(`Некоректний --locale: ${options.targetLocale}`);
  }
  if (options.sourceLocale === options.targetLocale) {
    throw new Error("Source і target locale мають відрізнятися");
  }
  if (!ACCEPT_LANGUAGE_PATTERN.test(options.acceptLanguage)) {
    throw new Error(`Некоректний --accept-language: ${options.acceptLanguage}`);
  }
  for (const [name, value, minimum] of [
    ["pageSize", options.pageSize, 1],
    ["concurrency", options.concurrency, 1],
    ["delayMs", options.delayMs, 0],
    ["timeoutMs", options.timeoutMs, 1],
    ["retries", options.retries, 0],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < minimum) {
      throw new Error(`${name} має бути цілим числом не менше ${minimum}`);
    }
  }
}

function assertZakazUrl(value: string): void {
  const url = new URL(value);
  if (url.origin !== ZAKAZ_API_ORIGIN || url.protocol !== "https:") {
    throw new Error(`Заборонений Zakaz API URL: ${value}`);
  }
}

function resolveRetryDelay(retryAfter: string | null, attempt: number, delayMs: number): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.max(delayMs, seconds * 1_000);
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.max(delayMs, date - Date.now());
  }
  return backoffDelay(attempt, delayMs);
}

function backoffDelay(attempt: number, delayMs: number): number {
  return Math.max(delayMs, 500 * 2 ** attempt);
}

function categoryDirectory(targetDirectory: string, storeId: string, categoryId: string): string {
  return path.join(targetDirectory, "stores", storeId, "products", categoryId);
}

async function writeTextAtomic(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryFile = `${filePath}.tmp-${randomUUID()}`;
  await writeFile(temporaryFile, content, "utf8");
  await rename(temporaryFile, filePath);
}

function normalizeJsonText(text: string): string {
  return `${text.trimEnd()}\n`;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") return false;
    throw error;
  }
}

function readNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function parseNonNegativeInteger(value: string, option: string, minimum: number): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`${option} має бути цілим числом не менше ${minimum}`);
  }
  return parsed;
}

function requireValue(arguments_: readonly string[], index: number, option: string): string {
  const value = arguments_[index];
  if (!value) throw new Error(`Для ${option} потрібно передати значення`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
