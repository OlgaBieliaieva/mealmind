import { createHash, randomUUID } from "node:crypto";

import sharp from "sharp";

import { thumbnailObjectPath, type ProductMediaStorage } from "../domain/product-media-storage.js";
import type {
  ProductDetails,
  ProductListQuery,
  ProductMediaKind,
  ProductMediaRecord,
  ProductPage,
  ProductRepository,
  ProductStatus,
  ProductSummary,
  ProductUpdate,
  ProductWrite,
} from "../domain/product-repository.js";
import {
  ProductInvariantError,
  ProductMediaNotFoundError,
  ProductMediaProcessingError,
  ProductNotFoundError,
} from "./product-errors.js";

export const PRODUCT_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_MEDIA_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const READ_URL_TTL_SECONDS = 300;

export interface CreateProductInput extends Omit<
  ProductWrite,
  "categoryId" | "defaultMeasurementUnitId" | "foodState" | "nutrients" | "portions"
> {
  readonly categoryId?: string | undefined;
  readonly defaultMeasurementUnitId?: string | undefined;
  readonly foodState?: ProductWrite["foodState"] | undefined;
  readonly nutrients?: ProductWrite["nutrients"] | undefined;
  readonly portions?: ProductWrite["portions"] | undefined;
}

export interface ReserveProductMediaInput {
  readonly kind: ProductMediaKind;
  readonly mimeType: (typeof PRODUCT_MEDIA_ALLOWED_MIME_TYPES)[number];
  readonly byteSize: number;
  readonly altTextUa?: string | null | undefined;
  readonly altTextEn?: string | null | undefined;
  readonly isPrimary: boolean;
}

export interface ProductMediaView extends ProductMediaRecord {
  readonly url: string | null;
  readonly thumbnailUrl: string | null;
}

export interface ProductDetailsView extends Omit<ProductDetails, "media"> {
  readonly media: readonly ProductMediaView[];
}

export interface ProductSummaryView extends Omit<ProductSummary, "primaryMedia"> {
  readonly primaryMedia: ProductMediaView | null;
}

export interface ProductPageView extends Omit<ProductPage, "items"> {
  readonly items: readonly ProductSummaryView[];
}

export interface ProductMediaCleanupResult {
  readonly scanned: number;
  readonly removed: number;
  readonly failed: number;
  readonly dryRun: boolean;
}

export interface ProductService {
  list(query: ProductListQuery): Promise<ProductPageView>;
  get(id: string): Promise<ProductDetailsView>;
  create(input: CreateProductInput): Promise<ProductDetailsView>;
  update(id: string, input: ProductUpdate): Promise<ProductDetailsView>;
  changeStatus(id: string, status: ProductStatus): Promise<ProductDetailsView>;
  reserveMedia(
    productId: string,
    input: ReserveProductMediaInput,
    actorUserId: string,
  ): Promise<{
    readonly media: ProductMediaRecord;
    readonly uploadUrl: string;
    readonly token: string;
  }>;
  completeMedia(productId: string, mediaId: string): Promise<ProductMediaView>;
  deleteMedia(productId: string, mediaId: string): Promise<void>;
  cleanupOrphanedMedia(options: {
    readonly olderThan: Date;
    readonly dryRun: boolean;
  }): Promise<ProductMediaCleanupResult>;
}

