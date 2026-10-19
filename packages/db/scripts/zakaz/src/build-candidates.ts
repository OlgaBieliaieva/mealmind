import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AggregatedZakazProduct } from "./aggregate-products.js";
import {
  CLASSIFIED_PRODUCTS_SCHEMA,
  classifyGtin,
  classifyPackage,
  type ClassifiedProductsDocument,
  type ClassifiedZakazProduct,
  type ProductClassificationReason,
  type ProductGtinClassification,
  type ProductPackageClassification,
  type ProductSourceClassification,
} from "./classify-products.js";
import {
  MATCHED_LOCALES_SCHEMA,
  type LocaleMatchStatus,
  type MatchedLocaleProduct,
  type MatchedLocalesDocument,
} from "./match-locales.js";

export const CANDIDATE_ARTIFACT_SCHEMA = "mealmind.zakaz.candidate-artifact/v1";
export const CANDIDATE_MANIFEST_SCHEMA = "mealmind.zakaz.candidate-manifest/v1";
export const CANDIDATE_VALIDATION_SCHEMA = "mealmind.zakaz.candidate-validation/v1";

export type CandidateDisposition = "CANDIDATE" | "REVIEW_REQUIRED" | "REJECTED";
export type CandidatePipelineReason =
  | "MATCH_IDENTITY_CONFLICT"
  | "LOCALIZATION_MISSING"
  | "LOCALIZED_TITLE_MISSING"
  | "SOURCE_CLASSIFICATION_MISSING"
  | "DUPLICATE_NORMALIZED_GTIN";
export type CandidateReasonCode = ProductClassificationReason | CandidatePipelineReason;

export interface FieldProvenance {
  readonly locale: string | null;
  readonly sourceField: string;
  readonly fallback: boolean;
  readonly transformation: string | null;
}

export interface CandidateDraft {
  readonly title: string | null;
  readonly sourceTitle: string | null;
  readonly localizedTitle: string | null;
  readonly description: string | null;
  readonly brandName: string | null;
  readonly sourceBrandName: string | null;
  readonly localizedBrandName: string | null;
  readonly rawProducerName: string | null;
  readonly gtin: ProductGtinClassification;
  readonly package: ProductPackageClassification;
  readonly ingredients: unknown;
  readonly nutritionFacts: unknown;
  readonly shelfLife: unknown;
  readonly temperatureRange: unknown;
  readonly webUrl: string | null;
  readonly sourceImageUrl: string | null;
  readonly availability: {
    readonly locale: string | null;
    readonly inStock: boolean | null;
    readonly availableForCart: boolean | null;
    readonly verboseStock: unknown;
    readonly price: unknown;
    readonly currency: unknown;
  };
}

export interface CandidateFieldProvenance {
  readonly title: FieldProvenance;
  readonly description: FieldProvenance;
  readonly brandName: FieldProvenance;
  readonly rawProducerName: FieldProvenance;
  readonly gtin: FieldProvenance;
  readonly package: FieldProvenance;
  readonly ingredients: FieldProvenance;
  readonly nutritionFacts: FieldProvenance;
  readonly shelfLife: FieldProvenance;
  readonly temperatureRange: FieldProvenance;
  readonly webUrl: FieldProvenance;
  readonly sourceImageUrl: FieldProvenance;
  readonly availability: FieldProvenance;
}

export interface CandidateArtifactRecord {
  readonly identity: MatchedLocaleProduct["identity"];
  readonly disposition: CandidateDisposition;
  readonly reasonCodes: readonly CandidateReasonCode[];
  readonly classificationDecision: ProductSourceClassification["decision"] | null;
  readonly matchStatus: LocaleMatchStatus;
  readonly sourceFingerprint: string | null;
  readonly localizedFingerprint: string | null;
  readonly draft: CandidateDraft;
  readonly fieldProvenance: CandidateFieldProvenance;
  readonly sourceCategoryIds: {
    readonly source: readonly string[];
    readonly localized: readonly string[];
  };
  readonly sourceSnapshots: {
    readonly source: Readonly<Record<string, unknown>> | null;
    readonly localized: Readonly<Record<string, unknown>> | null;
  };
}

