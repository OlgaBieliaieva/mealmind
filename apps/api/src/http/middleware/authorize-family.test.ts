import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { FamilyAuthorizationService } from "../../application/authorization/family-authorization-service.js";
import { FamilyAccessDeniedError } from "../../application/errors/authentication-errors.js";
import { authorizeFamily } from "./authorize-family.js";
import { errorHandler } from "./error-handler.js";

const routeFamilyId = "7f36be0a-0607-4cc3-a00e-e628c44f5755";
const forgedHeaderFamilyId = "47c2abe0-888f-4839-87b4-1ed4991c3cf3";
const applicationUserId = "cbf7c697-b7fa-4f10-beb7-43e272fcaa12";
const forgedHeaderUserId = "8a82aac7-a3a5-497a-adfb-9965dd69db28";

function createFamilyTestApp(authorizationService: FamilyAuthorizationService) {
  const app = express();

  app.get(
    "/families/:familyId",
    (request, _response, next) => {
      request.authenticatedUser = {
        userId: applicationUserId,
        externalSubject: "252b50f0-47a3-4444-b40a-02f84fbb86a4",
        email: "user@example.com",
        applicationRole: "USER",
      };

      next();
    },
    authorizeFamily(authorizationService),
    (request, response) => {
      response.status(200).json({
        data: request.authorizedFamily,
      });
    },
  );

  app.use(errorHandler);

  return app;
}

describe("authorize family middleware", () => {
  it("uses authenticated user and route family ID instead of forged headers", async () => {
    const authorize = vi.fn(async (userId: string, familyId: string) => ({
      membershipId: "8b3bc6dc-aa36-4386-a78d-ac6bc6bd52ad",
      familyId,
      userId,
      role: "MEMBER" as const,
    }));

    const authorizationService: FamilyAuthorizationService = {
      authorize,
    };

    const response = await request(createFamilyTestApp(authorizationService))
      .get(`/families/${routeFamilyId}`)
      .set("x-user-id", forgedHeaderUserId)
      .set("x-family-id", forgedHeaderFamilyId);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      membershipId: "8b3bc6dc-aa36-4386-a78d-ac6bc6bd52ad",
      familyId: routeFamilyId,
      userId: applicationUserId,
      role: "MEMBER",
    });
    expect(authorize).toHaveBeenCalledOnce();
    expect(authorize).toHaveBeenCalledWith(applicationUserId, routeFamilyId, undefined);
  });

  it("returns 403 when membership does not grant access", async () => {
    const authorizationService: FamilyAuthorizationService = {
      authorize: vi.fn(async () => {
        throw new FamilyAccessDeniedError();
      }),
    };

    const response = await request(createFamilyTestApp(authorizationService)).get(
      `/families/${routeFamilyId}`,
    );

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: {
        code: "FAMILY_ACCESS_DENIED",
        message: "Access to the family is denied",
      },
    });
  });
});
