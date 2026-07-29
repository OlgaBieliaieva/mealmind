import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { errorHandler } from "./error-handler.js";

function createErrorTestApp() {
  const app = express();

  app.get("/unexpected", () => {
    throw new Error("DATABASE_URL=postgresql://user:secret@database.internal/mealmind");
  });

  app.use(errorHandler);

  return app;
}

describe("errorHandler", () => {
  it("redacts unexpected errors", async () => {
    const response = await request(createErrorTestApp()).get("/unexpected");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      },
    });

    const serializedResponse = JSON.stringify(response.body);

    expect(serializedResponse).not.toContain("DATABASE_URL");
    expect(serializedResponse).not.toContain("secret");
    expect(serializedResponse).not.toContain("stack");
  });
});
