import type { RequestHandler } from "express";

import { getAuthenticatedUser } from "../../../http/auth/request-context.js";
import { validateRequest } from "../../../http/validation/validate-request.js";
import type { ReferenceService } from "../application/reference-service.js";
import { presentReference, presentReferencePage } from "./reference-presenter.js";
import { listReferenceSchema } from "./reference-schema.js";
import { createReferenceSchema, updateReferenceSchema } from "./reference-write-schema.js";

export interface ReferenceController {
  readonly list: RequestHandler;
  readonly create: RequestHandler;
  readonly update: RequestHandler;
}

export function createReferenceController(service: ReferenceService): ReferenceController {
  return Object.freeze({
    list: validateRequest(listReferenceSchema, async (input, request, response) => {
      const page = await service.list(input.params.resource, input.query);

      response.set(
        "cache-control",
        request.path.startsWith("/admin/")
          ? "no-store"
          : "private, max-age=300, stale-while-revalidate=600",
      );
      response.status(200).json(presentReferencePage(page));
    }),

    create: validateRequest(createReferenceSchema, async (input, request, response) => {
      const actor = getAuthenticatedUser(request);
      const record = await service.create(input.params.resource, input.body, actor.userId);

      response.set("cache-control", "no-store");
      response.status(201).json(presentReference(record));
    }),

    update: validateRequest(updateReferenceSchema, async (input, _request, response) => {
      const record = await service.update(input.params.resource, input.params.id, input.body);

      response.set("cache-control", "no-store");
      response.status(200).json(presentReference(record));
    }),
  });
}
