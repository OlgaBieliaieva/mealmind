import { createHash, randomUUID } from "node:crypto";

import sharp from "sharp";

import type { ProductMediaStorage } from "../../product/domain/product-media-storage.js";
import { thumbnailObjectPath } from "../../product/domain/product-media-storage.js";
import { ProductImportReviewInvariantError } from "../application/product-import-review-errors.js";

const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const MAX_INPUT_PIXELS = 40_000_000;
const MAX_IMAGE_EDGE = 1_350;

export interface PreparedZakazProductMedia {
  readonly id: string;
  readonly objectPath: string;
  readonly thumbnailPath: string;
  readonly byteSize: number;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly checksumSha256: string;
  readonly sourceUrl: string;
}

export async function prepareZakazProductMedia(
  candidateId: string,
  sourceUrl: string | null,
  storage: ProductMediaStorage,
  fetchImplementation: typeof fetch = fetch,
): Promise<PreparedZakazProductMedia | null> {
  if (sourceUrl === null) return null;
  const url = validatedZakazImageUrl(sourceUrl);
  const response = await fetchImplementation(url, {
    headers: { accept: "image/jpeg,image/png,image/webp" },
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new ProductImportReviewInvariantError(
      "Не вдалося завантажити перевірене зображення товару із Zakaz",
    );
  }
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_SOURCE_BYTES) {
    throw new ProductImportReviewInvariantError("Зображення Zakaz перевищує допустимий розмір");
  }
  const source = Buffer.from(await response.arrayBuffer());
  if (source.byteLength < 1 || source.byteLength > MAX_SOURCE_BYTES) {
    throw new ProductImportReviewInvariantError("Зображення Zakaz має недопустимий розмір");
  }

  try {
    const image = sharp(source, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS }).rotate();
    const original = await image
      .clone()
      .resize({
        width: MAX_IMAGE_EDGE,
        height: MAX_IMAGE_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 88 })
      .toBuffer({ resolveWithObject: true });
    const thumbnail = await image
      .clone()
      .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const id = randomUUID();
    const objectPath = `products/zakaz-imports/${candidateId}/${id}/original.webp`;
    const thumbnailPath = thumbnailObjectPath(objectPath);

    try {
      await storage.write(objectPath, original.data, "image/webp");
      await storage.write(thumbnailPath, thumbnail, "image/webp");
    } catch (error) {
      await storage.remove([objectPath, thumbnailPath]).catch(() => undefined);
      throw error;
    }

    return Object.freeze({
      id,
      objectPath,
      thumbnailPath,
      byteSize: original.data.byteLength,
      widthPx: original.info.width,
      heightPx: original.info.height,
      checksumSha256: createHash("sha256").update(original.data).digest("hex"),
      sourceUrl: url.toString(),
    });
  } catch (error) {
    if (error instanceof ProductImportReviewInvariantError) throw error;
    throw new ProductImportReviewInvariantError("Зображення Zakaz не вдалося безпечно обробити");
  }
}

function validatedZakazImageUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ProductImportReviewInvariantError("URL зображення Zakaz некоректний");
  }
  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    (hostname !== "zakaz.ua" && !hostname.endsWith(".zakaz.ua")) ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new ProductImportReviewInvariantError(
      "Зображення можна завантажувати лише з перевіреного HTTPS-домену Zakaz",
    );
  }
  return url;
}
