import { describe, expect, it, vi } from "vitest";

import {
  createAuthenticationService,
  type ApplicationUser,
  type IdentityProvider,
  type UserIdentityRepository,
} from "./authentication-service.js";

describe("AuthenticationService", () => {
  it("creates context from verified identity and active application user", async () => {
    const identityProvider: IdentityProvider = {
      verifyAccessToken: vi.fn(async () => ({
        subject: "252b50f0-47a3-4444-b40a-02f84fbb86a4",
        email: "auth@example.com",
        emailVerified: true,
      })),
    };

    const applicationUser: ApplicationUser = Object.freeze({
      id: "cbf7c697-b7fa-4f10-beb7-43e272fcaa12",
      externalSubject: "252b50f0-47a3-4444-b40a-02f84fbb86a4",
      email: "user@example.com",
      applicationRole: "USER",
    });

    const userIdentityRepository: UserIdentityRepository = {
      findActiveByExternalSubject: vi.fn(async () => applicationUser),
    };

    const service = createAuthenticationService({
      identityProvider,
      userIdentityRepository,
    });

    await expect(service.authenticateAccessToken("valid-token")).resolves.toEqual({
      userId: "cbf7c697-b7fa-4f10-beb7-43e272fcaa12",
      externalSubject: "252b50f0-47a3-4444-b40a-02f84fbb86a4",
      email: "user@example.com",
      applicationRole: "USER",
    });
  });

  it("rejects an invalid identity token", async () => {
    const identityProvider: IdentityProvider = {
      verifyAccessToken: vi.fn(async () => null),
    };

    const userIdentityRepository: UserIdentityRepository = {
      findActiveByExternalSubject: vi.fn(async () => null),
    };

    const service = createAuthenticationService({
      identityProvider,
      userIdentityRepository,
    });

    await expect(service.authenticateAccessToken("invalid-token")).rejects.toMatchObject({
      code: "AUTHENTICATION_REQUIRED",
      statusCode: 401,
    });
  });

  it("rejects a verified identity without an active application user", async () => {
    const identityProvider: IdentityProvider = {
      verifyAccessToken: vi.fn(async () => ({
        subject: "252b50f0-47a3-4444-b40a-02f84fbb86a4",
        email: "auth@example.com",
        emailVerified: true,
      })),
    };

    const userIdentityRepository: UserIdentityRepository = {
      findActiveByExternalSubject: vi.fn(async () => null),
    };

    const service = createAuthenticationService({
      identityProvider,
      userIdentityRepository,
    });

    await expect(service.authenticateAccessToken("valid-token")).rejects.toMatchObject({
      code: "ACCOUNT_ACCESS_DENIED",
      statusCode: 403,
    });
  });
});