export interface CandidateArtifactDocument {
  readonly schema: typeof CANDIDATE_ARTIFACT_SCHEMA;
  readonly generatedAt: string;
  readonly provider: "ZAKAZ";
  readonly sourceLocale: string;
  readonly localizedLocale: string;
  readonly disposition: CandidateDisposition;
  readonly count: number;
  readonly products: readonly CandidateArtifactRecord[];
}

export interface CandidateValidationReport {
  readonly schema: typeof CANDIDATE_VALIDATION_SCHEMA;
  readonly generatedAt: string;
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly checks: {
    readonly totalInputProducts: number;
    readonly totalOutputProducts: number;
    readonly uniqueOutputIdentities: number;
    readonly duplicateCandidateGtins: number;
    readonly candidatesWithReviewReasons: number;
    readonly candidatesWithoutLocalizedTitle: number;
    readonly candidatesWithoutProvenance: number;
  };
}

export interface CandidateBuildResult {
  readonly candidates: CandidateArtifactDocument;
  readonly reviewRequired: CandidateArtifactDocument;
  readonly rejected: CandidateArtifactDocument;
  readonly validation: CandidateValidationReport;
}

export interface BuildCandidatesCliOptions {
  readonly classifiedInputFile: string;
  readonly matchedInputFile: string;
  readonly outputDirectory: string;
  readonly json: boolean;
}

interface ReadArtifact<TDocument> {
  readonly document: TDocument;
  readonly sha256: string;
  readonly fileName: string;
}

interface SelectedField {
  readonly value: unknown;
  readonly provenance: FieldProvenance;
}

const OUTPUT_FILES = {
  candidates: "zakaz-candidates.json",
  reviewRequired: "zakaz-review-required.json",
  rejected: "zakaz-rejected.json",
  manifest: "zakaz-manifest.json",
  validation: "zakaz-validation-report.json",
} as const;

export function buildCandidateArtifacts(
  classified: ClassifiedProductsDocument,
  matched: MatchedLocalesDocument,
  generatedAt = new Date().toISOString(),
): CandidateBuildResult {
  validateInputDocuments(classified, matched);
  const classifiedByKey = indexClassifiedProducts(classified.products);
  const records: CandidateArtifactRecord[] = [];

  for (const match of matched.products) {
    const classification = match.source
      ? classifiedByKey.get(identityKey(match.identity))
      : undefined;
    if (match.source && !classification) {
      throw new Error(
        `Для source product ${match.identity.storeId}/${match.identity.sourceSku} відсутня classification`,
      );
    }
    if (classification && match.source) assertSameSourceProduct(classification, match.source);
    records.push(buildCandidateRecord(match, classification ?? null, matched));
  }

  if (classifiedByKey.size !== matched.statistics.sourceProducts) {
    throw new Error(
      `Classification містить ${classifiedByKey.size} source products, matching — ${matched.statistics.sourceProducts}`,
    );
  }

  const initialCandidates = records.filter((record) => record.disposition === "CANDIDATE");
  const duplicateGtins = findDuplicateCandidateGtins(initialCandidates);
  const normalizedRecords = records.map((record) => {
    const normalizedGtin = record.draft.gtin.normalized;
    if (
      record.disposition !== "CANDIDATE" ||
      !normalizedGtin ||
      !duplicateGtins.has(normalizedGtin)
    ) {
      return record;
    }
    return {
      ...record,
      disposition: "REVIEW_REQUIRED" as const,
      reasonCodes: appendReason(record.reasonCodes, "DUPLICATE_NORMALIZED_GTIN"),
    };
  });

  const candidates = createArtifactDocument(
    normalizedRecords.filter((record) => record.disposition === "CANDIDATE"),
    "CANDIDATE",
    matched,
    generatedAt,
  );
  const reviewRequired = createArtifactDocument(
    normalizedRecords.filter((record) => record.disposition === "REVIEW_REQUIRED"),
    "REVIEW_REQUIRED",
    matched,
    generatedAt,
  );
  const rejected = createArtifactDocument(
    normalizedRecords.filter((record) => record.disposition === "REJECTED"),
    "REJECTED",
    matched,
    generatedAt,
  );
  const validation = validateCandidateArtifacts(
    matched.products.length,
    candidates,
    reviewRequired,
    rejected,
    generatedAt,
  );
  return { candidates, reviewRequired, rejected, validation };
}

