import { createHash } from "node:crypto";

import { Prisma, type DatabaseClient } from "../../../src/index.js";
import type { CandidateArtifactRecord } from "../../../scripts/zakaz/src/build-candidates.js";
import { v5 as uuidV5 } from "uuid";

import { loadZakazCandidateArtifact } from "./files.js";
import type {
  CandidateArtifactDocument,
  ZakazCandidateBundle,
  ZakazCandidateImportReport,
} from "./types.js";

const ZAKAZ_IMPORT_UUID_NAMESPACE = "1a7fd019-cbc5-4ffc-a7ba-b5a579cccd6f";
const DEFAULT_BATCH_SIZE = 100;

interface CandidateImportRow {
  readonly id: string;
  readonly batchId: string;
  readonly storeExternalId: string;
  readonly sourceSku: string;
  readonly disposition: "CANDIDATE" | "REVIEW_REQUIRED" | "REJECTED";
  readonly status: "PENDING" | "REJECTED";
  readonly reasonCodes: Prisma.InputJsonValue;
  readonly matchStatus: string;
  readonly classificationDecision: string | null;
  readonly normalizedGtin: string | null;
  readonly sourceFingerprint: string | null;
  readonly localizedFingerprint: string | null;
  readonly sourceCategoryIds: Prisma.InputJsonValue;
  readonly sourceDraft: Prisma.InputJsonValue;
  readonly reviewDraft: Prisma.InputJsonValue;
  readonly fieldProvenance: Prisma.InputJsonValue;
  readonly sourceSnapshots: Prisma.InputJsonValue;
}

export interface ImportZakazCandidatesOptions {
  readonly database?: DatabaseClient;
  readonly bundle: ZakazCandidateBundle;
  readonly dryRun?: boolean;
  readonly batchSize?: number;
}

export async function importZakazCandidates(
  options: ImportZakazCandidatesOptions,
): Promise<ZakazCandidateImportReport> {
  const dryRun = options.dryRun ?? false;
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  validateBatchSize(batchSize);

  if (!dryRun && !options.database) {
    throw new Error("Database client is required for Zakaz candidate import");
  }

  const counts = manifestCounts(options.bundle);
  const database = options.database;

  if (!dryRun && database) {
    const completed = await database.productImportBatch.findUnique({
      where: { manifestChecksum: options.bundle.manifestChecksum },
      select: { id: true, status: true },
    });

    if (completed?.status === "COMPLETED") {
      return report({
        dryRun: false,
        skipped: true,
        batchId: completed.id,
        manifestChecksum: options.bundle.manifestChecksum,
        ...counts,
        recordsCreated: 0,
        recordsUpdated: 0,
        eventsCreated: 0,
        transactionBatches: 0,
      });
    }
  }

  let batchId: string | null = null;
  let sourceLocale: string | null = null;
  let localizedLocale: string | null = null;
  let recordsCreated = 0;
  let recordsUpdated = 0;
  let eventsCreated = 0;
  let transactionBatches = 0;
  const identities = new Set<string>();

  try {
    for (const artifactInput of options.bundle.artifacts) {
      const document = await loadZakazCandidateArtifact(artifactInput);
      assertDocumentMetadata(options.bundle, document, sourceLocale, localizedLocale);
      sourceLocale ??= document.sourceLocale;
      localizedLocale ??= document.localizedLocale;

      if (!dryRun && database && batchId === null) {
        batchId = await prepareImportBatch(database, options.bundle, document, counts);
      }

      for (let offset = 0; offset < document.products.length; offset += batchSize) {
        const records = document.products.slice(offset, offset + batchSize);
        assertGloballyUniqueIdentities(records, identities);
        transactionBatches += 1;

        if (!dryRun && database && batchId) {
          const result = await persistCandidateBatch(
            database,
            batchId,
            options.bundle.manifestChecksum,
            records,
          );
          recordsCreated += result.created;
          recordsUpdated += result.updated;
          eventsCreated += result.eventsCreated;
        }
      }
    }

    if (identities.size !== counts.total) {
      throw new Error(
        `Zakaz artifacts містять ${identities.size} unique identities замість ${counts.total}`,
      );
    }

    if (!dryRun && database && batchId) {
      const persisted = await database.productImportCandidate.count({ where: { batchId } });
      if (persisted !== counts.total) {
        throw new Error(`У DB записано ${persisted} candidates замість ${counts.total}`);
      }

      await database.productImportBatch.update({
        where: { id: batchId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          failedAt: null,
          failureMessage: null,
        },
      });
    }

    return report({
      dryRun,
      skipped: false,
      batchId,
      manifestChecksum: options.bundle.manifestChecksum,
      ...counts,
      recordsCreated,
      recordsUpdated,
      eventsCreated,
      transactionBatches,
    });
  } catch (error) {
    if (!dryRun && database && batchId) {
      await database.productImportBatch.update({
        where: { id: batchId },
        data: {
          status: "FAILED",
          completedAt: null,
          failedAt: new Date(),
          failureMessage: safeFailureMessage(error),
        },
      });
    }
    throw error;
  }
}

