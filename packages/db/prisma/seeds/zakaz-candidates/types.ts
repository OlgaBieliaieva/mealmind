import type {
  CandidateArtifactDocument,
  CandidateDisposition,
} from "../../../scripts/zakaz/src/build-candidates.js";

export const ZAKAZ_CANDIDATE_MANIFEST_SCHEMA = "mealmind.zakaz.candidate-manifest/v1";
export const ZAKAZ_CANDIDATE_ARTIFACT_SCHEMA = "mealmind.zakaz.candidate-artifact/v1";
export const ZAKAZ_CANDIDATE_VALIDATION_SCHEMA = "mealmind.zakaz.candidate-validation/v1";

export interface ZakazCandidateManifestOutput {
  readonly fileName: string;
  readonly disposition: CandidateDisposition;
  readonly count: number;
  readonly sha256: string;
}

export interface ZakazCandidateManifest {
  readonly schema: typeof ZAKAZ_CANDIDATE_MANIFEST_SCHEMA;
  readonly generatedAt: string;
  readonly provider: "ZAKAZ";
  readonly outputs: {
    readonly candidates: ZakazCandidateManifestOutput;
    readonly reviewRequired: ZakazCandidateManifestOutput;
    readonly rejected: ZakazCandidateManifestOutput;
    readonly validation: {
      readonly fileName: string;
      readonly valid: boolean;
      readonly sha256: string;
    };
  };
}

export interface ZakazCandidateValidationReport {
  readonly schema: typeof ZAKAZ_CANDIDATE_VALIDATION_SCHEMA;
  readonly generatedAt: string;
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly checks: {
    readonly totalInputProducts: number;
    readonly totalOutputProducts: number;
    readonly uniqueOutputIdentities: number;
  };
}

export interface ZakazCandidateArtifactInput {
  readonly filePath: string;
  readonly manifest: ZakazCandidateManifestOutput;
}

export interface ZakazCandidateBundle {
  readonly manifestPath: string;
  readonly manifestChecksum: string;
  readonly manifest: ZakazCandidateManifest;
  readonly validationPath: string;
  readonly validation: ZakazCandidateValidationReport;
  readonly artifacts: readonly ZakazCandidateArtifactInput[];
}

export interface ZakazCandidateImportReport {
  readonly dryRun: boolean;
  readonly skipped: boolean;
  readonly batchId: string | null;
  readonly manifestChecksum: string;
  readonly total: number;
  readonly candidates: number;
  readonly reviewRequired: number;
  readonly rejected: number;
  readonly recordsCreated: number;
  readonly recordsUpdated: number;
  readonly eventsCreated: number;
  readonly transactionBatches: number;
}

export type { CandidateArtifactDocument };
