import assert from "node:assert/strict";
import test from "node:test";

import { assertLocalCleanupTarget, resolveCatalogDatabaseTarget } from "./target.js";

test("allows a local catalog database target", () => {
  const target = resolveCatalogDatabaseTarget({
    DIRECT_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  });

  assert.equal(target.databaseName, "postgres");
  assert.equal(target.isLocal, true);
  assert.doesNotThrow(() => assertLocalCleanupTarget(target));
});

test("rejects a remote import unless two explicit safeguards match", () => {
  const directUrl = "postgresql://user:secret@db.example.com:5432/mealmind";

  assert.throws(
    () => resolveCatalogDatabaseTarget({ DIRECT_URL: directUrl }),
    /USDA_IMPORT_ALLOW_REMOTE=true/,
  );
  assert.throws(
    () =>
      resolveCatalogDatabaseTarget({
        DIRECT_URL: directUrl,
        USDA_IMPORT_ALLOW_REMOTE: "true",
        USDA_IMPORT_CONFIRM_DATABASE: "wrong_database",
      }),
    /USDA_IMPORT_CONFIRM_DATABASE/,
  );

  const target = resolveCatalogDatabaseTarget({
    DIRECT_URL: directUrl,
    USDA_IMPORT_ALLOW_REMOTE: "true",
    USDA_IMPORT_CONFIRM_DATABASE: "mealmind",
  });

  assert.equal(target.isLocal, false);
  assert.throws(() => assertLocalCleanupTarget(target), /only for a local PostgreSQL database/);
});