export async function runBuildCandidatesCommand(arguments_: readonly string[]): Promise<void> {
  const options = parseBuildCandidatesArguments(arguments_);
  const [classifiedInput, matchedInput] = await Promise.all([
    readArtifact<ClassifiedProductsDocument>(options.classifiedInputFile),
    readArtifact<MatchedLocalesDocument>(options.matchedInputFile),
  ]);
  const generatedAt = new Date().toISOString();
  const result = buildCandidateArtifacts(
    classifiedInput.document,
    matchedInput.document,
    generatedAt,
  );
  await mkdir(options.outputDirectory, { recursive: true });

  const serialized = {
    candidates: serializeJson(result.candidates),
    reviewRequired: serializeJson(result.reviewRequired),
    rejected: serializeJson(result.rejected),
    validation: serializeJson(result.validation),
  };
  await Promise.all([
    writeFile(
      path.join(options.outputDirectory, OUTPUT_FILES.candidates),
      serialized.candidates,
      "utf8",
    ),
    writeFile(
      path.join(options.outputDirectory, OUTPUT_FILES.reviewRequired),
      serialized.reviewRequired,
      "utf8",
    ),
    writeFile(
      path.join(options.outputDirectory, OUTPUT_FILES.rejected),
      serialized.rejected,
      "utf8",
    ),
    writeFile(
      path.join(options.outputDirectory, OUTPUT_FILES.validation),
      serialized.validation,
      "utf8",
    ),
  ]);

  const manifest = createManifest({
    generatedAt,
    classifiedInput,
    matchedInput,
    result,
    outputHashes: {
      candidates: sha256(serialized.candidates),
      reviewRequired: sha256(serialized.reviewRequired),
      rejected: sha256(serialized.rejected),
      validation: sha256(serialized.validation),
    },
  });
  await writeFile(
    path.join(options.outputDirectory, OUTPUT_FILES.manifest),
    serializeJson(manifest),
    "utf8",
  );

  if (!result.validation.valid) {
    throw new Error(
      `Candidate artifacts не пройшли validation: ${result.validation.errors.join("; ")}`,
    );
  }

  const summary = {
    candidates: result.candidates.count,
    reviewRequired: result.reviewRequired.count,
    rejected: result.rejected.count,
    outputDirectory: options.outputDirectory,
  };
  if (options.json) {
    process.stdout.write(`${JSON.stringify({ success: true, ...summary }, null, 2)}\n`);
  } else {
    process.stdout.write(
      [
        "Zakaz candidate artifacts: OK",
        `Candidates: ${summary.candidates}`,
        `Review required: ${summary.reviewRequired}`,
        `Rejected: ${summary.rejected}`,
        `Output: ${summary.outputDirectory}`,
      ].join("\n") + "\n",
    );
  }
}