export function createProductService(
  repository: ProductRepository,
  storage: ProductMediaStorage,
): ProductService {
  const service: ProductService = {
    async list(query) {
      const page = await repository.list(query);
      const items = await Promise.all(
        page.items.map(async (product): Promise<ProductSummaryView> => ({
          ...product,
          primaryMedia:
            product.primaryMedia === null
              ? null
              : await presentMedia(storage, product.primaryMedia),
        })),
      );

      return Object.freeze({ ...page, items: Object.freeze(items) });
    },

    async get(id) {
      return presentProduct(storage, await requireProduct(repository, id));
    },

    async create(input) {
      const resolved = await resolveCreateInput(repository, input);
      validateProductWrite(resolved);
      return presentProduct(storage, await repository.create(resolved));
    },

    async update(id, input) {
      const existing = await requireProduct(repository, id);
      validateProductUpdate(existing, input);
      const updated = await repository.update(id, input);

      if (updated === null) throw new ProductNotFoundError();
      return presentProduct(storage, updated);
    },

    async changeStatus(id, status) {
      const existing = await requireProduct(repository, id);
      assertStatusTransition(existing.status, status);
      const updated = await repository.updateStatus(id, status);

      if (updated === null) throw new ProductNotFoundError();
      return presentProduct(storage, updated);
    },

    async reserveMedia(productId, input, actorUserId) {
      await requireProduct(repository, productId);
      assertMediaInput(input);

      const mediaId = randomUUID();
      const objectPath = productMediaObjectPath(productId, mediaId, input.mimeType);
      const { uploadUrl, token } = await storage.createUploadUrl(objectPath);
      const media = await repository.createPendingMedia({
        id: mediaId,
        productId,
        kind: input.kind,
        storageObjectPath: objectPath,
        mimeType: input.mimeType,
        byteSize: input.byteSize,
        altTextUa: input.altTextUa,
        altTextEn: input.altTextEn,
        isPrimary: input.isPrimary,
        uploadedByUserId: actorUserId,
      });

      return Object.freeze({ media, uploadUrl, token });
    },

    async completeMedia(productId, mediaId) {
      const media = await requireProductMedia(repository, productId, mediaId);

      if (media.status !== "PENDING") {
        throw new ProductInvariantError("Only a pending product photo can be completed");
      }

      const thumbnailPath = thumbnailObjectPath(media.storageObjectPath);

      try {
        const original = await storage.read(media.storageObjectPath);
        validateStoredObject(original, media);
        const image = sharp(original, { failOn: "error", limitInputPixels: 40_000_000 }).rotate();
        const metadata = await image.metadata();
        const detectedMimeType = mimeTypeForFormat(metadata.format);

        if (
          detectedMimeType !== media.mimeType ||
          metadata.width === undefined ||
          metadata.height === undefined
        ) {
          throw new ProductMediaProcessingError(
            "Stored object does not match the declared image type",
          );
        }

        const thumbnail = await image
          .clone()
          .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();

        await storage.write(thumbnailPath, thumbnail, "image/webp");

        const activated = await repository.activateMedia(mediaId, {
          widthPx: metadata.width,
          heightPx: metadata.height,
          checksumSha256: createHash("sha256").update(original).digest("hex"),
        });

        if (activated === null) throw new ProductMediaNotFoundError();
        return presentMedia(storage, activated);
      } catch (error) {
        await Promise.allSettled([
          storage.remove([media.storageObjectPath, thumbnailPath]),
          repository.markMediaFailed(mediaId),
        ]);

        if (error instanceof ProductMediaProcessingError) throw error;
        throw new ProductMediaProcessingError("Product photo processing failed", error);
      }
    },

    async deleteMedia(productId, mediaId) {
      const media = await requireProductMedia(repository, productId, mediaId);
      await repository.markMediaFailed(mediaId);
      await storage.remove([media.storageObjectPath, thumbnailObjectPath(media.storageObjectPath)]);
      await repository.archiveMedia(mediaId);
    },

    async cleanupOrphanedMedia(options) {
      const stale = await repository.listStaleMedia(options.olderThan);
      let removed = 0;
      let failed = 0;

      if (!options.dryRun) {
        for (const media of stale) {
          try {
            await storage.remove([
              media.storageObjectPath,
              thumbnailObjectPath(media.storageObjectPath),
            ]);
            await repository.archiveMedia(media.id);
            removed += 1;
          } catch {
            failed += 1;
          }
        }
      }

      return Object.freeze({
        scanned: stale.length,
        removed,
        failed,
        dryRun: options.dryRun,
      });
    },
  };

  return Object.freeze(service);
}

async function resolveCreateInput(
  repository: ProductRepository,
  input: CreateProductInput,
): Promise<ProductWrite> {
  if (input.type === "GENERIC") {
    if (input.categoryId === undefined || input.defaultMeasurementUnitId === undefined) {
      throw new ProductInvariantError("Generic products require category and measurement unit");
    }

    return {
      ...input,
      categoryId: input.categoryId,
      defaultMeasurementUnitId: input.defaultMeasurementUnitId,
      foodState: input.foodState ?? "UNSPECIFIED",
      nutrients: input.nutrients ?? [],
      portions: input.portions ?? [],
    };
  }

  if (input.baseProductId === null || input.baseProductId === undefined) {
    throw new ProductInvariantError("Branded products require a generic base product");
  }

  const base = await repository.findById(input.baseProductId);

  if (base === null || base.type !== "GENERIC" || base.status === "ARCHIVED") {
    throw new ProductInvariantError(
      "Branded products can inherit only from a non-archived generic product",
    );
  }

  return {
    ...input,
    categoryId: input.categoryId ?? base.categoryId,
    defaultMeasurementUnitId: input.defaultMeasurementUnitId ?? base.defaultMeasurementUnitId,
    foodState: input.foodState ?? base.foodState,
    ediblePortionPercent: input.ediblePortionPercent ?? base.ediblePortionPercent,
    nutrients: input.nutrients ?? base.nutrients,
    portions:
      input.portions ??
      base.portions.map((portion) => ({
        amount: portion.amount,
        gramWeight: portion.gramWeight,
        labelEn: portion.labelEn,
        labelUa: portion.labelUa,
        kind: portion.kind,
        weightType: portion.weightType,
        measurementUnitId: portion.measurementUnitId,
        isDefault: portion.isDefault,
        isActive: portion.isActive,
        sortOrder: portion.sortOrder,
      })),
  };
}

