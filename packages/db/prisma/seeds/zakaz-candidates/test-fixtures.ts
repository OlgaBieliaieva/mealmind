import { createHash, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type {
  CandidateArtifactDocument,
  CandidateArtifactRecord,
  CandidateDisposition,
  FieldProvenance,
} from "../../../scripts/zakaz/src/build-candidates.js";

import {
  ZAKAZ_CANDIDATE_ARTIFACT_SCHEMA,
  ZAKAZ_CANDIDATE_MANIFEST_SCHEMA,
  ZAKAZ_CANDIDATE_VALIDATION_SCHEMA,
} from "./types.js";

export async function writeCandidateFixture(
  directory: string,
  options: { readonly jsonlNames?: boolean; readonly duplicateIdentity?: boolean } = {},
): Promise<string> {
  const generatedAt = new Date().toISOString();
  const salt = randomUUID();
  const documents = [
    artifact(generatedAt, "CANDIDATE", [record(salt, "candidate", "CANDIDATE")]),
    artifact(
      generatedAt,
      "REVIEW_REQUIRED",
      [
        record(
          salt,
          options.duplicateIdentity ? "candidate" : "review",
          "REVIEW_REQUIRED",
          ["PACKAGE_MEASURE_MISSING"],
        ),
      ],
    ),
    artifact(
      generatedAt,
      "REJECTED",
      [record(salt, "rejected", "REJECTED", ["PACKAGE_VARIABLE_WEIGHT"])],
    ),
  ] as const;
  const logicalNames = [
    "zakaz-candidates.json",
    "zakaz-review-required.json",
    "zakaz-rejected.json",
  ] as const;
  const serialized = documents.map((document) => `${JSON.stringify(document, null, 2)}\n`);

  for (const [index, content] of serialized.entries()) {
    const logicalName = logicalNames[index]!;
    await writeFile(
      resolve(directory, options.jsonlNames ? `${logicalName}l` : logicalName),
      content!,
      "utf8",
    );
  }

  const validation = {
    schema: ZAKAZ_CANDIDATE_VALIDATION_SCHEMA,
    generatedAt,
    valid: true,
    errors: [],
    warnings: [],
    checks: {
      totalInputProducts: 3,
      totalOutputProducts: 3,
      uniqueOutputIdentities: 3,
      duplicateCandidateGtins: 0,
      candidatesWithReviewReasons: 0,
      candidatesWithoutLocalizedTitle: 0,
      candidatesWithoutProvenance: 0,
    },
  };
  const serializedValidation = `${JSON.stringify(validation, null, 2)}\n`;
  const validationName = options.jsonlNames
    ? "zakaz-validation-report.jsonl"
    : "zakaz-validation-report.json";
  await writeFile(resolve(directory, validationName), serializedValidation, "utf8");

  const manifest = {
    schema: ZAKAZ_CANDIDATE_MANIFEST_SCHEMA,
    generatedAt,
    provider: "ZAKAZ",
    outputs: {
      candidates: output(logicalNames[0], "CANDIDATE", serialized[0]!),
      reviewRequired: output(logicalNames[1], "REVIEW_REQUIRED", serialized[1]!),
      rejected: output(logicalNames[2], "REJECTED", serialized[2]!),
      validation: {
        fileName: "zakaz-validation-report.json",
        valid: true,
        sha256: sha256(serializedValidation),
      },
    },
  };
  const manifestName = options.jsonlNames ? "zakaz-manifest.jsonl" : "zakaz-manifest.json";
  await writeFile(resolve(directory, manifestName), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return resolve(directory, "zakaz-manifest.json");
}

function artifact(
  generatedAt: string,
  disposition: CandidateDisposition,
  products: readonly CandidateArtifactRecord[],
): CandidateArtifactDocument {
  return {
    schema: ZAKAZ_CANDIDATE_ARTIFACT_SCHEMA,
    generatedAt,
    provider: "ZAKAZ",
    sourceLocale: "en",
    localizedLocale: "uk",
    disposition,
    count: products.length,
    products,
  };
}

function record(
  salt: string,
  sourceSku: string,
  disposition: CandidateDisposition,
  reasonCodes: CandidateArtifactRecord["reasonCodes"] = [],
): CandidateArtifactRecord {
  const sourceField = provenance("en", "source.field");
  const localizedField = provenance("uk", "localized.field");
  return {
    identity: { provider: "ZAKAZ", storeId: `store-${salt}`, sourceSku },
    disposition,
    reasonCodes,
    classificationDecision:
      disposition === "CANDIDATE" ? "ELIGIBLE" : disposition === "REJECTED" ? "REJECTED" : "REVIEW_REQUIRED",
    matchStatus: "MATCHED",
    sourceFingerprint: `sha256:${sha256(`${salt}:${sourceSku}:en`)}`,
    localizedFingerprint: `sha256:${sha256(`${salt}:${sourceSku}:uk`)}`,
    draft: {
      title: `Продукт ${sourceSku}`,
      sourceTitle: `Product ${sourceSku}`,
      localizedTitle: `Продукт ${sourceSku}`,
      description: null,
      brandName: "Test brand",
      sourceBrandName: "Test brand",
      localizedBrandName: "Тестовий бренд",
      rawProducerName: null,
      gtin: {
        raw: disposition === "REJECTED" ? null : "04820000000015",
        normalized: disposition === "REJECTED" ? null : "04820000000015",
        format: disposition === "REJECTED" ? null : "GTIN_14",
        status: disposition === "REJECTED" ? "MISSING" : "VALID",
      },
      package: {
        kind: disposition === "REJECTED" ? "VARIABLE_MASS" : "FIXED_MASS",
        sourceUnit: disposition === "REJECTED" ? "kg" : "pcs",
        weightG: disposition === "REJECTED" ? null : 100,
        volumeMl: null,
        itemCount: null,
        quantity: { min: 1, step: 1 },
      },
      ingredients: ["Test ingredient"],
      nutritionFacts: { ingredient_energy: "100ккал" },
      shelfLife: "30 діб",
      temperatureRange: "0...6",
      webUrl: `https://example.test/${sourceSku}`,
      sourceImageUrl: `https://example.test/${sourceSku}.jpg`,
      availability: {
        locale: "uk",
        inStock: true,
        availableForCart: true,
        verboseStock: "in_stock",
        price: 100,
        currency: "uah",
      },
    },
    fieldProvenance: {
      title: localizedField,
      description: localizedField,
      brandName: localizedField,
      rawProducerName: sourceField,
      gtin: sourceField,
      package: sourceField,
      ingredients: localizedField,
      nutritionFacts: localizedField,
      shelfLife: localizedField,
      temperatureRange: localizedField,
      webUrl: localizedField,
      sourceImageUrl: localizedField,
      availability: localizedField,
    },
    sourceCategoryIds: { source: ["test-en"], localized: ["test-uk"] },
    sourceSnapshots: {
      source: { sku: sourceSku, title: `Product ${sourceSku}` },
      localized: { sku: sourceSku, title: `Продукт ${sourceSku}` },
    },
  };
}

function provenance(locale: string, sourceField: string): FieldProvenance {
  return { locale, sourceField, fallback: false, transformation: null };
}

function output(
  fileName: string,
  disposition: CandidateDisposition,
  content: string,
): { readonly fileName: string; readonly disposition: CandidateDisposition; readonly count: 1; readonly sha256: string } {
  return { fileName, disposition, count: 1, sha256: sha256(content) };
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