export function parseBuildCandidatesArguments(
  arguments_: readonly string[],
): BuildCandidatesCliOptions {
  let classifiedInputFile = path.resolve("scripts/zakaz/data/work/products-en-classified.json");
  let matchedInputFile = path.resolve("scripts/zakaz/data/work/products-en-uk-matched.json");
  let outputDirectory = path.resolve("scripts/zakaz/data/output");
  let json = false;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--classified-input") {
      classifiedInputFile = path.resolve(requireValue(arguments_, ++index, argument));
    } else if (argument === "--matched-input") {
      matchedInputFile = path.resolve(requireValue(arguments_, ++index, argument));
    } else if (argument === "--output-directory") {
      outputDirectory = path.resolve(requireValue(arguments_, ++index, argument));
    } else if (argument === "--json") {
      json = true;
    } else {
      throw new Error(`Невідомий аргумент build-candidates: ${argument}`);
    }
  }
  return { classifiedInputFile, matchedInputFile, outputDirectory, json };
}

export const BUILD_CANDIDATES_USAGE = `Формування локальних Zakaz import candidate artifacts.

Usage:
  npm run zakaz -- build-candidates [options]

Options:
  --classified-input <path>  EN classified artifact
  --matched-input <path>     EN/UK matched artifact
  --output-directory <path>  Output directory (default: data/output)
  --json                     Вивести machine-readable summary
  --help                     Показати цю довідку
`;

function buildCandidateRecord(
  match: MatchedLocaleProduct,
  classified: ClassifiedZakazProduct | null,
  document: MatchedLocalesDocument,
): CandidateArtifactRecord {
  const sourceData = match.source?.productData ?? null;
  const localizedData = match.localized?.productData ?? null;
  const classification = classified?.classification ?? null;
  const reasonCodes: CandidateReasonCode[] = classification ? [...classification.reasonCodes] : [];

  if (match.matchStatus === "MATCH_REVIEW_REQUIRED") {
    reasonCodes.push("MATCH_IDENTITY_CONFLICT");
  } else if (match.matchStatus === "SOURCE_ONLY") {
    reasonCodes.push("LOCALIZATION_MISSING");
  } else if (match.matchStatus === "LOCALIZED_ONLY") {
    reasonCodes.push("SOURCE_CLASSIFICATION_MISSING");
  }

  const localizedTitle = readString(localizedData?.title);
  if (match.localized && !localizedTitle) reasonCodes.push("LOCALIZED_TITLE_MISSING");

  let disposition: CandidateDisposition;
  if (classification?.decision === "REJECTED") disposition = "REJECTED";
  else if (
    !classification ||
    classification.decision === "REVIEW_REQUIRED" ||
    match.matchStatus !== "MATCHED" ||
    !localizedTitle
  ) {
    disposition = "REVIEW_REQUIRED";
  } else {
    disposition = "CANDIDATE";
  }

  const title = selectField(sourceData, localizedData, "title", document);
  const description = selectField(sourceData, localizedData, "description", document);
  const ingredients = selectField(sourceData, localizedData, "ingredients", document);
  const nutritionFacts = selectField(sourceData, localizedData, "nutrition_facts", document);
  const shelfLife = selectField(sourceData, localizedData, "shelf_life", document);
  const temperatureRange = selectField(sourceData, localizedData, "temperature_range", document);
  const webUrl = selectField(sourceData, localizedData, "web_url", document);
  const producerName = selectNestedProducerField(sourceData, localizedData, "name", document);
  const sourceBrandName = readProducerString(sourceData, "trademark");
  const localizedBrandName = readProducerString(localizedData, "trademark");
  const brandName = localizedBrandName ?? sourceBrandName;
  const image = selectImage(sourceData, localizedData, document);
  const availabilityData = localizedData ?? sourceData;
  const availabilityLocale = localizedData
    ? document.localizedLocale
    : sourceData
      ? document.sourceLocale
      : null;
  const gtin = classification?.gtin ?? classifyGtin(localizedData?.ean);
  const packageClassification =
    classification?.package ?? classifyPackage(localizedData ?? Object.create(null));

  return {
    identity: match.identity,
    disposition,
    reasonCodes: uniqueReasons(reasonCodes),
    classificationDecision: classification?.decision ?? null,
    matchStatus: match.matchStatus,
    sourceFingerprint: match.sourceFingerprint,
    localizedFingerprint: match.localizedFingerprint,
    draft: {
      title: readString(title.value),
      sourceTitle: readString(sourceData?.title),
      localizedTitle,
      description: readString(description.value),
      brandName,
      sourceBrandName,
      localizedBrandName,
      rawProducerName: readString(producerName.value),
      gtin,
      package: packageClassification,
      ingredients: ingredients.value,
      nutritionFacts: nutritionFacts.value,
      shelfLife: shelfLife.value,
      temperatureRange: temperatureRange.value,
      webUrl: readString(webUrl.value),
      sourceImageUrl: readString(image.value),
      availability: {
        locale: availabilityLocale,
        inStock: readBoolean(availabilityData?.in_stock),
        availableForCart: readBoolean(availabilityData?.available_for_cart),
        verboseStock: availabilityData?.verbose_stock ?? null,
        price: availabilityData?.price ?? null,
        currency: availabilityData?.currency ?? null,
      },
    },
    fieldProvenance: {
      title: title.provenance,
      description: description.provenance,
      brandName: {
        locale: localizedBrandName
          ? document.localizedLocale
          : sourceBrandName
            ? document.sourceLocale
            : null,
        sourceField: "productData.producer.trademark",
        fallback: !localizedBrandName && Boolean(sourceBrandName),
        transformation: null,
      },
      rawProducerName: producerName.provenance,
      gtin: {
        locale: classification ? document.sourceLocale : document.localizedLocale,
        sourceField: "productData.ean",
        fallback: false,
        transformation: "GTIN_NORMALIZATION",
      },
      package: {
        locale: classification ? document.sourceLocale : document.localizedLocale,
        sourceField: "productData.unit|weight|volume|pack_amount",
        fallback: false,
        transformation: "PACKAGE_CLASSIFICATION",
      },
      ingredients: ingredients.provenance,
      nutritionFacts: nutritionFacts.provenance,
      shelfLife: shelfLife.provenance,
      temperatureRange: temperatureRange.provenance,
      webUrl: webUrl.provenance,
      sourceImageUrl: image.provenance,
      availability: {
        locale: availabilityLocale,
        sourceField: "productData.in_stock|available_for_cart|verbose_stock|price|currency",
        fallback: !localizedData && Boolean(sourceData),
        transformation: "AVAILABILITY_SNAPSHOT",
      },
    },
    sourceCategoryIds: {
      source: match.source?.sourceCategoryIds ?? [],
      localized: match.localized?.sourceCategoryIds ?? [],
    },
    sourceSnapshots: { source: sourceData, localized: localizedData },
  };
}

