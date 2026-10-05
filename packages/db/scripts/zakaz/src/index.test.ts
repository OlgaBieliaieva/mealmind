import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { resolveZakazCommand, ZAKAZ_USAGE } from "./index.js";
import { parseRawValidationArguments, RAW_VALIDATION_USAGE } from "./validate-raw.js";

test("resolves the validate-raw command", () => {
  assert.equal(resolveZakazCommand("validate-raw"), "validate-raw");
  assert.throws(() => resolveZakazCommand("unknown"), /Невідома Zakaz команда/);
});

test("documents the main command and subcommand help", () => {
  assert.match(ZAKAZ_USAGE, /npm run zakaz -- <command>/);
  assert.match(ZAKAZ_USAGE, /validate-raw/);
  assert.match(RAW_VALIDATION_USAGE, /--locale <locale>/);
});

test("parses validate-raw options", () => {
  const options = parseRawValidationArguments([
    "--root",
    "custom/raw",
    "--locale",
    "uk",
    "--page-size",
    "50",
    "--json",
  ]);

  assert.deepEqual(options, {
    rootDirectory: path.resolve("custom/raw"),
    locale: "uk",
    pageSize: 50,
    json: true,
  });
});

test("rejects unknown validate-raw options", () => {
  assert.throws(() => parseRawValidationArguments(["--unknown"]), /Невідомий аргумент/);
});
