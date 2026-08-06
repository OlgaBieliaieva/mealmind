import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { IdentityProvider } from "../../../application/authentication/authentication-service.js";
import { errorHandler } from "../../../http/middleware/error-handler.js";
import type { AccountService } from "../application/account-service.js";
import { createAccountRouter } from "./account-router.js";

const identity = {
  subject: "252b50f0-47a3-4444-b40a-02f84fbb86a4",
  email: "person@example.com",
  emailVerified: true,
} as const;

function createTestApp(identityProvider: IdentityProvider, service: AccountService) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json());
  app.use("/api/v1", createAccountRouter(identityProvider, service));
  app.use(errorHandler);
  return app;
}

describe("account bootstrap router", () => {
  it("bootstraps an account from the verified bearer identity", async () => {
    const identityProvider: IdentityProvider = {
      verifyAccessToken: vi.fn(async () => identity),
    };
    const service: AccountService = {
      bootstrap: vi.fn(async () => ({
        id: "cbf7c697-b7fa-4f10-beb7-43e272fcaa12",
        externalSubject: identity.subject,
        email: identity.email,
        applicationRole: "USER" as const,
      })),
    };

    const response = await request(createTestApp(identityProvider, service))
      .post("/api/v1/account/bootstrap")
      .set("authorization", "Bearer valid-token")
      .send({});

    expect(response.status).toBe(200);
    expect(identityProvider.verifyAccessToken).toHaveBeenCalledWith("valid-token");
    expect(service.bootstrap).toHaveBeenCalledWith(identity);
    expect(response.body).toEqual({
      data: {
        user: {
          id: "cbf7c697-b7fa-4f10-beb7-43e272fcaa12",
          email: "person@example.com",
          applicationRole: "USER",
        },
      },
    });
  });

  it("rejects missing and invalid bearer tokens", async () => {
    const identityProvider: IdentityProvider = {
      verifyAccessToken: vi.fn(async () => null),
    };
    const service: AccountService = {
      bootstrap: vi.fn(),
    };
    const app = createTestApp(identityProvider, service);

    const missing = await request(app).post("/api/v1/account/bootstrap").send({});
    const invalid = await request(app)
      .post("/api/v1/account/bootstrap")
      .set("authorization", "Bearer invalid-token")
      .send({});

    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
    expect(service.bootstrap).not.toHaveBeenCalled();
  });

  it("rejects attempts to inject an application role", async () => {
    const identityProvider: IdentityProvider = {
      verifyAccessToken: vi.fn(async () => identity),
    };
    const service: AccountService = {
      bootstrap: vi.fn(),
    };

    const response = await request(createTestApp(identityProvider, service))
      .post("/api/v1/account/bootstrap")
      .set("authorization", "Bearer valid-token")
      .send({ applicationRole: "ADMIN" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(service.bootstrap).not.toHaveBeenCalled();
  });
});
