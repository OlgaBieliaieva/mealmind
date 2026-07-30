import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { errorHandler } from "../middleware/error-handler.js";
import { validateRequest } from "./validate-request.js";

const requestSchema = z.object({
  params: z.object({
    itemId: z.string().uuid(),
  }),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100),
  }),
  body: z.object({
    name: z.string().trim().min(1),
  }),
});

function createValidationTestApp() {
  const app = express();

  app.use(express.json());

  app.post(
    "/items/:itemId",
    validateRequest(requestSchema, async (input, _request, response) => {
      response.status(200).json(input);
    }),
  );

  app.use(errorHandler);

  return app;
}

describe("validateRequest", () => {
  it("passes parsed and transformed input to the handler", async () => {
    const itemId = "9ca971c8-45a8-4d8c-b690-47e326dc50f7";

    const response = await request(createValidationTestApp())
      .post(`/items/${itemId}?limit=10`)
      .send({
        name: "  Sample item  ",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      params: {
        itemId,
      },
      query: {
        limit: 10,
      },
      body: {
        name: "Sample item",
      },
    });
  });

  it("returns field-level issues for invalid input", async () => {
    const response = await request(createValidationTestApp())
      .post("/items/not-a-uuid?limit=0")
      .send({
        name: "",
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
      },
    });

    expect(response.body.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "params.itemId",
        }),
        expect.objectContaining({
          path: "query.limit",
        }),
        expect.objectContaining({
          path: "body.name",
        }),
      ]),
    );
  });
});
