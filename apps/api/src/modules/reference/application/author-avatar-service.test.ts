import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import type { DatabaseClient } from "@mealmind/db";

import type { AuthorAvatarStorage } from "../domain/author-avatar-storage.js";
import { createAuthorAvatarService } from "./author-avatar-service.js";
import { AuthorAvatarProcessingError } from "./reference-errors.js";

const authorId = "24b79ffc-e6af-440c-ae38-8cd37c22be1c";

async function dependencies() {
  const update = vi.fn(async () => ({}));
  const database = {
    author: {
      count: vi.fn(async () => 1),
      findUnique: vi.fn(async () => ({ avatarObjectPath: "authors/old/avatar.webp" })),
      update,
    },
  } as unknown as DatabaseClient;
  const source = await sharp({
    create: { width: 16, height: 12, channels: 3, background: "#38a169" },
  })
    .png()
    .toBuffer();
  const storage: AuthorAvatarStorage = {
    createUploadUrl: vi.fn(async () => ({ uploadUrl: "https://upload.test", token: "token" })),
    createReadUrl: vi.fn(async () => "https://read.test/avatar.webp"),
    read: vi.fn(async () => source),
    write: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  };
  return { database, storage, update };
}

describe("author avatar service", () => {
  it("reserves only a server-owned author path", async () => {
    const { database, storage } = await dependencies();
    const result = await createAuthorAvatarService(database, storage).reserve(authorId, {
      mimeType: "image/png",
      byteSize: 100,
    });

    expect(result.objectPath).toMatch(
      new RegExp(`^authors/${authorId}/[0-9a-f-]{36}/upload\\.png$`, "u"),
    );
    expect(storage.createUploadUrl).toHaveBeenCalledWith(result.objectPath);
  });

  it("normalizes, stores and replaces an uploaded avatar", async () => {
    const { database, storage, update } = await dependencies();
    const uploadPath = `authors/${authorId}/11111111-1111-4111-8111-111111111111/upload.png`;
    const result = await createAuthorAvatarService(database, storage).complete(
      authorId,
      uploadPath,
    );

    expect(storage.write).toHaveBeenCalledWith(
      uploadPath.replace("upload.png", "avatar.webp"),
      expect.any(Buffer),
      "image/webp",
    );
    expect(update).toHaveBeenCalledWith({
      where: { id: authorId },
      data: { avatarObjectPath: uploadPath.replace("upload.png", "avatar.webp") },
    });
    expect(result.avatarUrl).toBe("https://read.test/avatar.webp");
  });

  it("rejects an object path owned by another author", async () => {
    const { database, storage } = await dependencies();
    await expect(
      createAuthorAvatarService(database, storage).complete(
        authorId,
        "authors/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/id/upload.png",
      ),
    ).rejects.toBeInstanceOf(AuthorAvatarProcessingError);
  });
});
