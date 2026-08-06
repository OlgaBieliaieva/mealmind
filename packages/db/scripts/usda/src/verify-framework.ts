import { mkdir, stat } from "node:fs/promises";

import { USDA_PATHS } from "./paths.js";
import type { UsdaFrameworkCheckResult, UsdaFrameworkInfo } from "./types.js";

const REQUIRED_DIRECTORIES = [
  USDA_PATHS.dataDirectory,
  USDA_PATHS.rawDataDirectory,
  USDA_PATHS.workDataDirectory,
  USDA_PATHS.outputDataDirectory,
] as const;

async function ensureDirectory(directoryPath: string): Promise<boolean> {
  try {
    const directoryStats = await stat(directoryPath);

    if (!directoryStats.isDirectory()) {
      throw new Error(`Expected a directory but found another file system entry: ${directoryPath}`);
    }

    return false;
  } catch (error: unknown) {
    const errorCode =
      error && typeof error === "object" && "code" in error && typeof error.code === "string"
        ? error.code
        : null;

    if (errorCode !== "ENOENT") {
      throw error;
    }

    await mkdir(directoryPath, {
      recursive: true,
    });

    return true;
  }
}

export async function verifyUsdaFramework(): Promise<UsdaFrameworkCheckResult> {
  const createdDirectories: string[] = [];

  for (const directoryPath of REQUIRED_DIRECTORIES) {
    const wasCreated = await ensureDirectory(directoryPath);

    if (wasCreated) {
      createdDirectories.push(directoryPath);
    }
  }

  const frameworkInfo: UsdaFrameworkInfo = {
    packageRoot: USDA_PATHS.packageRoot,
    usdaRoot: USDA_PATHS.usdaRoot,
    rawDataDirectory: USDA_PATHS.rawDataDirectory,
    workDataDirectory: USDA_PATHS.workDataDirectory,
    outputDataDirectory: USDA_PATHS.outputDataDirectory,
  };

  return {
    success: true,
    createdDirectories,
    frameworkInfo,
  };
}