async function prepareImportBatch(
  database: DatabaseClient,
  bundle: ZakazCandidateBundle,
  document: CandidateArtifactDocument,
  counts: ReturnType<typeof manifestCounts>,
): Promise<string> {
  const id = uuidV5(`manifest:${bundle.manifestChecksum}`, ZAKAZ_IMPORT_UUID_NAMESPACE);
  const startedAt = new Date();

  const batch = await database.productImportBatch.upsert({
    where: { manifestChecksum: bundle.manifestChecksum },
    create: {
      id,
      provider: "ZAKAZ",
      dataset: "ZAKAZ_RETAIL_CATALOG",
      artifactSchema: document.schema,
      manifestChecksum: bundle.manifestChecksum,
      generatedAt: new Date(bundle.manifest.generatedAt),
      sourceLocale: document.sourceLocale,
      localizedLocale: document.localizedLocale,
      status: "IMPORTING",
      candidateCount: counts.candidates,
      reviewRequiredCount: counts.reviewRequired,
      rejectedCount: counts.rejected,
      totalCount: counts.total,
      startedAt,
    },
    update: {
      provider: "ZAKAZ",
      dataset: "ZAKAZ_RETAIL_CATALOG",
      artifactSchema: document.schema,
      generatedAt: new Date(bundle.manifest.generatedAt),
      sourceLocale: document.sourceLocale,
      localizedLocale: document.localizedLocale,
      status: "IMPORTING",
      candidateCount: counts.candidates,
      reviewRequiredCount: counts.reviewRequired,
      rejectedCount: counts.rejected,
      totalCount: counts.total,
      startedAt,
      completedAt: null,
      failedAt: null,
      failureMessage: null,
    },
    select: { id: true },
  });

  return batch.id;
}

