import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticationService } from "../../../application/authentication/authentication-service.js";
import { createNoopLogger } from "../../../application/logging/logger.js";
import { errorHandler } from "../../../http/middleware/error-handler.js";
import type { ApiRateLimitOverrides } from "../../../http/middleware/rate-limit.js";
import { createRequestContextMiddleware } from "../../../http/middleware/request-context.js";
import type { ReferenceService } from "../application/reference-service.js";
import { createReferenceController } from "./reference-controller.js";
import { createReferenceRouter } from "./reference-router.js";

function authenticationService(role: "USER" | "ADMIN"): AuthenticationService {
  return {
    async authenticateAccessToken() {
      return {
        userId: "24b79ffc-e6af-440c-ae38-8cd37c22be1c",
        externalSubject: "subject",
        email: "user@example.com",
        applicationRole: role,
      };
    },
  };
}

function createTestApp(
  service: ReferenceService,
  role: "USER" | "ADMIN",
  rateLimitOverrides: ApiRateLimitOverrides = {},
) {
  const app = express();
  app.use(createRequestContextMiddleware(createNoopLogger()));
  app.use(express.json());
  app.use(
    "/api/v1",
    createReferenceRouter(
      createReferenceController(service),
      authenticationService(role),
      rateLimitOverrides,
    ),
  );
  app.use(errorHandler);
  return app;
}

function referenceService(): ReferenceService {
  return {
    list: vi.fn(async () => ({ items: [], page: 1, pageSize: 50, total: 0 })),
    create: vi.fn(async (_resource, data) => ({ id: "new-reference", ...data })),
    update: vi.fn(async (_resource, id, data) => ({ id, ...data })),
  };
}

describe("reference router", () => {
  const createCases = [
    ["allergens", { code: "test_allergen", nameUa: "Алерген", nameEn: "Allergen" }],
    ["authors", { type: "EXPERT", slug: "test-author", displayName: "Тестовий автор" }],
    ["brands", { name: "MealMind Foods" }],
    [
      "cuisines",
      {
        code: "test_cuisine",
        nameUa: "Кухня",
        nameEn: "Cuisine",
        scope: "NATIONAL",
        sortOrder: 10,
      },
    ],
    [
      "dietary-tags",
      { code: "test_tag", nameUa: "Тег", nameEn: "Tag", kind: "DIET_PATTERN", sortOrder: 10 },
    ],
    [
      "meal-types",
      { code: "test_meal", nameUa: "Прийом", nameEn: "Meal", kind: "FLEXIBLE", sortOrder: 10 },
    ],
    [
      "measurement-units",
      {
        code: "test_unit",
        symbol: "tu",
        nameUa: "Одиниця",
        nameEn: "Unit",
        dimension: "COUNT",
        factorToBaseUnit: "1",
        sortOrder: 10,
      },
    ],
    [
      "nutrients",
      {
        code: "test_nutrient",
        nameUa: "Нутрієнт",
        nameEn: "Nutrient",
        group: "OTHER",
        unit: "G",
        sortOrder: 10,
      },
    ],
    [
      "product-categories",
      {
        code: "test_category",
        nameUa: "Категорія",
        nameEn: "Category",
        kind: "GROUP",
        sortOrder: 10,
      },
    ],
    ["recipe-types", { code: "test_recipe", nameUa: "Тип", nameEn: "Type", sortOrder: 10 }],
  ] as const;

  it("serves an authenticated empty reference result with cache policy", async () => {
    const response = await request(createTestApp(referenceService(), "USER"))
      .get("/api/v1/reference/meal-types")
      .set("authorization", "Bearer token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: { items: [] },
      meta: { page: 1, pageSize: 50, total: 0 },
    });
    expect(response.headers["cache-control"]).toContain("max-age=300");
  });

  it("rate limits reference routes before calling protected handlers", async () => {
    const service = referenceService();
    const app = createTestApp(service, "USER", { limit: 1, windowMs: 60_000 });

    const accepted = await request(app)
      .get("/api/v1/reference/meal-types")
      .set("authorization", "Bearer token");
    const blocked = await request(app)
      .get("/api/v1/reference/meal-types")
      .set("authorization", "Bearer token");

    expect(accepted.status).toBe(200);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests",
      },
    });
    expect(service.list).toHaveBeenCalledTimes(1);
  });

  it("rejects an admin mutation for a regular user", async () => {
    const service = referenceService();
    const response = await request(createTestApp(service, "USER"))
      .post("/api/v1/admin/reference/brands")
      .set("authorization", "Bearer token")
      .send({ name: "MealMind Foods" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ACCOUNT_ACCESS_DENIED");
    expect(service.create).not.toHaveBeenCalled();
  });

  it("allows an administrator to create a brand", async () => {
    const service = referenceService();
    const response = await request(createTestApp(service, "ADMIN"))
      .post("/api/v1/admin/reference/brands")
      .set("authorization", "Bearer token")
      .send({ name: "MealMind Foods", countryCode: "ua" });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      id: "new-reference",
      name: "MealMind Foods",
      countryCode: "UA",
      status: "DRAFT",
    });
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it.each(createCases)("validates and creates the %s reference", async (resource, body) => {
    const service = referenceService();
    const response = await request(createTestApp(service, "ADMIN"))
      .post(`/api/v1/admin/reference/${resource}`)
      .set("authorization", "Bearer token")
      .send(body);

    expect(response.status).toBe(201);
    expect(service.create).toHaveBeenCalledWith(
      resource,
      expect.objectContaining(body),
      "24b79ffc-e6af-440c-ae38-8cd37c22be1c",
    );
  });

  it("updates a reference while keeping stable codes immutable", async () => {
    const service = referenceService();
    const id = "24b79ffc-e6af-440c-ae38-8cd37c22be1c";
    const app = createTestApp(service, "ADMIN");

    const accepted = await request(app)
      .patch(`/api/v1/admin/reference/allergens/${id}`)
      .set("authorization", "Bearer token")
      .send({ nameUa: "Оновлена назва", isActive: false });
    const rejected = await request(app)
      .patch(`/api/v1/admin/reference/allergens/${id}`)
      .set("authorization", "Bearer token")
      .send({ code: "changed_code" });

    expect(accepted.status).toBe(200);
    expect(service.update).toHaveBeenCalledWith("allergens", id, {
      nameUa: "Оновлена назва",
      isActive: false,
    });
    expect(rejected.status).toBe(400);
  });
});
