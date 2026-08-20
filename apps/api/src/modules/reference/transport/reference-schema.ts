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
  }),
  body: emptyBodySchema,
});

export const archiveReferenceSchema = z.object({
  params: z.object({ resource: z.enum(REFERENCE_RESOURCES), id: z.uuid() }),
  query: z.object({}),
  body: emptyBodySchema,
});
