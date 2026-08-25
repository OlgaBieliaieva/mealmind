import { createClient } from "@supabase/supabase-js";

import type { AuthorAvatarStorage } from "../domain/author-avatar-storage.js";

const READ_URL_TTL_SECONDS = 300;
const AUTHOR_AVATAR_MAX_BYTES = 3 * 1024 * 1024;
const AUTHOR_AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function createSupabaseAuthorAvatarStorage(options: {
  readonly url: string;
  readonly secretKey: string;
  readonly bucket: string;
}): AuthorAvatarStorage {
  const client = createClient(options.url, options.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const bucket = client.storage.from(options.bucket);
  let bucketReadiness: Promise<void> | undefined;

  function ensureBucket(): Promise<void> {
    bucketReadiness ??= (async () => {
      const existing = await client.storage.getBucket(options.bucket);
      if (existing.error === null) return;
      const created = await client.storage.createBucket(options.bucket, {
        public: false,
        fileSizeLimit: AUTHOR_AVATAR_MAX_BYTES,
        allowedMimeTypes: AUTHOR_AVATAR_MIME_TYPES,
      });
      if (created.error === null) return;
      const afterRace = await client.storage.getBucket(options.bucket);
      if (afterRace.error !== null) {
        throw new Error("Unable to initialize private author avatar bucket", {
          cause: created.error,
        });
      }
    })();
    return bucketReadiness;
  }

  const storage: AuthorAvatarStorage = {
    async createUploadUrl(objectPath) {
      await ensureBucket();
      const { data, error } = await bucket.createSignedUploadUrl(objectPath);
      if (error !== null)
        throw new Error("Unable to reserve author avatar upload", { cause: error });
      return Object.freeze({ uploadUrl: data.signedUrl, token: data.token });
    },
    async createReadUrl(objectPath) {
      const { data, error } = await bucket.createSignedUrl(objectPath, READ_URL_TTL_SECONDS);
      if (error !== null)
        throw new Error("Unable to create author avatar read URL", { cause: error });
      return data.signedUrl;
    },
    async read(objectPath) {
      const { data, error } = await bucket.download(objectPath);
      if (error !== null) throw new Error("Unable to read author avatar", { cause: error });
      return Buffer.from(await data.arrayBuffer());
    },
    async write(objectPath, data, mimeType) {
      const { error } = await bucket.upload(objectPath, data, {
        contentType: mimeType,
        cacheControl: "31536000",
        upsert: true,
      });
      if (error !== null) throw new Error("Unable to write author avatar", { cause: error });
    },
    async remove(objectPaths) {
      if (objectPaths.length === 0) return;
      const { error } = await bucket.remove([...objectPaths]);
      if (error !== null) throw new Error("Unable to remove author avatar", { cause: error });
    },
  };
  return Object.freeze(storage);
}
