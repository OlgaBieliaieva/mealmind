import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const importDirectory = dirname(fileURLToPath(import.meta.url));

export const databasePackageDirectory = resolve(importDirectory, "../../..");
export const defaultZakazCandidateOutputDirectory = resolve(
  databasePackageDirectory,
  "scripts/zakaz/data/output",
);
export const defaultZakazCandidateManifestPath = resolve(
  defaultZakazCandidateOutputDirectory,
  "zakaz-manifest.json",
);
