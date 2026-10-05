import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { validateZakazRawDataset } from "./raw-validator.js";

test("accepts a complete raw dataset", async () => {
  const fixture = await createFixture();
  try {
    await writePage(fixture, 1, response(31, products(1, 30)));
    await writePage(fixture, 2, response(31, products(31, 1)));

    const result = await validateZakazRawDataset({ rootDirectory: fixture.root });

    assert.equal(result.valid, true);
    assert.deepEqual(result.summary, {
      locales: 1,
      stores: 1,
      categories: 1,
      pages: 2,
      productRows: 31,
      errors: 0,
      warnings: 0,
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("reports missing pages and row count mismatch", async () => {
  const fixture = await createFixture();
  try {
    await writePage(fixture, 1, response(31, products(1, 30)));

    const result = await validateZakazRawDataset({ rootDirectory: fixture.root });

    assert.equal(result.valid, false);
    assert.deepEqual(
      result.issues.map((issue) => issue.code),
      ["MISSING_PAGES", "ROW_COUNT_MISMATCH"],
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("reports malformed product records and category mismatch", async () => {
  const fixture = await createFixture();
  try {
    await writePage(
      fixture,
      1,
      response(1, [
        {
          sku: "sku-1",
          ean: "04820000000001",
          title: "Product",
          category_id: "another-category",
          in_stock: "yes",
        },
      ]),
    );

    const result = await validateZakazRawDataset({ rootDirectory: fixture.root });

    assert.equal(result.valid, false);
    assert.deepEqual(
      result.issues.map((issue) => issue.code),
      ["INVALID_PRODUCT_IN_STOCK", "PRODUCT_CATEGORY_MISMATCH"],
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("reports identical pages and duplicate SKU values", async () => {
  const fixture = await createFixture();
  try {
    const sameResponse = response(2, products(1, 1));
    await writePage(fixture, 1, sameResponse);
    await writePage(fixture, 2, sameResponse);

    const result = await validateZakazRawDataset({
      rootDirectory: fixture.root,
      pageSize: 1,
    });

    assert.equal(result.valid, false);
    assert.equal(
      result.issues.filter((issue) => issue.code === "DUPLICATE_PAGE_CONTENT").length,
      2,
    );
    assert.equal(
      result.issues.some((issue) => issue.code === "DUPLICATE_SKU_IN_CATEGORY"),
      true,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("treats changing availability as a warning", async () => {
  const fixture = await createFixture();
  try {
    await writePage(fixture, 1, response(2, products(1, 1), 2));
    await writePage(fixture, 2, response(2, products(2, 1), 1));

    const result = await validateZakazRawDataset({
      rootDirectory: fixture.root,
      pageSize: 1,
    });

    assert.equal(result.valid, true);
    assert.deepEqual(
      result.issues.map((issue) => issue.code),
      ["AVAILABLE_COUNT_CHANGED_BETWEEN_PAGES"],
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

interface Fixture {
  readonly root: string;
  readonly categoryDirectory: string;
}

async function createFixture(): Promise<Fixture> {
  const root = await mkdtemp(path.join(tmpdir(), "mealmind-zakaz-validator-"));
  const storeDirectory = path.join(root, "en", "stores", "48215611");
  const categoryDirectory = path.join(storeDirectory, "products", "milk-metro");
  await mkdir(categoryDirectory, { recursive: true });
  await writeFile(
    path.join(root, "en", "stores.json"),
    JSON.stringify([{ id: "48215611", name: "METRO" }]),
    "utf8",
  );
  await writeFile(
    path.join(storeDirectory, "categories.json"),
    JSON.stringify([{ id: "food-metro", children: [{ id: "milk-metro", children: [] }] }]),
    "utf8",
  );
  return { root, categoryDirectory };
}

async function writePage(fixture: Fixture, pageNumber: number, value: unknown): Promise<void> {
  await writeFile(
    path.join(fixture.categoryDirectory, `page-${String(pageNumber).padStart(6, "0")}.json`),
    JSON.stringify(value),
    "utf8",
  );
}

function response(count: number, results: readonly unknown[], countAvailable = count) {
  return {
    count,
    count_available: countAvailable,
    results,
    categories: [],
    filters: [],
    category_results: [],
    is_fuzzy: false,
    stats: {},
  };
}

function products(start: number, count: number) {
  return Array.from({ length: count }, (_, offset) => {
    const sequence = start + offset;
    return {
      sku: `sku-${sequence}`,
      ean: String(sequence).padStart(14, "0"),
      title: `Product ${sequence}`,
      category_id: "milk-metro",
      in_stock: true,
    };
  });
}
