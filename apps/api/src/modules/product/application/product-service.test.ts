import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductMediaStorage } from "../domain/product-media-storage.js";
import type {
  ProductDetails,
  ProductMediaRecord,
  ProductRepository,
} from "../domain/product-repository.js";
import {
  ProductInvariantError,
  ProductMediaProcessingError,
  ProductVerificationBlockedError,
} from "./product-errors.js";
import { createProductService } from "./product-service.js";

const productId = "24b79ffc-e6af-440c-ae38-8cd37c22be1c";
const baseProductId = "34b79ffc-e6af-440c-ae38-8cd37c22be1c";
const categoryId = "44b79ffc-e6af-440c-ae38-8cd37c22be1c";
const unitId = "54b79ffc-e6af-440c-ae38-8cd37c22be1c";
const brandId = "64b79ffc-e6af-440c-ae38-8cd37c22be1c";
const nutrientId = "74b79ffc-e6af-440c-ae38-8cd37c22be1c";
const secondNutrientId = "75b79ffc-e6af-440c-ae38-8cd37c22be1c";
const mediaId = "84b79ffc-e6af-440c-ae38-8cd37c22be1c";
const actorUserId = "94b79ffc-e6af-440c-ae38-8cd37c22be1c";

function product(overrides: Partial<ProductDetails> = {}): ProductDetails {
  return {
    id: productId,
    type: "GENERIC",
    nameEn: "Apple",
    nameUa: "Яблуко",
    gtin: null,
    categoryId,
    categoryName: "Фрукти",
    brandId: null,
    brandName: null,
    defaultMeasurementUnitId: unitId,
    defaultMeasurementUnitSymbol: "g",
    baseProductId: null,
    baseProductName: null,
    sourceProvider: null,
    sourceDataset: null,
    foodState: "RAW",
    foodCharacteristics: [],
    ediblePortionPercent: "95",
    status: "DRAFT",
    verificationStatus: "UNVERIFIED",
    verifiedByUserId: null,
    verifiedAt: null,
    notes: null,
    archivedAt: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    nutrients: [
      {
        nutrientId,
        nutrientCode: "protein",
        nutrientName: "Білки",
        unit: "G",
        valuePer100g: "0.3",
        valueType: "ANALYTICAL",
        origin: "PRODUCT",
      },
    ],
    ownNutrients: [
      {
        nutrientId,
        nutrientCode: "protein",
        nutrientName: "Білки",
        unit: "G",
        valuePer100g: "0.3",
        valueType: "ANALYTICAL",
        origin: "PRODUCT",
      },
    ],
    portions: [],
    packages: [],
    media: [],
    ...overrides,
  };
}

