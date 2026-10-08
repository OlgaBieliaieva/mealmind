import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticationService } from "../../../application/authentication/authentication-service.js";
import { createNoopLogger } from "../../../application/logging/logger.js";
import { errorHandler } from "../../../http/middleware/error-handler.js";
import { createRequestContextMiddleware } from "../../../http/middleware/request-context.js";
import type { ProductImportReviewService } from "../application/product-import-review-service.js";
import { createProductImportReviewController } from "./product-import-review-controller.js";
import { createProductImportReviewRouter } from "./product-import-review-router.js";

const candidateId = "33333333-3333-4333-8333-333333333333";

describe("product import review router", () => {
  it("rejects a regular user before reading the review queue", async () => {
    const service = serviceFixture();
    const response = await request(createTestApp(service, "USER"))
      .get("/api/v1/admin/product-import/candidates")
      .set("authorization", "Bearer token");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ACCOUNT_ACCESS_DENIED");
    expect(service.list).not.toHaveBeenCalled();
  });

  it("passes validated queue filters and pagination to the service", async () => {
    const service = serviceFixture();
    const response = await request(createTestApp(service, "ADMIN"))
      .get("/api/v1/admin/product-import/candidates")
      .query({ status: "PENDING", disposition: "CANDIDATE", page: "2", pageSize: "50" })
      .set("authorization", "Bearer token");

    expect(response.status).toBe(200);
    expect(service.list).toHaveBeenCalledWith({
      status: "PENDING",
      disposition: "CANDIDATE",
      page: 2,
      pageSize: 50,
    });
    expect(response.headers["cache-control"]).toContain("no-store");
  });

  it("uses the authenticated administrator as the review actor", async () => {
    const service = serviceFixture();
    const response = await request(createTestApp(service, "ADMIN"))
      .post(`/api/v1/admin/product-import/candidates/${candidateId}/review`)
      .set("authorization", "Bearer token")
      .send({ expectedUpdatedAt: "2026-10-07T09:00:00.000Z" });

    expect(response.status).toBe(200);
    expect(service.start).toHaveBeenCalledWith(
      candidateId,
      { expectedUpdatedAt: "2026-10-07T09:00:00.000Z" },
      "24b79ffc-e6af-440c-ae38-8cd37c22be1c",
    );
  });

  it("rejects an unsupported review decision at the HTTP boundary", async () => {
    const service = serviceFixture();
    const response = await request(createTestApp(service, "ADMIN"))
      .post(`/api/v1/admin/product-import/candidates/${candidateId}/decision`)
      .set("authorization", "Bearer token")
      .send({
        expectedUpdatedAt: "2026-10-07T09:00:00.000Z",
        decision: "PUBLISH",
      });

    expect(response.status).toBe(400);
    expect(service.decide).not.toHaveBeenCalled();
  });
});

function authenticationService(role: "USER" | "ADMIN"): AuthenticationService {
  return {
    async authenticateAccessToken() {
      return {
        userId: "24b79ffc-e6af-440c-ae38-8cd37c22be1c",
        externalSubject: "subject",
        email: "admin@example.com",
        applicationRole: role,
      };
    },
  };
}

function createTestApp(service: ProductImportReviewService, role: "USER" | "ADMIN") {
  const app = express();
  app.use(createRequestContextMiddleware(createNoopLogger()));
  app.use(express.json());
  app.use(
    "/api/v1",
    createProductImportReviewRouter(
      createProductImportReviewController(service),
      authenticationService(role),
    ),
  );
  app.use(errorHandler);
  return app;
}

function serviceFixture(): ProductImportReviewService {
  const result = { candidate: {}, catalogMatches: [] } as never;
  return {
    list: vi.fn(async () => ({ items: [], page: 1, pageSize: 25, total: 0 })),
    get: vi.fn(async () => result),
    start: vi.fn(async () => result),
    updateDraft: vi.fn(async () => result),
    decide: vi.fn(async () => result),
    reopen: vi.fn(async () => result),
  };
}
