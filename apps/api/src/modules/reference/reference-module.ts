import type { DatabaseClient } from "@mealmind/db";
import type { Router } from "express";

import type { AuthenticationService } from "../../application/authentication/authentication-service.js";
import { createReferenceService } from "./application/reference-service.js";
import { createAuthorAvatarService } from "./application/author-avatar-service.js";
import { createPrismaReferenceRepository } from "./infrastructure/prisma-reference-repository.js";
import { createSupabaseAuthorAvatarStorage } from "./infrastructure/supabase-author-avatar-storage.js";
import { createReferenceController } from "./transport/reference-controller.js";
import { createReferenceRouter } from "./transport/reference-router.js";

export interface ReferenceModule {
  readonly router: Router;
}

export const AUTHOR_AVATAR_BUCKET = "author-avatars";

export function createReferenceModule(
  database: DatabaseClient,
  authenticationService: AuthenticationService,
  storageConfig: { readonly url: string; readonly secretKey: string },
): ReferenceModule {
  const repository = createPrismaReferenceRepository(database);
  const storage = createSupabaseAuthorAvatarStorage({
    ...storageConfig,
    bucket: AUTHOR_AVATAR_BUCKET,
  });
  const service = createReferenceService(repository, storage);
  const controller = createReferenceController(
    service,
    createAuthorAvatarService(database, storage),
  );

  return Object.freeze({
    router: createReferenceRouter(controller, authenticationService),
  });
}
