import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import type { FinalProductsDocument } from "../../../scripts/usda/src/final-product-types.js";

import { databasePackageDirectory, usdaCatalogManifestPath } from "./paths.js";
import type { UsdaCatalogManifest } from "./types.js";

export interface LoadedUsdaCatalog {
  readonly manifest: UsdaCatalogManifest;
  readonly document: FinalProductsDocument;
  readonly sourceFilePath: string;
}

export async function loadUsdaCatalog(): Promise<LoadedUsdaCatalog> {
  const manifest = await readJson<UsdaCatalogManifest>(usdaCatalogManifestPath);

  assertManifest(manifest);

  const sourceFilePath = resolveManifestSourceFile(manifest.sourceFile);

  const sourceFile = await readFile(sourceFilePath);
  const sourceFileStats = await stat(sourceFilePath);
  const sourceFileSha256 = createHash("sha256").update(sourceFile).digest("hex");

  if (sourceFileStats.size !== manifest.sourceFileSizeBytes) {
    throw new Error(
      `USDA catalog size does not match manifest: expected ${manifest.sourceFileSizeBytes}, received ${sourceFileStats.size}.`,
    );
  }

  if (sourceFileSha256 !== manifest.sourceFileSha256) {
    throw new Error(
      "USDA catalog SHA-256 does not match manifest. Regenerate or update the manifest.",
    );
  }

  let document: FinalProductsDocument;

  try {
    document = JSON.parse(sourceFile.toString("utf8")) as FinalProductsDocument;
  } catch (error: unknown) {
    throw new Error(`Failed to parse USDA catalog JSON at "${sourceFilePath}".`, {
      cause: error,
    });
  }

  return {
    manifest,
    document,
    sourceFilePath,
  };
}

function resolveManifestSourceFile(sourceFile: string): string {
  if (isAbsolute(sourceFile)) {
    throw new Error("USDA manifest sourceFile must be relative to the database package.");
  }

  const resolved = resolve(databasePackageDirectory, sourceFile);
  const relativePath = relative(databasePackageDirectory, resolved);

  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error("USDA manifest sourceFile must stay inside the database package.");
  }

  return resolved;
}

async function readJson<TValue>(filePath: string): Promise<TValue> {
  const content = await readFile(filePath, "utf8");

  return JSON.parse(content) as TValue;
}

function assertManifest(manifest: UsdaCatalogManifest): void {
  if (manifest.schemaVersion !== 1 || manifest.catalog !== "usda-foundation-sr-legacy") {
    throw new Error("Unsupported USDA catalog manifest.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.sourceRelease)) {
    throw new Error("USDA manifest sourceRelease must use YYYY-MM-DD format.");
  }

  if (!/^[a-f\d]{64}$/.test(manifest.sourceFileSha256)) {
    throw new Error("USDA manifest sourceFileSha256 must be a lowercase SHA-256 digest.");
  }

  if (
    manifest.importPolicy.productType !== "GENERIC" ||
    manifest.importPolicy.productStatus !== "ACTIVE" ||
    manifest.importPolicy.verificationStatus !== "UNVERIFIED"
  ) {
    throw new Error("USDA manifest import policy must be GENERIC + ACTIVE + UNVERIFIED.");
  }
}
