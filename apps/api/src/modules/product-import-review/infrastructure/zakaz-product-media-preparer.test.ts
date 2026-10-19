import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import type { ProductMediaStorage } from "../../product/domain/product-media-storage.js";
import { ProductImportReviewInvariantError } from "../application/product-import-review-errors.js";
import { prepareZakazProductMedia } from "./zakaz-product-media-preparer.js";

describe("Zakaz product media preparer", () => {
  it("downloads a trusted image and stores bounded webp variants", async () => {
    const source = await sharp({
      create: {
        width: 1_800,
        height: 1_200,
        channels: 3,
        background: "#ffffff",
      },
    })
      .jpeg()
      .toBuffer();
    const storage = storageFixture();
    const fetchImplementation = vi.fn(
      async () =>
        new Response(source, {
          status: 200,
          headers: { "content-type": "image/jpeg", "content-length": String(source.byteLength) },
        }),
    );

    const result = await prepareZakazProductMedia(
      "33333333-3333-4333-8333-333333333333",
      "https://img2.zakaz.ua/upload/product.jpg",
      storage,
      fetchImplementation as typeof fetch,
    );

    expect(result).toMatchObject({ widthPx: 1_350, heightPx: 900 });
    expect(storage.write).toHaveBeenCalledTimes(2);
    expect(storage.write).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/original\.webp$/),
      expect.any(Buffer),
      "image/webp",
    );
    expect(storage.write).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/thumbnail\.webp$/),
      expect.any(Buffer),
      "image/webp",
    );
  });

  it("rejects an untrusted image host before issuing a request", async () => {
    const fetchImplementation = vi.fn();

    await expect(
      prepareZakazProductMedia(
        "33333333-3333-4333-8333-333333333333",
        "https://example.com/product.jpg",
        storageFixture(),
        fetchImplementation as typeof fetch,
      ),
    ).rejects.toBeInstanceOf(ProductImportReviewInvariantError);
    expect(fetchImplementation).not.toHaveBeenCalled();
  });
});

function storageFixture(): ProductMediaStorage {
  return {
    createUploadUrl: vi.fn(async () => ({ uploadUrl: "", token: "" })),
    createReadUrl: vi.fn(async () => ""),
    read: vi.fn(async () => Buffer.alloc(0)),
    write: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  };
}
