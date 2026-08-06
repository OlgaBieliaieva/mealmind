import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Absolute path to this source directory:
 *
 * packages/db/scripts/usda/src
 */
const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));

/**
 * Absolute path to:
 *
 * packages/db/scripts/usda
 */
const usdaRoot = path.resolve(sourceDirectory, "..");

/**
 * Absolute path to:
 *
 * packages/db
 */
const packageRoot = path.resolve(usdaRoot, "..", "..");

/**
 * Centralized paths used by the local USDA pipeline.
 *
 * All paths are resolved relative to this module rather than
 * process.cwd(). This means that the command works both from
 * packages/db and from the monorepo root.
 */
export const USDA_PATHS = {
  packageRoot,
  usdaRoot,

  sourceDirectory,

  dataDirectory: path.join(usdaRoot, "data"),
  rawDataDirectory: path.join(usdaRoot, "data", "raw"),
  workDataDirectory: path.join(usdaRoot, "data", "work"),
  outputDataDirectory: path.join(usdaRoot, "data", "output"),
} as const;
