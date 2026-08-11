import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticationService } from "../../../application/authentication/authentication-service.js";
import { errorHandler } from "../../../http/middleware/error-handler.js";
import type { FamilyService } from "../application/family-service.js";
import { createFamilyRouter } from "./family-router.js";

const userId = "cbf7c697-b7fa-4f10-beb7-43e272fcaa12";
function authentication(): AuthenticationService {
  return {
    authenticateAccessToken: vi.fn(async () => ({
      userId,
      externalSubject: "252b50f0-47a3-4444-b40a-02f84fbb86a4",
      email: "person@example.com",
      applicationRole: "USER" as const,
    })),
  };
}
function service(): FamilyService {
  return {
    readSession: vi.fn(),
    completeOnboarding: vi.fn(async () => ({
      onboardingCompleted: true,
      profile: null,
      family: null,
    })),
    readFamily: vi.fn(),
    updateFamily: vi.fn(),
    listMembers: vi.fn(async () => []),
    createDependent: vi.fn(),
    updateDependent: vi.fn(),
    archiveDependent: vi.fn(),
    readOwnProfile: vi.fn(),
    updateOwnProfile: vi.fn(),
  };
}
function app(familyService: FamilyService) {
  const application = express();
  application.set("trust proxy", 1);
  application.use(express.json());
  application.use("/api/v1", createFamilyRouter(familyService, authentication()));
  application.use(errorHandler);
  return application;
}

describe("family router", () => {
  it("requires a verified bearer identity", async () => {
    const familyService = service();
    const response = await request(app(familyService)).get("/api/v1/family/members");
    expect(response.status).toBe(401);
    expect(familyService.listMembers).not.toHaveBeenCalled();
  });
  it("completes onboarding for the authenticated user and ignores forged identity headers", async () => {
    const familyService = service();
    const response = await request(app(familyService))
      .post("/api/v1/onboarding/complete")
      .set("authorization", "Bearer valid")
      .set("x-user-id", "8a82aac7-a3a5-497a-adfb-9965dd69db28")
      .send({ firstName: " Олена ", activityLevel: "MODERATE" });
    expect(response.status).toBe(200);
    expect(familyService.completeOnboarding).toHaveBeenCalledWith(userId, {
      firstName: "Олена",
      activityLevel: "MODERATE",
    });
  });
  it("rejects role and family injection", async () => {
    const familyService = service();
    const response = await request(app(familyService))
      .post("/api/v1/onboarding/complete")
      .set("authorization", "Bearer valid")
      .send({
        firstName: "Олена",
        familyId: "8a82aac7-a3a5-497a-adfb-9965dd69db28",
        role: "OWNER",
      });
    expect(response.status).toBe(400);
    expect(familyService.completeOnboarding).not.toHaveBeenCalled();
  });
  it("resolves the current family server-side without a family id", async () => {
    const familyService = service();
    const response = await request(app(familyService))
      .get("/api/v1/family/members")
      .set("authorization", "Bearer valid")
      .set("x-family-id", "8a82aac7-a3a5-497a-adfb-9965dd69db28");
    expect(response.status).toBe(200);
    expect(familyService.listMembers).toHaveBeenCalledWith(userId);
  });
});