function selectField(
  sourceData: Readonly<Record<string, unknown>> | null,
  localizedData: Readonly<Record<string, unknown>> | null,
  field: string,
  document: MatchedLocalesDocument,
): SelectedField {
  const localizedValue = localizedData?.[field];
  if (isPopulated(localizedValue)) {
    return {
      value: localizedValue,
      provenance: {
        locale: document.localizedLocale,
        sourceField: `productData.${field}`,
        fallback: false,
        transformation: null,
      },
    };
  }
  const sourceValue = sourceData?.[field];
  return {
    value: isPopulated(sourceValue) ? sourceValue : null,
    provenance: {
      locale: isPopulated(sourceValue) ? document.sourceLocale : null,
      sourceField: `productData.${field}`,
      fallback: isPopulated(sourceValue),
      transformation: null,
    },
  };
}

function selectNestedProducerField(
  sourceData: Readonly<Record<string, unknown>> | null,
  localizedData: Readonly<Record<string, unknown>> | null,
  field: string,
  document: MatchedLocalesDocument,
): SelectedField {
  const localizedValue = readProducerString(localizedData, field);
  if (localizedValue) {
    return {
      value: localizedValue,
      provenance: {
        locale: document.localizedLocale,
        sourceField: `productData.producer.${field}`,
        fallback: false,
        transformation: null,
      },
    };
  }
  const sourceValue = readProducerString(sourceData, field);
  return {
    value: sourceValue,
    provenance: {
      locale: sourceValue ? document.sourceLocale : null,
      sourceField: `productData.producer.${field}`,
      fallback: Boolean(sourceValue),
      transformation: null,
    },
  };
}

