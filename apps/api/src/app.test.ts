import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "./app.js";
import { createHealthService } from "./application/health.js";

describe("GET /health", () => {
  it("returns the API health status", async () => {
    const app = createApp({
      healthService: createHealthService(),
    });

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
    });
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });
});