function media(overrides: Partial<ProductMediaRecord> = {}): ProductMediaRecord {
  return {
    id: mediaId,
    productId,
    kind: "PRODUCT",
    status: "PENDING",
    storageObjectPath: `products/${productId}/${mediaId}/original.png`,
    mimeType: "image/png",
    byteSize: null,
    widthPx: null,
    heightPx: null,
    checksumSha256: null,
    altTextUa: "Яблуко",
    altTextEn: null,
    isPrimary: true,
    sortOrder: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function repository(): ProductRepository {
  return {
    list: vi.fn(async () => ({ items: [], page: 1, pageSize: 20, total: 0 })),
    searchActive: vi.fn(async () => ({ items: [], page: 1, pageSize: 20, total: 0 })),
    findById: vi.fn(async () => product()),
    findNutrientCodes: vi.fn(async () => new Map([[nutrientId, "protein"]])),
    create: vi.fn(async (data) =>
      product({
        type: data.type,
        nameEn: data.nameEn,
        brandId: data.brandId ?? null,
        baseProductId: data.baseProductId ?? null,
      }),
    ),
    update: vi.fn(async () => product()),
    updateStatus: vi.fn(async (_id, status) => product({ status })),
    createPendingMedia: vi.fn(async (data) =>
      media({
        id: data.id,
        storageObjectPath: data.storageObjectPath,
        mimeType: data.mimeType,
        byteSize: String(data.byteSize),
      }),
    ),
    findMedia: vi.fn(async () => media()),
    activateMedia: vi.fn(async (_id, data) =>
      media({
        status: "ACTIVE",
        widthPx: data.widthPx,
        heightPx: data.heightPx,
        checksumSha256: data.checksumSha256,
      }),
    ),
    markMediaFailed: vi.fn(async () => undefined),
    archiveMedia: vi.fn(async () => undefined),
    listStaleMedia: vi.fn(async () => []),
  };
}

function storage(): ProductMediaStorage {
  return {
    createUploadUrl: vi.fn(async () => ({
      uploadUrl: "https://storage.example/upload",
      token: "signed-upload-token",
    })),
    createReadUrl: vi.fn(async (path) => `https://storage.example/${path}`),
    read: vi.fn(async () => Buffer.alloc(0)),
    write: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  };
}

describe("product service", () => {
  let productRepository: ProductRepository;
  let mediaStorage: ProductMediaStorage;

  beforeEach(() => {
    productRepository = repository();
    mediaStorage = storage();
  });

  it("delegates authenticated product selector search to the active-product repository query", async () => {
    vi.mocked(productRepository.searchActive).mockResolvedValue({
      items: [
        {
          id: productId,
          name: "Яблуко",
          type: "GENERIC",
          categoryName: "Фрукти",
          brandName: null,
          foodState: "RAW",
          foodCharacteristics: [],
        },
      ],
      page: 2,
      pageSize: 10,
      total: 21,
    });

    const service = createProductService(productRepository, mediaStorage);

    const result = await service.search({
      search: "яб",
      page: 2,
      pageSize: 10,
    });

    expect(productRepository.searchActive).toHaveBeenCalledWith({
      search: "яб",
      page: 2,
      pageSize: 10,
    });

    expect(result).toEqual({
      items: [
        {
          id: productId,
          name: "Яблуко",
          type: "GENERIC",
          categoryName: "Фрукти",
          brandName: null,
          foodState: "RAW",
          foodCharacteristics: [],
        },
      ],
      page: 2,
      pageSize: 10,
      total: 21,
    });
  });

  it("rejects brand fields on a generic product", async () => {
    const service = createProductService(productRepository, mediaStorage);

    await expect(
      service.create({
        type: "GENERIC",
        nameEn: "Apple",
        categoryId,
        defaultMeasurementUnitId: unitId,
        brandId,
        status: "DRAFT",
      }, actorUserId),
    ).rejects.toBeInstanceOf(ProductInvariantError);

    expect(productRepository.create).not.toHaveBeenCalled();
  });

  it("does not persist inherited nutrients in a branded variant", async () => {
    vi.mocked(productRepository.findById).mockResolvedValue(
      product({ id: baseProductId, status: "ACTIVE" }),
    );
    const service = createProductService(productRepository, mediaStorage);

    await service.create({
      type: "BRANDED",
      nameEn: "Brand Apple",
      brandId,
      gtin: "00000012345678",
      baseProductId,
      status: "DRAFT",
    }, actorUserId);

    expect(productRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "BRANDED",
        categoryId,
        defaultMeasurementUnitId: unitId,
        foodState: "RAW",
        ediblePortionPercent: "95",
        nutrients: [],
        source: expect.objectContaining({
          provider: "MEALMIND_ADMIN",
          dataset: "ADMIN_CATALOG",
        }),
      }),
    );
  });

  it("persists only label nutrients that override the effective base profile", async () => {
    vi.mocked(productRepository.findById).mockResolvedValue(
      product({
        id: baseProductId,
        status: "ACTIVE",
        nutrients: [
          {
            nutrientId,
            nutrientCode: "protein",
            nutrientName: "Білки",
            unit: "G",
            valuePer100g: "0.3",
            valueType: "ANALYTICAL",
            origin: "PRODUCT",
          },
          {
            nutrientId: secondNutrientId,
            nutrientCode: "total_fat",
            nutrientName: "Жири",
            unit: "G",
            valuePer100g: "0.2",
            valueType: "ANALYTICAL",
            origin: "PRODUCT",
          },
        ],
      }),
    );
    const service = createProductService(productRepository, mediaStorage);

    await service.create({
      type: "BRANDED",
      nameEn: "Brand Apple",
      brandId,
      baseProductId,
      status: "DRAFT",
      nutrients: [{ nutrientId, valuePer100g: "1.4", valueType: "UNKNOWN" }],
    }, actorUserId);

    expect(productRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nutrients: [{ nutrientId, valuePer100g: "1.4", valueType: "LABEL" }],
      }),
    );
  });

  it("creates a branded product without a base or GTIN when classification is explicit", async () => {
    const service = createProductService(productRepository, mediaStorage);

    await service.create({
      type: "BRANDED",
      nameEn: "Brand snack",
      brandId,
      categoryId,
      defaultMeasurementUnitId: unitId,
      status: "DRAFT",
      nutrients: [{ nutrientId, valuePer100g: "8", valueType: "UNKNOWN" }],
    }, actorUserId);

    expect(productRepository.findById).not.toHaveBeenCalled();
    const created = vi.mocked(productRepository.create).mock.calls[0]?.[0];
    expect(created).not.toHaveProperty("baseProductId");
    expect(created).not.toHaveProperty("gtin");
    expect(created?.nutrients).toEqual([{ nutrientId, valuePer100g: "8", valueType: "LABEL" }]);
  });

  it("blocks verification while required catalog data is missing", async () => {
    const service = createProductService(productRepository, mediaStorage);

    await expect(
      service.update(productId, { verificationStatus: "VERIFIED" }, actorUserId),
    ).rejects.toBeInstanceOf(ProductVerificationBlockedError);
    expect(productRepository.update).not.toHaveBeenCalled();
  });

  it("records the verifier when the product satisfies the verification contract", async () => {
    vi.mocked(productRepository.findById).mockResolvedValue(
      product({
        nutrients: [
          {
            nutrientId: "energy-id",
            nutrientCode: "energy_kcal",
            nutrientName: "Енергія",
            unit: "KCAL",
            valuePer100g: "52",
            valueType: "ANALYTICAL",
            origin: "PRODUCT",
          },
          {
            nutrientId: "protein-id",
            nutrientCode: "protein",
            nutrientName: "Білки",
            unit: "G",
            valuePer100g: "0.3",
            valueType: "ANALYTICAL",
            origin: "PRODUCT",
          },
          {
            nutrientId: "fat-id",
            nutrientCode: "total_fat",
            nutrientName: "Жири",
            unit: "G",
            valuePer100g: "0.2",
            valueType: "ANALYTICAL",
            origin: "PRODUCT",
          },
          {
            nutrientId: "carbohydrate-id",
            nutrientCode: "carbohydrate",
            nutrientName: "Вуглеводи",
            unit: "G",
            valuePer100g: "14",
            valueType: "ANALYTICAL",
            origin: "PRODUCT",
          },
        ],
      }),
    );
    const service = createProductService(productRepository, mediaStorage);

    await service.update(productId, { verificationStatus: "VERIFIED" }, actorUserId);

    expect(productRepository.update).toHaveBeenCalledWith(
      productId,
      expect.objectContaining({
        verificationStatus: "VERIFIED",
        verifiedByUserId: actorUserId,
        verifiedAt: expect.any(Date),
      }),
    );
  });

  it("returns a materially edited verified product to unverified", async () => {
    vi.mocked(productRepository.findById).mockResolvedValue(
      product({
        verificationStatus: "VERIFIED",
        verifiedByUserId: actorUserId,
        verifiedAt: "2026-10-19T10:00:00.000Z",
      }),
    );
    const service = createProductService(productRepository, mediaStorage);

    await service.update(productId, { nameUa: "Нове яблуко" }, actorUserId);

    expect(productRepository.update).toHaveBeenCalledWith(productId, {
      nameUa: "Нове яблуко",
      verificationStatus: "UNVERIFIED",
      verifiedByUserId: null,
      verifiedAt: null,
    });
  });

  it("does not allow an active product to return directly to draft", async () => {
    vi.mocked(productRepository.findById).mockResolvedValue(product({ status: "ACTIVE" }));
    const service = createProductService(productRepository, mediaStorage);

    await expect(service.changeStatus(productId, "DRAFT")).rejects.toBeInstanceOf(
      ProductInvariantError,
    );
    expect(productRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("processes a reserved image synchronously and creates its thumbnail", async () => {
    const original = await sharp({
      create: { width: 640, height: 480, channels: 3, background: "#87a96b" },
    })
      .png()
      .toBuffer();
    vi.mocked(productRepository.findMedia).mockResolvedValue(
      media({ byteSize: String(original.byteLength) }),
    );
    vi.mocked(mediaStorage.read).mockResolvedValue(original);
    const service = createProductService(productRepository, mediaStorage);

    const result = await service.completeMedia(productId, mediaId);

    expect(result.status).toBe("ACTIVE");
    expect(mediaStorage.write).toHaveBeenCalledWith(
      expect.stringContaining(".thumbnail.webp"),
      expect.any(Buffer),
      "image/webp",
    );
    expect(productRepository.activateMedia).toHaveBeenCalledWith(
      mediaId,
      expect.objectContaining({ widthPx: 640, heightPx: 480 }),
    );
  });

  it("removes uploaded objects and records failure when image validation fails", async () => {
    const invalid = Buffer.from("not-an-image");
    vi.mocked(productRepository.findMedia).mockResolvedValue(
      media({ byteSize: String(invalid.byteLength) }),
    );
    vi.mocked(mediaStorage.read).mockResolvedValue(invalid);
    const service = createProductService(productRepository, mediaStorage);

    await expect(service.completeMedia(productId, mediaId)).rejects.toBeInstanceOf(
      ProductMediaProcessingError,
    );
    expect(mediaStorage.remove).toHaveBeenCalledWith([
      expect.stringContaining("original.png"),
      expect.stringContaining(".thumbnail.webp"),
    ]);
    expect(productRepository.markMediaFailed).toHaveBeenCalledWith(mediaId);
  });

  it("reports orphan cleanup candidates without mutating storage in dry-run mode", async () => {
    vi.mocked(productRepository.listStaleMedia).mockResolvedValue([media()]);
    const service = createProductService(productRepository, mediaStorage);

    const result = await service.cleanupOrphanedMedia({
      olderThan: new Date("2026-08-02T00:00:00.000Z"),
      dryRun: true,
    });

    expect(result).toEqual({ scanned: 1, removed: 0, failed: 0, dryRun: true });
    expect(mediaStorage.remove).not.toHaveBeenCalled();
    expect(productRepository.archiveMedia).not.toHaveBeenCalled();
  });

  it("marks media failed before object deletion and archives only after storage succeeds", async () => {
    vi.mocked(productRepository.findMedia).mockResolvedValue(media({ status: "ACTIVE" }));
    const service = createProductService(productRepository, mediaStorage);

    await service.deleteMedia(productId, mediaId);

    expect(vi.mocked(productRepository.markMediaFailed).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(mediaStorage.remove).mock.invocationCallOrder[0] as number,
    );
    expect(vi.mocked(mediaStorage.remove).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(productRepository.archiveMedia).mock.invocationCallOrder[0] as number,
    );
  });
});
