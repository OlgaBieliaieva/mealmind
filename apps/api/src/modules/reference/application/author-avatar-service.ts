import { randomUUID } from "node:crypto";

import type { DatabaseClient } from "@mealmind/db";
import sharp from "sharp";

import { AuthorAvatarProcessingError, ReferenceNotFoundError } from "./reference-errors.js";
import type { AuthorAvatarStorage } from "../domain/author-avatar-storage.js";

export const AUTHOR_AVATAR_MAX_BYTES = 3 * 1024 * 1024;
export const AUTHOR_AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export interface AuthorAvatarService {
  reserve(
    authorId: string,
    input: { readonly mimeType: string; readonly byteSize: number },
  ): Promise<{
    readonly objectPath: string;
    readonly uploadUrl: string;
    readonly token: string;
  }>;
  complete(authorId: string, objectPath: string): Promise<{ readonly avatarUrl: string }>;
  remove(authorId: string): Promise<void>;
  createReadUrl(objectPath: string): Promise<string>;
}

export function createAuthorAvatarService(
  database: DatabaseClient,
  storage: AuthorAvatarStorage,
): AuthorAvatarService {
  const service: AuthorAvatarService = {
    async reserve(authorId, input) {
      if (
        !AUTHOR_AVATAR_MIME_TYPES.includes(input.mimeType as never) ||
        input.byteSize < 1 ||
        input.byteSize > AUTHOR_AVATAR_MAX_BYTES
      ) {
        throw new AuthorAvatarProcessingError("Invalid author avatar file");
      }
      if ((await database.author.count({ where: { id: authorId, archivedAt: null } })) === 0) {
        throw new ReferenceNotFoundError("authors");
      }
      const extension = input.mimeType === "image/jpeg" ? "jpg" : input.mimeType.split("/")[1];
      const objectPath = `authors/${authorId}/${randomUUID()}/upload.${extension}`;
      const reservation = await storage.createUploadUrl(objectPath);
      return Object.freeze({ objectPath, ...reservation });
    },

    async complete(authorId, objectPath) {
      assertOwnedUploadPath(authorId, objectPath);
      const author = await database.author.findUnique({
        where: { id: authorId },
        select: { avatarObjectPath: true },
      });
      if (author === null) throw new ReferenceNotFoundError("authors");
      const finalPath = objectPath.replace(/\/upload\.(?:jpg|png|webp)$/u, "/avatar.webp");
      try {
        const source = await storage.read(objectPath);
        if (source.byteLength < 1 || source.byteLength > AUTHOR_AVATAR_MAX_BYTES) {
          throw new AuthorAvatarProcessingError("Author avatar has an invalid size");
        }
        const image = sharp(source, { failOn: "error", limitInputPixels: 20_000_000 }).rotate();
        const metadata = await image.metadata();
        if (!metadata.format || !new Set(["jpeg", "png", "webp"]).has(metadata.format)) {
          throw new AuthorAvatarProcessingError("Unsupported author avatar format");
        }
        const normalized = await image
          .resize({ width: 512, height: 512, fit: "cover", position: "attention" })
          .webp({ quality: 86 })
          .toBuffer();
        await storage.write(finalPath, normalized, "image/webp");
        const avatarUrl = await storage.createReadUrl(finalPath);
        await database.author.update({
          where: { id: authorId },
          data: { avatarObjectPath: finalPath },
        });
        await Promise.allSettled([
          storage.remove([objectPath]),
          author.avatarObjectPath && author.avatarObjectPath !== finalPath
            ? storage.remove([author.avatarObjectPath])
            : Promise.resolve(),
        ]);
        return Object.freeze({ avatarUrl });
      } catch (error) {
        await Promise.allSettled([storage.remove([objectPath, finalPath])]);
        if (error instanceof AuthorAvatarProcessingError) throw error;
        throw new AuthorAvatarProcessingError("Author avatar processing failed", error);
      }
    },

    async remove(authorId) {
      const author = await database.author.findUnique({
        where: { id: authorId },
        select: { avatarObjectPath: true },
      });
      if (author === null) throw new ReferenceNotFoundError("authors");
      await database.author.update({ where: { id: authorId }, data: { avatarObjectPath: null } });
      if (author.avatarObjectPath) await storage.remove([author.avatarObjectPath]);
    },

    createReadUrl: (objectPath) => storage.createReadUrl(objectPath),
  };
  return Object.freeze(service);
}

function assertOwnedUploadPath(authorId: string, objectPath: string): void {
  const escaped = authorId.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  if (
    !new RegExp(`^authors/${escaped}/[0-9a-f-]{36}/upload\\.(?:jpg|png|webp)$`, "u").test(
      objectPath,
    )
  ) {
    throw new AuthorAvatarProcessingError("Invalid author avatar upload path");
  }
}
