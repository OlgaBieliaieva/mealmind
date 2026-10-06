import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildCategoriesUrl,
  buildProductsUrl,
  downloadLocalizedSnapshot,
  parseDownloadLocaleArguments,
  type DownloadLocaleOptions,
} from "./download-locale.js";
import { validateZakazRawDataset } from "./raw-validator.js";

test("builds the documented Zakaz endpoints", () => {
  assert.equal(
    buildCategoriesUrl("48215625"),
    "https://stores-api.zakaz.ua/stores/48215625/categories",
  );
  assert.equal(
    buildProductsUrl("48215625", "milk-metro", 2),
    "https://stores-api.zakaz.ua/stores/48215625/categories/milk-metro/products?page=2",
  );
});

test("parses safe Ukrainian download defaults", () => {
  const options = parseDownloadLocaleArguments([]);
  assert.equal(options.sourceLocale, "en");
  assert.equal(options.targetLocale, "uk");
  assert.equal(options.acceptLanguage, "uk-UA");
  assert.equal(options.concurrency, 2);
  assert.equal(options.retries, 3);
  assert.equal(options.resume, false);
  assert.throws(
    () => parseDownloadLocaleArguments(["--source-locale", "uk", "--locale", "uk"]),
    /мають відрізнятися/u,
  );
});

test("downloads every page with Ukrainian headers and creates a valid snapshot", async () => {
  const fixture = await createSourceFixture();
  const requests: Array<{ url: string; language: string | null }> = [];
  const fetchImplementation = createFetchMock((url, init) => {
    requests.push({ url, language: new Headers(init?.headers).get("Accept-Language") });
    if (url.endsWith("/categories")) return jsonResponse(categories());
    const page = Number(new URL(url).searchParams.get("page"));
    return jsonResponse(
      page === 1
        ? productResponse(31, products(1, 30, "Молоко"))
        : productResponse(31, products(31, 1, "Молоко")),
    );
  });

  try {
    const result = await downloadLocalizedSnapshot(options(fixture.root), {
      fetch: fetchImplementation,
      sleep: async () => undefined,
      now: () => "2026-10-06T12:00:00.000Z",
    });

    assert.equal(result.downloadedCategories, 1);
    assert.equal(result.pages, 2);
    assert.equal(result.products, 31);
    assert.deepEqual(
      requests.map((request) => request.language),
      ["uk-UA", "uk-UA", "uk-UA"],
    );
    assert.equal(
      requests.some((request) => request.url.endsWith("/products?page=2")),
      true,
    );

    const validation = await validateZakazRawDataset({
      rootDirectory: fixture.root,
      locale: "uk",
    });
    assert.equal(validation.valid, true);

    const manifest = JSON.parse(await readFile(result.manifestFile, "utf8")) as {
      status: string;
      stores: Array<{ categories: Array<{ status: string; files: unknown[] }> }>;
    };
    assert.equal(manifest.status, "COMPLETE");
    assert.equal(manifest.stores[0]?.categories[0]?.status, "COMPLETE");
    assert.equal(manifest.stores[0]?.categories[0]?.files.length, 2);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("retries a rate-limited request and honors Retry-After", async () => {
  const fixture = await createSourceFixture();
  const delays: number[] = [];
  let productAttempts = 0;
  const fetchImplementation = createFetchMock((url) => {
    if (url.endsWith("/categories")) return jsonResponse(categories());
    productAttempts += 1;
    if (productAttempts === 1) {
      return new Response("", { status: 429, headers: { "Retry-After": "1" } });
    }
    return jsonResponse(productResponse(1, products(1, 1, "Молоко")));
  });

  try {
    const result = await downloadLocalizedSnapshot(options(fixture.root, { retries: 1 }), {
      fetch: fetchImplementation,
      sleep: async (milliseconds) => {
        delays.push(milliseconds);
      },
    });

    assert.equal(result.products, 1);
    assert.equal(productAttempts, 2);
    assert.equal(delays.includes(1_000), true);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("resumes a completed snapshot without network requests", async () => {
  const fixture = await createSourceFixture();
  const firstFetch = createFetchMock((url) =>
    url.endsWith("/categories")
      ? jsonResponse(categories())
      : jsonResponse(productResponse(1, products(1, 1, "Молоко"))),
  );

  try {
    await downloadLocalizedSnapshot(options(fixture.root), {
      fetch: firstFetch,
      sleep: async () => undefined,
    });
    let calls = 0;
    const result = await downloadLocalizedSnapshot(options(fixture.root, { resume: true }), {
      fetch: createFetchMock(() => {
        calls += 1;
        throw new Error("network must not be used");
      }),
      sleep: async () => undefined,
    });

    assert.equal(calls, 0);
    assert.equal(result.downloadedCategories, 0);
    assert.equal(result.skippedCategories, 1);
    assert.equal(result.products, 1);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("refuses to overwrite an existing target snapshot", async () => {
  const fixture = await createSourceFixture();
  await mkdir(path.join(fixture.root, "uk"), { recursive: true });
  try {
    await assert.rejects(
      downloadLocalizedSnapshot(options(fixture.root), {
        fetch: createFetchMock(() => {
          throw new Error("network must not be used");
        }),
      }),
      /уже існує/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

interface SourceFixture {
  readonly root: string;
}

async function createSourceFixture(): Promise<SourceFixture> {
  const root = await mkdtemp(path.join(tmpdir(), "mealmind-zakaz-download-"));
  const storeDirectory = path.join(root, "en", "stores", "48215625");
  const categoryDirectory = path.join(storeDirectory, "products", "milk-metro");
  await mkdir(categoryDirectory, { recursive: true });
  await writeFile(
    path.join(root, "en", "stores.json"),
    JSON.stringify([{ id: "48215625", name: "METRO" }]),
    "utf8",
  );
  await writeFile(
    path.join(storeDirectory, "categories.json"),
    JSON.stringify(categories()),
    "utf8",
  );
  await writeFile(
    path.join(categoryDirectory, "page-000001.json"),
    JSON.stringify(productResponse(1, products(1, 1, "Milk"))),
    "utf8",
  );
  return { root };
}

function options(
  rootDirectory: string,
  overrides: Partial<DownloadLocaleOptions> = {},
): DownloadLocaleOptions {
  return {
    rootDirectory,
    sourceLocale: "en",
    targetLocale: "uk",
    acceptLanguage: "uk-UA",
    pageSize: 30,
    concurrency: 2,
    delayMs: 0,
    timeoutMs: 1_000,
    retries: 0,
    resume: false,
    json: false,
    ...overrides,
  };
}

function categories() {
  return [{ id: "food-metro", children: [{ id: "milk-metro", children: [] }] }];
}

function productResponse(count: number, results: readonly unknown[]) {
  return {
    count,
    count_available: count,
    results,
    categories: [],
    filters: [],
    category_results: [],
    is_fuzzy: false,
    stats: {},
  };
}

function products(start: number, count: number, title: string) {
  return Array.from({ length: count }, (_, offset) => {
    const sequence = start + offset;
    return {
      sku: `sku-${sequence}`,
      ean: String(sequence).padStart(14, "0"),
      title: `${title} ${sequence}`,
      category_id: "milk-metro",
      in_stock: true,
    };
  });
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function createFetchMock(
  implementation: (url: string, init?: RequestInit) => Response | Promise<Response>,
): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) =>
    implementation(String(input), init)) as typeof fetch;
}
