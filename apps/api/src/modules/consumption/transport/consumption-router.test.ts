import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticationService } from "../../../application/authentication/authentication-service.js";
import { createNoopLogger } from "../../../application/logging/logger.js";
import { errorHandler } from "../../../http/middleware/error-handler.js";
import { createRequestContextMiddleware } from "../../../http/middleware/request-context.js";
import type { ConsumptionService } from "../application/consumption-service.js";
import type { ConsumptionDashboard, DiaryDay } from "../domain/consumption-repository.js";
import { createConsumptionRouter } from "./consumption-router.js";

const authorization = { Authorization: "Bearer token" };
const day: DiaryDay = {
  familyName: "Родина",
  role: "OWNER",
  selfMemberId: "member-id",
  date: "2026-09-01",
  timeZone: "Europe/Kyiv",
  members: [],
};
const dashboard: ConsumptionDashboard = {
  familyName: "Родина",
  role: "OWNER",
  selfMemberId: "member-id",
  dates: ["2026-09-01", "2026-09-02"],
  periodStart: "2026-09-01",
  periodEnd: "2026-09-02",
  timeZone: "Europe/Kyiv",
  members: [],
};

function authentication(): AuthenticationService {
  return {
    async authenticateAccessToken() {
      return {
        userId: "24b79ffc-e6af-440c-ae38-8cd37c22be1c",
        externalSubject: "subject",
        email: "user@example.com",
        applicationRole: "USER",
      };
    },
  };
}

function service(): ConsumptionService {
  return {
    readDay: vi.fn(async () => day),
    readDashboard: vi.fn(async () => dashboard),
    confirmPlanned: vi.fn(async () => day),
    skipPlanned: vi.fn(async () => day),
    restorePlanned: vi.fn(async () => day),
    updateEntry: vi.fn(async () => day),
    voidEntry: vi.fn(async () => day),
    addManual: vi.fn(async () => day),
  };
}

function testApp(consumption: ConsumptionService) {
  const app = express();
  app.use(createRequestContextMiddleware(createNoopLogger()));
  app.use(express.json());
  app.use("/api/v1", createConsumptionRouter(consumption, authentication()));
  app.use(errorHandler);
  return app;
}

describe("consumption router", () => {
  it("keeps the diary on its single-date contract", async () => {
    const consumption = service();

    const response = await request(testApp(consumption))
      .get("/api/v1/consumption/diary?date=2026-09-01")
      .set(authorization);

    expect(response.status).toBe(200);
    expect(consumption.readDay).toHaveBeenCalledWith(
      "24b79ffc-e6af-440c-ae38-8cd37c22be1c",
      "2026-09-01",
    );
    expect(consumption.readDashboard).not.toHaveBeenCalled();
  });

  it("passes an explicit date set to the period dashboard", async () => {
    const consumption = service();

    const response = await request(testApp(consumption))
      .get("/api/v1/consumption/dashboard?dates=2026-09-01%2C2026-09-03")
      .set(authorization);

    expect(response.status).toBe(200);
    expect(consumption.readDashboard).toHaveBeenCalledWith("24b79ffc-e6af-440c-ae38-8cd37c22be1c", [
      "2026-09-01",
      "2026-09-03",
    ]);
    expect(consumption.readDay).not.toHaveBeenCalled();
  });
});