function selectImage(
  sourceData: Readonly<Record<string, unknown>> | null,
  localizedData: Readonly<Record<string, unknown>> | null,
  document: MatchedLocalesDocument,
): SelectedField {
  const localizedImage = extractImageUrl(localizedData);
  if (localizedImage) {
    return {
      value: localizedImage,
      provenance: {
        locale: document.localizedLocale,
        sourceField: "productData.img|gallery[0]",
        fallback: false,
        transformation: "PREFER_S1350X1350",
      },
    };
  }
  const sourceImage = extractImageUrl(sourceData);
  return {
    value: sourceImage,
    provenance: {
      locale: sourceImage ? document.sourceLocale : null,
      sourceField: "productData.img|gallery[0]",
      fallback: Boolean(sourceImage),
      transformation: "PREFER_S1350X1350",
    },
  };
}

function extractImageUrl(data: Readonly<Record<string, unknown>> | null): string | null {
  if (!data) return null;
  const imageCandidates: unknown[] = [data.img];
  if (Array.isArray(data.gallery)) imageCandidates.push(data.gallery[0]);
  for (const image of imageCandidates) {
    if (!isRecord(image)) continue;
    for (const size of ["s1350x1350", "s350x350", "s200x200", "s150x150"] as const) {
      const value = readString(image[size]);
      if (value && isAllowedImageUrl(value)) return value;
    }
  }
  return null;
}

function isAllowedImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /^img\d+\.zakaz\.ua$/u.test(url.hostname);
  } catch {
    return false;
  }
}

function createArtifactDocument(
  products: readonly CandidateArtifactRecord[],
  disposition: CandidateDisposition,
  matched: MatchedLocalesDocument,
  generatedAt: string,
): CandidateArtifactDocument {
  const sorted = [...products].sort(compareCandidateIdentity);
  return {
    schema: CANDIDATE_ARTIFACT_SCHEMA,
    generatedAt,
    provider: "ZAKAZ",
    sourceLocale: matched.sourceLocale,
    localizedLocale: matched.localizedLocale,
    disposition,
    count: sorted.length,
    products: sorted,
  };
}

function validateCandidateArtifacts(
  totalInputProducts: number,
  candidates: CandidateArtifactDocument,
  reviewRequired: CandidateArtifactDocument,
  rejected: CandidateArtifactDocument,
  generatedAt: string,
): CandidateValidationReport {
  const all = [...candidates.products, ...reviewRequired.products, ...rejected.products];
  const identityKeys = all.map((product) => identityKey(product.identity));
  const uniqueOutputIdentities = new Set(identityKeys).size;
  const duplicateCandidateGtins = findDuplicateCandidateGtins(candidates.products).size;
  const candidatesWithReviewReasons = candidates.products.filter(
    (product) => product.reasonCodes.length > 0,
  ).length;
  const candidatesWithoutLocalizedTitle = candidates.products.filter(
    (product) => !product.draft.localizedTitle,
  ).length;
  const candidatesWithoutProvenance = candidates.products.filter(
    (product) => !product.fieldProvenance.title.locale || !product.fieldProvenance.gtin.locale,
  ).length;
  const errors: string[] = [];
  if (all.length !== totalInputProducts) {
    errors.push(`Output total ${all.length} не відповідає input total ${totalInputProducts}`);
  }
  if (uniqueOutputIdentities !== all.length) {
    errors.push(`Output містить ${all.length - uniqueOutputIdentities} duplicate identities`);
  }
  if (duplicateCandidateGtins > 0) {
    errors.push(`Candidates містять ${duplicateCandidateGtins} duplicate normalized GTIN groups`);
  }
  if (candidatesWithReviewReasons > 0) {
    errors.push(`Candidates містять ${candidatesWithReviewReasons} records із reason codes`);
  }
  if (candidatesWithoutLocalizedTitle > 0) {
    errors.push(`Candidates без localized title: ${candidatesWithoutLocalizedTitle}`);
  }
  if (candidatesWithoutProvenance > 0) {
    errors.push(`Candidates без обов'язкового provenance: ${candidatesWithoutProvenance}`);
  }

  return {
    schema: CANDIDATE_VALIDATION_SCHEMA,
    generatedAt,
    valid: errors.length === 0,
    errors,
    warnings: [],
    checks: {
      totalInputProducts,
      totalOutputProducts: all.length,
      uniqueOutputIdentities,
      duplicateCandidateGtins,
      candidatesWithReviewReasons,
      candidatesWithoutLocalizedTitle,
      candidatesWithoutProvenance,
    },
  };
}