function validateProductWrite(input: ProductWrite): void {
  if (input.type === "GENERIC") {
    if (input.brandId || input.gtin || input.baseProductId) {
      throw new ProductInvariantError("Generic products cannot have brand, GTIN or base product");
    }
    return;
  }

  if (!input.brandId || !input.gtin || !input.baseProductId) {
    throw new ProductInvariantError(
      "Branded products require brand, GTIN and generic base product",
    );
  }
}

function validateProductUpdate(existing: ProductDetails, input: ProductUpdate): void {
  if (existing.type === "GENERIC" && (input.brandId !== undefined || input.gtin !== undefined)) {
    throw new ProductInvariantError("Generic products cannot be converted to branded products");
  }

  if (existing.type === "BRANDED" && (input.brandId === "" || input.gtin === "")) {
    throw new ProductInvariantError("Brand and GTIN cannot be removed from a branded product");
  }
}

function assertStatusTransition(current: ProductStatus, next: ProductStatus): void {
  if (current === next) return;

  const allowed: Readonly<Record<ProductStatus, readonly ProductStatus[]>> = {
    DRAFT: ["ACTIVE", "ARCHIVED"],
    ACTIVE: ["ARCHIVED"],
    ARCHIVED: ["DRAFT"],
  };

  if (!allowed[current].includes(next)) {
    throw new ProductInvariantError(`Product status cannot change from ${current} to ${next}`);
  }
}

function assertMediaInput(input: ReserveProductMediaInput): void {
  if (!PRODUCT_MEDIA_ALLOWED_MIME_TYPES.includes(input.mimeType)) {
    throw new ProductInvariantError("Unsupported product photo MIME type");
  }
  if (input.byteSize < 1 || input.byteSize > PRODUCT_MEDIA_MAX_BYTES) {
    throw new ProductInvariantError("Product photo exceeds the allowed size");
  }
}

function validateStoredObject(data: Buffer, media: ProductMediaRecord): void {
  if (data.byteLength < 1 || data.byteLength > PRODUCT_MEDIA_MAX_BYTES) {
    throw new ProductMediaProcessingError("Stored product photo has an invalid size");
  }

  if (media.byteSize !== null && data.byteLength !== Number(media.byteSize)) {
    throw new ProductMediaProcessingError("Stored product photo size differs from the reservation");
  }
}

function mimeTypeForFormat(format: string | undefined): string | undefined {
  if (format === "jpeg") return "image/jpeg";
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  return undefined;
}

function productMediaObjectPath(productId: string, mediaId: string, mimeType: string): string {
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
  return `products/${productId}/${mediaId}/original.${extension}`;
}

async function requireProduct(repository: ProductRepository, id: string): Promise<ProductDetails> {
  const product = await repository.findById(id);
  if (product === null) throw new ProductNotFoundError();
  return product;
}

async function requireProductMedia(
  repository: ProductRepository,
  productId: string,
  mediaId: string,
): Promise<ProductMediaRecord> {
  const media = await repository.findMedia(mediaId);
  if (media === null || media.productId !== productId) throw new ProductMediaNotFoundError();
  return media;
}

async function presentProduct(
  storage: ProductMediaStorage,
  product: ProductDetails,
): Promise<ProductDetailsView> {
  return Object.freeze({
    ...product,
    media: Object.freeze(
      await Promise.all(product.media.map((media) => presentMedia(storage, media))),
    ),
  });
}

async function presentMedia(
  storage: ProductMediaStorage,
  media: ProductMediaRecord,
): Promise<ProductMediaView> {
  if (media.status !== "ACTIVE") {
    return Object.freeze({ ...media, url: null, thumbnailUrl: null });
  }

  const [url, thumbnailUrl] = await Promise.all([
    storage.createReadUrl(media.storageObjectPath),
    storage.createReadUrl(thumbnailObjectPath(media.storageObjectPath)),
  ]);

  // TTL is intentionally owned by the storage adapter; the constant documents the API contract.
  void READ_URL_TTL_SECONDS;
  return Object.freeze({ ...media, url, thumbnailUrl });
}
