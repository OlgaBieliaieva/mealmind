import type { RequestHandler } from "express";

import { getAuthenticatedUser } from "../../../http/auth/request-context.js";
import { validateRequest } from "../../../http/validation/validate-request.js";
import type { ReferenceService } from "../application/reference-service.js";
import type { AuthorAvatarService } from "../application/author-avatar-service.js";
import { presentReference, presentReferencePage } from "./reference-presenter.js";
import {
  archiveReferenceSchema,
  completeAuthorAvatarSchema,
  deleteAuthorAvatarSchema,
  listReferenceSchema,
  reserveAuthorAvatarSchema,
} from "./reference-schema.js";
import { createReferenceSchema, updateReferenceSchema } from "./reference-write-schema.js";

export interface ReferenceController {
  readonly list: RequestHandler;
  readonly create: RequestHandler;
  readonly update: RequestHandler;
  readonly archive: RequestHandler;
  readonly reserveAuthorAvatar: RequestHandler;
  readonly completeAuthorAvatar: RequestHandler;
  readonly deleteAuthorAvatar: RequestHandler;
}

export function createReferenceController(
  service: ReferenceService,
  authorAvatarService: AuthorAvatarService = unavailableAuthorAvatarService,
): ReferenceController {
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

    archive: validateRequest(archiveReferenceSchema, async (input, _request, response) => {
      const record = await service.archive(input.params.resource, input.params.id);

      response.set("cache-control", "no-store");
      response.status(200).json(presentReference(record));
    }),

    reserveAuthorAvatar: validateRequest(
      reserveAuthorAvatarSchema,
      async (input, _request, response) => {
        const reservation = await authorAvatarService.reserve(input.params.id, input.body);
        response.set("cache-control", "no-store");
        response.status(201).json({ data: reservation });
      },
    ),

    completeAuthorAvatar: validateRequest(
      completeAuthorAvatarSchema,
      async (input, _request, response) => {
        const avatar = await authorAvatarService.complete(input.params.id, input.body.objectPath);
        response.set("cache-control", "no-store");
        response.status(200).json({ data: avatar });
      },
    ),

    deleteAuthorAvatar: validateRequest(
      deleteAuthorAvatarSchema,
      async (input, _request, response) => {
        await authorAvatarService.remove(input.params.id);
        response.set("cache-control", "no-store");
        response.status(204).send();
      },
    ),
  });
}

const unavailableAuthorAvatarService: AuthorAvatarService = {
  async reserve() {
    throw new Error("Author avatar service is unavailable");
  },
  async complete() {
    throw new Error("Author avatar service is unavailable");
  },
  async remove() {
    throw new Error("Author avatar service is unavailable");
  },
  async createReadUrl() {
    throw new Error("Author avatar service is unavailable");
  },
};