function createManifest(input: {
  readonly generatedAt: string;
  readonly classifiedInput: ReadArtifact<ClassifiedProductsDocument>;
  readonly matchedInput: ReadArtifact<MatchedLocalesDocument>;
  readonly result: CandidateBuildResult;
  readonly outputHashes: {
    readonly candidates: string;
    readonly reviewRequired: string;
    readonly rejected: string;
    readonly validation: string;
  };
}) {
  const reasonCounts: Record<string, number> = {};
  for (const product of [
    ...input.result.reviewRequired.products,
    ...input.result.rejected.products,
  ]) {
    for (const reason of product.reasonCodes)
      reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
  }
  const candidates = input.result.candidates.products;
  return {
    schema: CANDIDATE_MANIFEST_SCHEMA,
    generatedAt: input.generatedAt,
    provider: "ZAKAZ" as const,
    policy: {
      availabilityAffectsEligibility: false,
      localizedTitleRequiredForCandidate: true,
      sourceOnlyRequiresReview: true,
      localizedOnlyRequiresReview: true,
      identityConflictRequiresReview: true,
      duplicateGtinRequiresReview: true,
      preferredImageSize: "s1350x1350",
    },
    inputs: {
      classified: {
        fileName: input.classifiedInput.fileName,
        schema: input.classifiedInput.document.schema,
        sha256: input.classifiedInput.sha256,
      },
      matched: {
        fileName: input.matchedInput.fileName,
        schema: input.matchedInput.document.schema,
        sha256: input.matchedInput.sha256,
      },
    },
    outputs: {
      candidates: artifactManifestEntry(
        OUTPUT_FILES.candidates,
        input.result.candidates,
        input.outputHashes.candidates,
      ),
      reviewRequired: artifactManifestEntry(
        OUTPUT_FILES.reviewRequired,
        input.result.reviewRequired,
        input.outputHashes.reviewRequired,
      ),
      rejected: artifactManifestEntry(
        OUTPUT_FILES.rejected,
        input.result.rejected,
        input.outputHashes.rejected,
      ),
      validation: {
        fileName: OUTPUT_FILES.validation,
        valid: input.result.validation.valid,
        sha256: input.outputHashes.validation,
      },
    },
    statistics: {
      reasonCounts: Object.fromEntries(
        Object.entries(reasonCounts).sort(([left], [right]) => left.localeCompare(right)),
      ),
      candidateCoverage: {
        description: candidates.filter((product) => product.draft.description).length,
        ingredients: candidates.filter((product) => isPopulated(product.draft.ingredients)).length,
        shelfLife: candidates.filter((product) => isPopulated(product.draft.shelfLife)).length,
        temperatureRange: candidates.filter((product) =>
          isPopulated(product.draft.temperatureRange),
        ).length,
        webUrl: candidates.filter((product) => product.draft.webUrl).length,
        sourceImageUrl: candidates.filter((product) => product.draft.sourceImageUrl).length,
      },
    },
  };
}

