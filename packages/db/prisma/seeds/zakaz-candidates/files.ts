import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

import type { CandidateArtifactDocument } from "../../../scripts/zakaz/src/build-candidates.js";

import {
  ZAKAZ_CANDIDATE_ARTIFACT_SCHEMA,
  ZAKAZ_CANDIDATE_MANIFEST_SCHEMA,
  ZAKAZ_CANDIDATE_VALIDATION_SCHEMA,
  type ZakazCandidateArtifactInput,
  type ZakazCandidateBundle,
  type ZakazCandidateManifest,
  type ZakazCandidateValidationReport,
} from "./types.js";

export async function loadZakazCandidateBundle(
  requestedManifestPath: string,
): Promise<ZakazCandidateBundle> {
  const manifestPath = await resolveCompatibleJsonPath(requestedManifestPath);
  const manifestBuffer = await readFile(manifestPath);
  const manifest = parseJson<ZakazCandidateManifest>(manifestBuffer, manifestPath);
  validateManifest(manifest);

  const directory = dirname(manifestPath);
  const validationPath = await resolveCompatibleJsonPath(
    resolve(directory, manifest.outputs.validation.fileName),
  );
  await assertFileChecksum(validationPath, manifest.outputs.validation.sha256);
  const validation = parseJson<ZakazCandidateValidationReport>(
    await readFile(validationPath),
    validationPath,
  );
  validateValidationReport(validation, manifest);

  const artifacts = await Promise.all(
    [manifest.outputs.candidates, manifest.outputs.reviewRequired, manifest.outputs.rejected].map(
      async (output): Promise<ZakazCandidateArtifactInput> => {
        const filePath = await resolveCompatibleJsonPath(resolve(directory, output.fileName));
        await assertFileChecksum(filePath, output.sha256);
        return { filePath, manifest: output };
      },
    ),
  );

  return {
    manifestPath,
    manifestChecksum: sha256(manifestBuffer),
    manifest,
    validationPath,
    validation,
    artifacts,
  };
}

export async function loadZakazCandidateArtifact(
  input: ZakazCandidateArtifactInput,
): Promise<CandidateArtifactDocument> {
  const document = parseJson<CandidateArtifactDocument>(
    await readFile(input.filePath),
    input.filePath,
  );

  if (document.schema !== ZAKAZ_CANDIDATE_ARTIFACT_SCHEMA) {
    throw new Error(`Непідтримувана candidate artifact schema: ${String(document.schema)}`);
  }
  if (document.provider !== "ZAKAZ") {
    throw new Error(
      `Candidate artifact має непідтримуваного provider: ${String(document.provider)}`,
    );
  }
  if (document.disposition !== input.manifest.disposition) {
    throw new Error(`Disposition artifact не відповідає manifest: ${input.filePath}`);
  }
  if (
    document.count !== input.manifest.count ||
    document.products.length !== input.manifest.count
  ) {
    throw new Error(`Кількість records artifact не відповідає manifest: ${input.filePath}`);
  }
  if (!validDate(document.generatedAt)) {
    throw new Error(`Candidate artifact містить некоректний generatedAt: ${input.filePath}`);
  }
  if (!nonEmpty(document.sourceLocale) || !nonEmpty(document.localizedLocale)) {
    throw new Error(`Candidate artifact не містить locale metadata: ${input.filePath}`);
  }

  const identities = new Set<string>();
  for (const record of document.products) {
    if (
      record.identity.provider !== "ZAKAZ" ||
      !nonEmpty(record.identity.storeId) ||
      !nonEmpty(record.identity.sourceSku)
    ) {
      throw new Error(`Candidate artifact містить некоректну source identity: ${input.filePath}`);
    }
    if (record.disposition !== document.disposition) {
      throw new Error(`Record disposition не відповідає artifact: ${input.filePath}`);
    }

    const key = `${record.identity.storeId}:${record.identity.sourceSku}`;
    if (identities.has(key)) {
      throw new Error(`Candidate artifact містить дубльовану identity ${key}`);
    }
    identities.add(key);
  }

  return document;
}

async function resolveCompatibleJsonPath(requestedPath: string): Promise<string> {
  if (await exists(requestedPath)) return requestedPath;

  const extension = extname(requestedPath).toLowerCase();
  const alternative =
    extension === ".json"
      ? `${requestedPath}l`
      : extension === ".jsonl"
        ? requestedPath.slice(0, -1)
        : null;

  if (alternative && (await exists(alternative))) return alternative;
  throw new Error(`Не знайдено Zakaz artifact: ${requestedPath}`);
}

async function assertFileChecksum(filePath: string, expected: string): Promise<void> {
  if (!/^[0-9a-f]{64}$/.test(expected)) {
    throw new Error(`Manifest містить некоректний SHA-256 для ${filePath}`);
  }

  const actual = await hashFile(filePath);
  if (actual !== expected) {
    throw new Error(`SHA-256 не відповідає manifest: ${filePath}`);
  }
}

async function hashFile(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

function parseJson<T>(buffer: Buffer, filePath: string): T {
  try {
    return JSON.parse(buffer.toString("utf8")) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown JSON parse error";
    throw new Error(`Не вдалося прочитати JSON ${filePath}: ${message}`);
  }
}

function validateManifest(manifest: ZakazCandidateManifest): void {
  if (manifest.schema !== ZAKAZ_CANDIDATE_MANIFEST_SCHEMA || manifest.provider !== "ZAKAZ") {
    throw new Error("Непідтримуваний Zakaz candidate manifest");
  }
  if (!validDate(manifest.generatedAt)) throw new Error("Manifest містить некоректний generatedAt");

  const outputs = [
    manifest.outputs?.candidates,
    manifest.outputs?.reviewRequired,
    manifest.outputs?.rejected,
  ];
  const expectedDispositions = ["CANDIDATE", "REVIEW_REQUIRED", "REJECTED"];

  for (const [index, output] of outputs.entries()) {
    if (!output || output.disposition !== expectedDispositions[index]) {
      throw new Error("Manifest містить некоректний перелік candidate outputs");
    }
    if (!nonEmpty(output.fileName) || !Number.isInteger(output.count) || output.count < 0) {
      throw new Error("Manifest містить некоректний candidate output");
    }
  }
}

function validateValidationReport(
  report: ZakazCandidateValidationReport,
  manifest: ZakazCandidateManifest,
): void {
  if (report.schema !== ZAKAZ_CANDIDATE_VALIDATION_SCHEMA) {
    throw new Error("Непідтримуваний Zakaz candidate validation report");
  }
  if (!manifest.outputs.validation.valid || !report.valid || report.errors.length > 0) {
    throw new Error(`Zakaz candidate artifacts не пройшли validation: ${report.errors.join("; ")}`);
  }

  const expectedTotal =
    manifest.outputs.candidates.count +
    manifest.outputs.reviewRequired.count +
    manifest.outputs.rejected.count;
  if (
    report.checks.totalOutputProducts !== expectedTotal ||
    report.checks.uniqueOutputIdentities !== expectedTotal
  ) {
    throw new Error("Validation report не відповідає кількості records у manifest");
  }
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validDate(value: unknown): value is string {
  return nonEmpty(value) && !Number.isNaN(Date.parse(value));
}
