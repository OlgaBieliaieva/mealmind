import { mkdir, rename, rm, writeFile } from "node:fs/promises";

import path from "node:path";

/**
 * Writes JSON through a temporary file and then renames it.
 *
 * This prevents leaving a partially written output file if the
 * process is interrupted during serialization or writing.
 */
export async function writeJsonFile(outputPath: string, value: unknown): Promise<void> {
  const outputDirectory = path.dirname(outputPath);

  const temporaryPath = `${outputPath}.tmp`;

  await mkdir(outputDirectory, {
    recursive: true,
  });

  const serialized = `${JSON.stringify(value, null, 2)}\n`;

  try {
    await writeFile(temporaryPath, serialized, "utf8");

    await rm(outputPath, {
      force: true,
    });

    await rename(temporaryPath, outputPath);
  } catch (error: unknown) {
    await rm(temporaryPath, {
      force: true,
    });

    throw error;
  }
}