function artifactManifestEntry(
  fileName: string,
  document: CandidateArtifactDocument,
  hash: string,
) {
  return { fileName, disposition: document.disposition, count: document.count, sha256: hash };
}

async function readArtifact<TDocument>(filePath: string): Promise<ReadArtifact<TDocument>> {
  const content = await readFile(filePath);
  const document = JSON.parse(content.toString("utf8")) as TDocument;
  return { document, sha256: sha256(content), fileName: path.basename(filePath) };
}

function validateInputDocuments(
  classified: ClassifiedProductsDocument,
  matched: MatchedLocalesDocument,
): void {
  if (classified.schema !== CLASSIFIED_PRODUCTS_SCHEMA) {
    throw new Error(`Непідтримувана classified schema: ${String(classified.schema)}`);
  }
  if (matched.schema !== MATCHED_LOCALES_SCHEMA) {
    throw new Error(`Непідтримувана matched schema: ${String(matched.schema)}`);
  }
  if (classified.locale !== matched.sourceLocale) {
    throw new Error(
      `Classified locale ${classified.locale} не відповідає matching source ${matched.sourceLocale}`,
    );
  }
}

function indexClassifiedProducts(
  products: readonly ClassifiedZakazProduct[],
): ReadonlyMap<string, ClassifiedZakazProduct> {
  const index = new Map<string, ClassifiedZakazProduct>();
  for (const product of products) {
    const key = identityKey({ storeId: product.sourceStoreId, sourceSku: product.sourceSku });
    if (index.has(key)) throw new Error(`Duplicate classified identity ${key}`);
    index.set(key, product);
  }
  return index;
}

function assertSameSourceProduct(
  classified: ClassifiedZakazProduct,
  matched: AggregatedZakazProduct,
): void {
  const classifiedSource = { ...classified } as Omit<ClassifiedZakazProduct, "classification"> & {
    classification?: ProductSourceClassification;
  };
  delete classifiedSource.classification;
  if (stableStringify(classifiedSource) !== stableStringify(matched)) {
    throw new Error(
      `Classification і matching використовують різні source snapshots для ${matched.sourceStoreId}/${matched.sourceSku}`,
    );
  }
}

function findDuplicateCandidateGtins(
  products: readonly CandidateArtifactRecord[],
): ReadonlySet<string> {
  const counts = new Map<string, number>();
  for (const product of products) {
    const gtin = product.draft.gtin.normalized;
    if (gtin) counts.set(gtin, (counts.get(gtin) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([gtin]) => gtin));
}

function compareCandidateIdentity(
  left: CandidateArtifactRecord,
  right: CandidateArtifactRecord,
): number {
  return (
    left.identity.storeId.localeCompare(right.identity.storeId) ||
    left.identity.sourceSku.localeCompare(right.identity.sourceSku, "en", { numeric: true })
  );
}

function identityKey(identity: { readonly storeId: string; readonly sourceSku: string }): string {
  return `${identity.storeId}\u0000${identity.sourceSku}`;
}

function appendReason(
  reasons: readonly CandidateReasonCode[],
  reason: CandidateReasonCode,
): readonly CandidateReasonCode[] {
  return uniqueReasons([...reasons, reason]);
}

function uniqueReasons(reasons: readonly CandidateReasonCode[]): readonly CandidateReasonCode[] {
  return [...new Set(reasons)];
}

function readProducerString(
  data: Readonly<Record<string, unknown>> | null,
  field: string,
): string | null {
  const producer = isRecord(data?.producer) ? data.producer : null;
  return readString(producer?.[field]);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function isPopulated(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value: string | NodeJS.ArrayBufferView): string {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireValue(arguments_: readonly string[], index: number, option: string): string {
  const value = arguments_[index];
  if (!value) throw new Error(`Для ${option} потрібно передати значення`);
  return value;
}
