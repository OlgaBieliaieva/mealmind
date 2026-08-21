import assert from "node:assert/strict";
import test from "node:test";

import { translateModifier } from "./translate-modifier.js";

test("translates salt modifier", () => {
  assert.equal(translateModifier("with salt"), "із сіллю");
});

test("translates drained solids", () => {
  assert.equal(translateModifier("drained solids"), "тверда частина без рідини");
});

test("normalizes whitespace", () => {
  assert.equal(translateModifier("  with   salt  "), "із сіллю");
});

test("returns null for an unsupported modifier", () => {
  assert.equal(translateModifier("unknown modifier"), null);
});