async function persistCandidateBatch(
  database: DatabaseClient,
  batchId: string,
  manifestChecksum: string,
  records: readonly CandidateArtifactRecord[],
): Promise<{ readonly created: number; readonly updated: number; readonly eventsCreated: number }> {
  const candidateRows = records.map((record) =>
    candidateCreateData(batchId, manifestChecksum, record),
  );
  const ids = candidateRows.map((candidate) => candidate.id);

  return database.$transaction(
    async (transaction) => {
      const existing = await transaction.productImportCandidate.findMany({
        where: { id: { in: ids } },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((candidate) => candidate.id));
      const newRows = candidateRows.filter((candidate) => !existingIds.has(candidate.id));
      const existingRows = candidateRows.filter((candidate) => existingIds.has(candidate.id));

      const created =
        newRows.length === 0
          ? 0
          : (
              await transaction.productImportCandidate.createMany({
                data: newRows,
                skipDuplicates: true,
              })
            ).count;

      for (const candidate of existingRows) {
        await transaction.productImportCandidate.update({
          where: { id: candidate.id },
          data: {
            disposition: candidate.disposition,
            reasonCodes: candidate.reasonCodes,
            matchStatus: candidate.matchStatus,
            classificationDecision: candidate.classificationDecision,
            normalizedGtin: candidate.normalizedGtin,
            sourceFingerprint: candidate.sourceFingerprint,
            localizedFingerprint: candidate.localizedFingerprint,
            sourceCategoryIds: candidate.sourceCategoryIds,
            sourceDraft: candidate.sourceDraft,
            fieldProvenance: candidate.fieldProvenance,
            sourceSnapshots: candidate.sourceSnapshots,
          },
        });
      }

      const events: Prisma.ProductImportCandidateEventCreateManyInput[] = candidateRows.map(
        (candidate) => ({
          id: uuidV5(`event:imported:${candidate.id}`, ZAKAZ_IMPORT_UUID_NAMESPACE),
          candidateId: candidate.id,
          action: "IMPORTED" as const,
          fromStatus: null,
          toStatus: candidate.status,
          changeSet: asJson({
            disposition: candidate.disposition,
            reasonCodes: candidate.reasonCodes,
          }),
          deduplicationKey: `import:${sha256(`${manifestChecksum}:${candidate.id}`)}`,
        }),
      );
      const eventsCreated = (
        await transaction.productImportCandidateEvent.createMany({
          data: events,
          skipDuplicates: true,
        })
      ).count;

      return { created, updated: existingRows.length, eventsCreated };
    },
    { maxWait: 30_000, timeout: 120_000 },
  );
}

function candidateCreateData(
  batchId: string,
  manifestChecksum: string,
  record: CandidateArtifactRecord,
): CandidateImportRow {
  const id = uuidV5(
    `candidate:${manifestChecksum}:${record.identity.storeId}:${record.identity.sourceSku}`,
    ZAKAZ_IMPORT_UUID_NAMESPACE,
  );
  const status = record.disposition === "REJECTED" ? "REJECTED" : "PENDING";

  return {
    id,
    batchId,
    storeExternalId: record.identity.storeId,
    sourceSku: record.identity.sourceSku,
    disposition: record.disposition,
    status,
    reasonCodes: asJson(record.reasonCodes),
    matchStatus: record.matchStatus,
    classificationDecision: record.classificationDecision,
    normalizedGtin: record.draft.gtin.normalized,
    sourceFingerprint: record.sourceFingerprint,
    localizedFingerprint: record.localizedFingerprint,
    sourceCategoryIds: asJson(record.sourceCategoryIds),
    sourceDraft: asJson(record.draft),
    reviewDraft: asJson(record.draft),
    fieldProvenance: asJson(record.fieldProvenance),
    sourceSnapshots: asJson(record.sourceSnapshots),
  };
}

function assertDocumentMetadata(
  bundle: ZakazCandidateBundle,
  document: CandidateArtifactDocument,
  sourceLocale: string | null,
  localizedLocale: string | null,
): void {
  if (document.generatedAt !== bundle.manifest.generatedAt) {
    throw new Error("Artifact generatedAt не відповідає manifest");
  }
  if (sourceLocale !== null && document.sourceLocale !== sourceLocale) {
    throw new Error("Artifacts містять різні sourceLocale");
  }
  if (localizedLocale !== null && document.localizedLocale !== localizedLocale) {
    throw new Error("Artifacts містять різні localizedLocale");
  }
}

function assertGloballyUniqueIdentities(
  records: readonly CandidateArtifactRecord[],
  identities: Set<string>,
): void {
  for (const record of records) {
    const key = JSON.stringify([record.identity.storeId, record.identity.sourceSku]);
    if (identities.has(key)) {
      throw new Error(
        `Source identity зустрічається у кількох artifacts: ${record.identity.storeId}/${record.identity.sourceSku}`,
      );
    }
    identities.add(key);
  }
}

function manifestCounts(bundle: ZakazCandidateBundle) {
  const candidates = bundle.manifest.outputs.candidates.count;
  const reviewRequired = bundle.manifest.outputs.reviewRequired.count;
  const rejected = bundle.manifest.outputs.rejected.count;
  return { candidates, reviewRequired, rejected, total: candidates + reviewRequired + rejected };
}

function report(input: ZakazCandidateImportReport): ZakazCandidateImportReport {
  return Object.freeze(input);
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function validateBatchSize(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 500) {
    throw new Error("Zakaz candidate import batchSize must be an integer between 1 and 500");
  }
}

function safeFailureMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown Zakaz candidate import error";
  return message.slice(0, 2_000);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
