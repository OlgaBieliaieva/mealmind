import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp, type AppDependencies } from "./app.js";
import { createHealthService } from "./application/health.js";

describe("MealMind API application", () => {
  let dependencies: AppDependencies;

  beforeEach(() => {
    dependencies = {
      healthService: createHealthService(),
    };
  });

  it("returns the API health status", async () => {
    const response = await request(createApp(dependencies)).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
    });
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("returns the stable error contract for an unknown route", async () => {
    const response = await request(createApp(dependencies)).get("/unknown-route");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "ROUTE_NOT_FOUND",
        message: "Route not found",
      },
    });
  });

  it("returns a stable error for malformed JSON", async () => {
    const response = await request(createApp(dependencies))
      .post("/unknown-route")
      .set("content-type", "application/json")
      .send('{"invalidJson":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_JSON",
        message: "Request body contains invalid JSON",
      },
    });
  });
});
