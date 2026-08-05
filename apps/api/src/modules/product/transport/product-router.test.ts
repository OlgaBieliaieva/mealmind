import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticationService } from "../../../application/authentication/authentication-service.js";
import { createNoopLogger } from "../../../application/logging/logger.js";
import { errorHandler } from "../../../http/middleware/error-handler.js";
import { createRequestContextMiddleware } from "../../../http/middleware/request-context.js";
import type { ProductDetailsView, ProductService } from "../application/product-service.js";
import { createProductController } from "./product-controller.js";
import { createProductRouter } from "./product-router.js";

const productId = "24b79ffc-e6af-440c-ae38-8cd37c22be1c";
const categoryId = "34b79ffc-e6af-440c-ae38-8cd37c22be1c";
const unitId = "44b79ffc-e6af-440c-ae38-8cd37c22be1c";

function product(overrides: Partial<ProductDetailsView> = {}): ProductDetailsView {
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
    foodState: "RAW",
    ediblePortionPercent: "95",
    status: "DRAFT",
    verificationStatus: "UNVERIFIED",
    notes: null,
    archivedAt: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    nutrients: [],
    portions: [],
    media: [],
    ...overrides,
  };
}

function productService(): ProductService {
  return {
    list: vi.fn(async () => ({ items: [], page: 1, pageSize: 20, total: 0 })),
    get: vi.fn(async () => product()),
    create: vi.fn(async () => product()),
    update: vi.fn(async () => product({ nameUa: "Червоне яблуко" })),
    changeStatus: vi.fn(async (_id, status) =>
      product({ status, archivedAt: status === "ARCHIVED" ? "2026-08-05T00:00:00.000Z" : null }),
    ),
    reserveMedia: vi.fn<ProductService["reserveMedia"]>(async () => ({
      media: {
        id: "54b79ffc-e6af-440c-ae38-8cd37c22be1c",
        productId,
        kind: "PRODUCT",
        status: "PENDING",
        storageObjectPath: "products/test/original.png",
        mimeType: "image/png",
        byteSize: "1024",
        widthPx: null,
        heightPx: null,
        checksumSha256: null,
        altTextUa: null,
        altTextEn: null,
        isPrimary: true,
        sortOrder: 0,
        createdAt: "2026-08-01T00:00:00.000Z",
      },
      uploadUrl: "https://storage.example/upload",
      token: "signed-upload-token",
    })),
    completeMedia: vi.fn<ProductService["completeMedia"]>(async () => ({
      id: "54b79ffc-e6af-440c-ae38-8cd37c22be1c",
      productId,
      kind: "PRODUCT",
      status: "ACTIVE",
      storageObjectPath: "products/test/original.png",
      mimeType: "image/png",
      byteSize: "1024",
      widthPx: 640,
      heightPx: 480,
      checksumSha256: "a".repeat(64),
      altTextUa: "Яблуко",
      altTextEn: null,
      isPrimary: true,
      sortOrder: 0,
      createdAt: "2026-08-01T00:00:00.000Z",
      url: "https://storage.example/original.png",
      thumbnailUrl: "https://storage.example/thumbnail.webp",
    })),
    deleteMedia: vi.fn(async () => undefined),
    cleanupOrphanedMedia: vi.fn(async ({ dryRun }) => ({
      scanned: 0,
      removed: 0,
      failed: 0,
      dryRun,
    })),
  };
}

function authenticationService(role: "USER" | "ADMIN"): AuthenticationService {
  return {
    async authenticateAccessToken() {
      return {
        userId: "64b79ffc-e6af-440c-ae38-8cd37c22be1c",
        externalSubject: "subject",
        email: "admin@example.com",
        applicationRole: role,
      };
    },
  };
}

function createTestApp(service: ProductService, role: "USER" | "ADMIN") {
  const app = express();
  app.use(createRequestContextMiddleware(createNoopLogger()));
  app.use(express.json());
  app.use(
    "/api/v1",
    createProductRouter(createProductController(service), authenticationService(role)),
  );
  app.use(errorHandler);
  return app;
}

describe("product router", () => {
  it("enforces administrator permission in the API", async () => {
    const service = productService();
    const response = await request(createTestApp(service, "USER"))
      .post("/api/v1/admin/products")
      .set("authorization", "Bearer token")
      .send({
        type: "GENERIC",
        nameEn: "Apple",
        categoryId,
        defaultMeasurementUnitId: unitId,
      });

    expect(response.status).toBe(403);
    expect(service.create).not.toHaveBeenCalled();
  });

  it("validates upload MIME and size before reserving storage", async () => {
    const service = productService();
    const response = await request(createTestApp(service, "ADMIN"))
      .post(`/api/v1/admin/products/${productId}/media/uploads`)
      .set("authorization", "Bearer token")
      .send({ kind: "PRODUCT", mimeType: "image/svg+xml", byteSize: 1024 });

    expect(response.status).toBe(400);
    expect(service.reserveMedia).not.toHaveBeenCalled();
  });

  it("supports the create, view, edit and archive acceptance flow", async () => {
    const service = productService();
    const app = createTestApp(service, "ADMIN");
    const authorization = { authorization: "Bearer token" };

    const created = await request(app).post("/api/v1/admin/products").set(authorization).send({
      type: "GENERIC",
      nameEn: "Apple",
      nameUa: "Яблуко",
      categoryId,
      defaultMeasurementUnitId: unitId,
      foodState: "RAW",
      ediblePortionPercent: "95",
    });
    const viewed = await request(app).get(`/api/v1/admin/products/${productId}`).set(authorization);
    const edited = await request(app)
      .patch(`/api/v1/admin/products/${productId}`)
      .set(authorization)
      .send({ nameUa: "Червоне яблуко" });
    const archived = await request(app)
      .patch(`/api/v1/admin/products/${productId}/status`)
      .set(authorization)
      .send({ status: "ARCHIVED" });

    expect(created.status).toBe(201);
    expect(viewed.status).toBe(200);
    expect(edited.body.data.nameUa).toBe("Червоне яблуко");
    expect(archived.body.data.status).toBe("ARCHIVED");
  });
});
