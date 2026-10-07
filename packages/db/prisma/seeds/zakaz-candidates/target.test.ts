import assert from "node:assert/strict";
import test from "node:test";

import { resolveZakazImportDatabaseTarget } from "./target.js";

test("accepts local Zakaz import target without remote flags", () => {
  const target = resolveZakazImportDatabaseTarget({
    DIRECT_URL: "postgresql://postgres:postgres@127.0.0.1:54322/mealmind_test",
  });
  assert.equal(target.isLocal, true);
  assert.equal(target.databaseName, "mealmind_test");
});

test("requires both remote guard variables", () => {
  const directUrl = "postgresql://user:secret@db.example.test/staging";
  assert.throws(() => resolveZakazImportDatabaseTarget({ DIRECT_URL: directUrl }), /ALLOW_REMOTE/);
  assert.throws(
    () =>
      resolveZakazImportDatabaseTarget({
        DIRECT_URL: directUrl,
        ZAKAZ_IMPORT_ALLOW_REMOTE: "true",
        ZAKAZ_IMPORT_CONFIRM_DATABASE: "production",
      }),
    /CONFIRM_DATABASE/,
  );

  const target = resolveZakazImportDatabaseTarget({
    DIRECT_URL: directUrl,
    ZAKAZ_IMPORT_ALLOW_REMOTE: "true",
    ZAKAZ_IMPORT_CONFIRM_DATABASE: "staging",
  });
  assert.equal(target.isLocal, false);
});
