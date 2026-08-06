import { readFile } from "node:fs/promises";

export async function readJsonFile<TValue>(filePath: string): Promise<TValue> {
  let content: string;

  try {
    content = await readFile(filePath, "utf8");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`Failed to read JSON file "${filePath}": ${message}`, {
      cause: error,
    });
  }

  try {
    return JSON.parse(content) as TValue;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`Failed to parse JSON file "${filePath}": ${message}`, {
      cause: error,
    });
  }
}
