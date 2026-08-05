import { createClient } from "@supabase/supabase-js";

import type { ProductMediaStorage } from "../domain/product-media-storage.js";

const PRODUCT_MEDIA_READ_URL_TTL_SECONDS = 300;

export interface SupabaseProductMediaStorageOptions {
  readonly url: string;
  readonly secretKey: string;
  readonly bucket: string;
}

export function createSupabaseProductMediaStorage(
  options: SupabaseProductMediaStorageOptions,
): ProductMediaStorage {
  const client = createClient(options.url, options.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const bucket = client.storage.from(options.bucket);

  const storage: ProductMediaStorage = {
    async createUploadUrl(objectPath) {
      const { data, error } = await bucket.createSignedUploadUrl(objectPath);
      if (error !== null)
        throw new Error("Unable to reserve product media upload", { cause: error });
      return Object.freeze({ uploadUrl: data.signedUrl, token: data.token });
    },

    async createReadUrl(objectPath) {
      const { data, error } = await bucket.createSignedUrl(
        objectPath,
        PRODUCT_MEDIA_READ_URL_TTL_SECONDS,
      );
      if (error !== null)
        throw new Error("Unable to create product media read URL", { cause: error });
      return data.signedUrl;
    },

    async read(objectPath) {
      const { data, error } = await bucket.download(objectPath);
      if (error !== null) throw new Error("Unable to read product media object", { cause: error });
      return Buffer.from(await data.arrayBuffer());
    },

    async write(objectPath, data, mimeType) {
      const { error } = await bucket.upload(objectPath, data, {
        contentType: mimeType,
        cacheControl: "31536000",
        upsert: true,
      });
      if (error !== null) throw new Error("Unable to write product media object", { cause: error });
    },

    async remove(objectPaths) {
      if (objectPaths.length === 0) return;
      const { error } = await bucket.remove([...objectPaths]);
      if (error !== null)
        throw new Error("Unable to remove product media objects", { cause: error });
    },
  };

  return Object.freeze(storage);
}
