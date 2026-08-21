import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const catalogSeedDirectory = dirname(fileURLToPath(import.meta.url));

export const databasePackageDirectory = resolve(catalogSeedDirectory, "../../..");

export const usdaCatalogManifestPath = resolve(catalogSeedDirectory, "usda-manifest.json");
