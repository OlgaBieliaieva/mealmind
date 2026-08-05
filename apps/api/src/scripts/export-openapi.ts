import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { referenceOpenApiDocument } from "../modules/reference/reference-openapi.js";

const outputPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../postman/specs/MealMind API/MealMind API.openapi.json",
);
const serializedDocument = JSON.stringify(referenceOpenApiDocument, null, 2) + "\n";
const checkOnly = process.argv.includes("--check");

if (checkOnly) {
  await verifyExportIsCurrent();
} else {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serializedDocument, "utf8");
  console.log("OpenAPI-специфікацію оновлено: " + outputPath);
}

async function verifyExportIsCurrent(): Promise<void> {
  let existingDocument: string;

  try {
    existingDocument = await readFile(outputPath, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      throw new Error(
        "Експортовану OpenAPI-специфікацію не знайдено. Виконайте npm run api:openapi:export.",
      );
    }

    throw error;
  }

  if (existingDocument !== serializedDocument) {
    throw new Error(
      "Експортована OpenAPI-специфікація застаріла. Виконайте npm run api:openapi:export.",
    );
  }

  console.log("Експортована OpenAPI-специфікація актуальна.");
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
