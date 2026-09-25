import { z } from "zod";

import { REFERENCE_RESOURCES } from "../domain/reference-repository.js";

const emptyBodySchema = z.union([z.undefined(), z.object({}).strict()]);

export const listReferenceSchema = z.object({
  params: z.object({
    resource: z.enum(REFERENCE_RESOURCES),
  }),
  query: z.object({
    search: z.string().trim().min(1).max(120).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
    includeInactive: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .default(false),
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
    verificationStatus: z.enum(["UNVERIFIED", "VERIFIED", "REJECTED"]).optional(),
  }),
  body: emptyBodySchema,
});

export const archiveReferenceSchema = z.object({
  params: z.object({ resource: z.enum(REFERENCE_RESOURCES), id: z.uuid() }),
  query: z.object({}),
  body: emptyBodySchema,
});

export const reserveAuthorAvatarSchema = z.object({
  params: z.object({ id: z.uuid() }),
  query: z.object({}),
  body: z.object({
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    byteSize: z
      .number()
      .int()
      .min(1)
      .max(3 * 1024 * 1024),
  }),
});

export const completeAuthorAvatarSchema = z.object({
  params: z.object({ id: z.uuid() }),
  query: z.object({}),
  body: z.object({ objectPath: z.string().trim().min(1).max(1024) }),
});

export const deleteAuthorAvatarSchema = z.object({
  params: z.object({ id: z.uuid() }),
  query: z.object({}),
  body: emptyBodySchema,
});
