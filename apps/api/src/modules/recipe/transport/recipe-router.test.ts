import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticationService } from "../../../application/authentication/authentication-service.js";
import { createNoopLogger } from "../../../application/logging/logger.js";
import { errorHandler } from "../../../http/middleware/error-handler.js";
import { createRequestContextMiddleware } from "../../../http/middleware/request-context.js";
import type { RecipeDetails } from "../domain/recipe-repository.js";
import type { RecipeService } from "../application/recipe-service.js";
import { createRecipeController } from "./recipe-controller.js";
import { createRecipeRouter } from "./recipe-router.js";

const recipeId = "00000000-0000-4000-8000-000000000001";
const productId = "00000000-0000-4000-8000-000000000002";

function recipe(): RecipeDetails {
  return {
    id: recipeId,
    title: "Борщ",
    summary: null,
    description: null,
    status: "DRAFT",
    visibility: "PUBLIC",
    difficulty: "MEDIUM",
    recipeTypeId: null,
    recipeTypeName: null,
    authorId: null,
    authorName: null,
    author: null,
    baseServings: 4,
    yieldWeightG: "1200",
    prepTimeMin: 20,
    cookTimeMin: 60,
    restTimeMin: null,
    publishedAt: null,
    archivedAt: null,
    updatedAt: "2026-08-06T00:00:00.000Z",
    ingredients: [
      {
        id: "00000000-0000-4000-8000-000000000003",
        productId,
        productName: "Буряк",
        quantity: "200",
        measurementUnitId: null,
        measurementUnitSymbol: null,
        productPortionId: null,
        gramWeight: "200",
        conversionMethod: "MANUAL",
        isOptional: false,
        position: 0,
      },
    ],
    steps: [
      {
        id: "00000000-0000-4000-8000-000000000004",
        instruction: "Зварити",
        timerSeconds: 3600,
        position: 0,
      },
    ],
    sources: [],
    cuisines: [],
    dietaryTags: [],
    videos: [],
    nutrients: [],
  };
}

function service(): RecipeService {
  return {
    list: vi.fn(async () => ({ items: [recipe()], page: 1, pageSize: 20, total: 1 })),
    getAdmin: vi.fn(async () => recipe()),
    getPublic: vi.fn(async () => {
      const value = recipe();
      return {
        id: value.id,
        title: value.title,
        summary: value.summary,
        description: value.description,
        difficulty: value.difficulty,
        recipeTypeName: value.recipeTypeName,
        authorName: value.authorName,
        author: value.author,
        baseServings: value.baseServings,
        yieldWeightG: value.yieldWeightG,
        prepTimeMin: value.prepTimeMin,
        cookTimeMin: value.cookTimeMin,
        restTimeMin: value.restTimeMin,
        publishedAt: "2026-08-06T00:00:00.000Z",
        ingredients: value.ingredients,
        steps: value.steps,
        sources: value.sources,
        cuisines: value.cuisines,
        dietaryTags: value.dietaryTags,
        videos: value.videos,
        nutrients: value.nutrients,
      };
    }),
    preview: vi.fn(async () => ({
      nutrients: [],
      inputFingerprint: "a".repeat(64),
      totalIngredientWeightG: "200",
    })),
    create: vi.fn(async () => recipe()),
    update: vi.fn(async () => recipe()),
    changeStatus: vi.fn(async (_id, status) => ({ ...recipe(), status })),
  };
}

function auth(role: "USER" | "ADMIN"): AuthenticationService {
  return {
    async authenticateAccessToken() {
      return {
        userId: "00000000-0000-4000-8000-000000000010",
        externalSubject: "subject",
        email: "user@example.com",
        applicationRole: role,
      };
    },
  };
}

function app(role: "USER" | "ADMIN", recipes = service()) {
  const application = express();
  application.use(createRequestContextMiddleware(createNoopLogger()));
  application.use(express.json());
  application.use("/api/v1", createRecipeRouter(createRecipeController(recipes), auth(role)));
  application.use(errorHandler);
  return application;
}

describe("recipe router", () => {
  it("allows an authenticated user to read only the public details contract", async () => {
    const recipes = service();
    const response = await request(app("USER", recipes))
      .get(`/api/v1/recipes/${recipeId}`)
      .set("authorization", "Bearer token");
    expect(response.status).toBe(200);
    expect(recipes.getPublic).toHaveBeenCalledWith(recipeId);
    expect(recipes.getAdmin).not.toHaveBeenCalled();
    expect(response.body.data).not.toHaveProperty("status");
    expect(response.body.data).not.toHaveProperty("visibility");
    expect(response.body.data).not.toHaveProperty("authorId");
    expect(response.body.data).not.toHaveProperty("archivedAt");
  });

  it("rejects recipe administration for a regular user", async () => {
    const recipes = service();
    const response = await request(app("USER", recipes))
      .get("/api/v1/admin/recipes")
      .set("authorization", "Bearer token");
    expect(response.status).toBe(403);
    expect(recipes.list).not.toHaveBeenCalled();
  });

  it("validates gram conversion before creating a recipe", async () => {
    const recipes = service();
    const response = await request(app("ADMIN", recipes))
      .post("/api/v1/admin/recipes")
      .set("authorization", "Bearer token")
      .send({
        title: "Борщ",
        visibility: "PUBLIC",
        baseServings: 4,
        ingredients: [
          {
            productId,
            quantity: "200",
            gramWeight: "200",
            measurementUnitId: "00000000-0000-4000-8000-000000000020",
          },
        ],
        steps: [{ instruction: "Зварити" }],
      });
    expect(response.status).toBe(400);
    expect(recipes.create).not.toHaveBeenCalled();
  });

  it("supports create, preview, update and status actions for an administrator", async () => {
    const recipes = service();
    const application = app("ADMIN", recipes);
    const authorization = { authorization: "Bearer token" };
    const body = {
      title: "Борщ",
      visibility: "PUBLIC",
      baseServings: 4,
      ingredients: [{ productId, quantity: "200", gramWeight: "200" }],
      steps: [{ instruction: "Зварити" }],
    };
    expect(
      (await request(application).post("/api/v1/admin/recipes").set(authorization).send(body))
        .status,
    ).toBe(201);
    expect(
      (
        await request(application)
          .post("/api/v1/admin/recipes/nutrition-preview")
          .set(authorization)
          .send({ ingredients: body.ingredients })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(application)
          .patch(`/api/v1/admin/recipes/${recipeId}`)
          .set(authorization)
          .send({ title: "Борщ український" })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(application)
          .patch(`/api/v1/admin/recipes/${recipeId}/status`)
          .set(authorization)
          .send({ status: "READY" })
      ).status,
    ).toBe(200);
  });
});
