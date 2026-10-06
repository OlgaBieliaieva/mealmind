import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { aggregateZakazProducts, parseAggregateProductsArguments } from "./aggregate-products.js";

test("aggregates observations by store and SKU and preserves categories", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "mealmind-zakaz-aggregate-"));
  try {
    await writeCategoryPage(root, "milk-metro", [product("sku-1", "milk-metro")]);
    await writeCategoryPage(root, "organic-milk-metro", [
      product("sku-1", "organic-milk-metro"),
      product("sku-2", "organic-milk-metro"),
    ]);

    const document = await aggregateZakazProducts({
      rootDirectory: root,
      locale: "en",
      generatedAt: "2026-10-05T00:00:00.000Z",
    });

    assert.deepEqual(document.statistics, {
      stores: 1,
      sourcePages: 2,
      inputObservations: 3,
      uniqueProducts: 2,
      duplicateObservations: 1,
      multiCategoryProducts: 1,
      productsWithConflicts: 0,
    });
    assert.deepEqual(document.products[0]?.sourceCategoryIds, ["milk-metro", "organic-milk-metro"]);
    assert.equal(document.products[0]?.observationCount, 2);
    assert.equal("category_id" in (document.products[0]?.productData ?? {}), false);
    assert.equal("parent_category_id" in (document.products[0]?.productData ?? {}), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("ignores category context and Zakaz CDN shard differences", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "mealmind-zakaz-aggregate-"));
  try {
    await writeCategoryPage(root, "milk-metro", [
      {
        ...product("sku-1", "milk-metro"),
        parent_category_id: "dairy-metro",
        hits: 10,
        img: { s1350x1350: "https://img2.zakaz.ua/assets/product-s1350x1350.jpg" },
      },
    ]);
    await writeCategoryPage(root, "organic-milk-metro", [
      {
        ...product("sku-1", "organic-milk-metro"),
        parent_category_id: "health-metro",
        hits: 100,
        img: { s1350x1350: "https://img3.zakaz.ua/assets/product-s1350x1350.jpg" },
      },
    ]);

    const document = await aggregateZakazProducts({
      rootDirectory: root,
      locale: "en",
      generatedAt: "2026-10-05T00:00:00.000Z",
    });

    assert.deepEqual(document.products[0]?.conflictingFields, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports conflicting source fields without dropping observations", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "mealmind-zakaz-aggregate-"));
  try {
    await writeCategoryPage(root, "milk-metro", [product("sku-1", "milk-metro", "Milk")]);
    await writeCategoryPage(root, "organic-milk-metro", [
      product("sku-1", "organic-milk-metro", "Organic Milk"),
    ]);

    const document = await aggregateZakazProducts({
      rootDirectory: root,
      locale: "en",
      generatedAt: "2026-10-05T00:00:00.000Z",
    });

    assert.deepEqual(document.products[0]?.conflictingFields, ["title"]);
    assert.equal(document.products[0]?.observations.length, 2);
    assert.equal(document.statistics.productsWithConflicts, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("keeps the same SKU from different stores as separate products", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "mealmind-zakaz-aggregate-"));
  try {
    await writeCategoryPage(root, "milk-metro", [product("sku-1", "milk-metro")]);
    await writeCategoryPage(root, "milk-novus", [product("sku-1", "milk-novus")], "482010105");

    const document = await aggregateZakazProducts({
      rootDirectory: root,
      locale: "en",
      generatedAt: "2026-10-05T00:00:00.000Z",
    });

    assert.equal(document.statistics.stores, 2);
    assert.equal(document.statistics.uniqueProducts, 2);
    assert.deepEqual(
      document.products.map((item) => item.sourceStoreId),
      ["482010105", "48215611"],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("requires locale and builds a locale-specific default output", () => {
  assert.throws(() => parseAggregateProductsArguments([]), /--locale/);

  const options = parseAggregateProductsArguments(["--locale", "en"]);
  assert.equal(options.locale, "en");
  assert.equal(
    options.outputFile,
    path.resolve("scripts/zakaz/data/work/products-en-aggregated.json"),
  );
});

async function writeCategoryPage(
  root: string,
  categoryId: string,
  results: readonly Record<string, unknown>[],
  storeId = "48215611",
): Promise<void> {
  const directory = path.join(root, "en", "stores", storeId, "products", categoryId);
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "page-000001.json"),
    JSON.stringify({ count: results.length, results }),
    "utf8",
  );
}

function product(sku: string, categoryId: string, title = "Milk") {
  return {
    sku,
    category_id: categoryId,
    title,
    ean: `ean-${sku}`,
    in_stock: true,
  };
}
