import { z } from "zod";

import {
  PRODUCT_IMPORT_CANDIDATE_DISPOSITIONS,
  PRODUCT_IMPORT_CANDIDATE_STATUSES,
  PRODUCT_IMPORT_REVIEW_DECISIONS,
} from "../domain/product-import-review-repository.js";

const uuid = z.string().uuid();
const expectedUpdatedAt = z.iso.datetime({ offset: true });
const comment = z.string().trim().min(1).max(4_000).nullable().optional();
const params = z.object({ id: uuid });
const mutationBody = z.object({ expectedUpdatedAt, comment }).strict();

export const listProductImportCandidatesSchema = z.object({
  params: z.object({}),
  query: z
    .object({
      search: z.string().trim().min(1).max(120).optional(),
      batchId: uuid.optional(),
      disposition: z.enum(PRODUCT_IMPORT_CANDIDATE_DISPOSITIONS).optional(),
      status: z.enum(PRODUCT_IMPORT_CANDIDATE_STATUSES).optional(),
      matchStatus: z.string().trim().min(1).max(64).optional(),
      reasonCode: z
        .string()
        .trim()
        .regex(/^[A-Z][A-Z0-9_]{1,79}$/)
        .optional(),
      reviewedByUserId: uuid.optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(25),
    })
    .strict(),
  body: z.unknown().optional(),
});

export const getProductImportCandidateSchema = z.object({
  params,
  query: z.object({}).strict(),
  body: z.unknown().optional(),
});

export const startProductImportReviewSchema = z.object({
  params,
  query: z.object({}).strict(),
  body: mutationBody,
});

export const updateProductImportReviewDraftSchema = z.object({
  params,
  query: z.object({}).strict(),
  body: z
    .object({
      expectedUpdatedAt,
      patch: z
        .record(z.string().min(1).max(80), z.json())
        .refine((value) => Object.keys(value).length > 0, "At least one draft field is required")
        .refine((value) => Object.keys(value).length <= 50, "Draft patch has too many fields"),
      comment,
    })
    .strict(),
});

export const decideProductImportReviewSchema = z.object({
  params,
  query: z.object({}).strict(),
  body: z
    .object({
      expectedUpdatedAt,
      decision: z.enum(PRODUCT_IMPORT_REVIEW_DECISIONS),
      comment,
    })
    .strict(),
});

export const reopenProductImportReviewSchema = z.object({
  params,
  query: z.object({}).strict(),
  body: mutationBody,
});

export const publishProductImportCandidateSchema = z.object({
  params,
  query: z.object({}).strict(),
  body: mutationBody,
});
