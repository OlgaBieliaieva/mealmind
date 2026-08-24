import { Prisma, type DatabaseClient } from "@mealmind/db";
import { describe, expect, it, vi } from "vitest";

import { createPrismaReference, updatePrismaReference } from "./prisma-reference-mutations.js";

describe("Prisma reference mutations", () => {
  it("maps a duplicate unique value to a stable conflict error", async () => {
    const database = {
      allergen: {
        create: vi.fn(async () => {
          throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "7.9.1",
            meta: { target: ["code"] },
          });
        }),
      },
    } as unknown as DatabaseClient;

    await expect(
      createPrismaReference(
        database,
        "allergens",
        { code: "milk", nameUa: "Молоко", nameEn: "Milk", isActive: true },
        "actor-id",
      ),
    ).rejects.toMatchObject({ code: "REFERENCE_CONFLICT", statusCode: 409 });
  });

  it("returns null when an updated reference does not exist", async () => {
    const database = {
      recipeType: {
        update: vi.fn(async () => {
          throw new Prisma.PrismaClientKnownRequestError("Record not found", {
            code: "P2025",
            clientVersion: "7.9.1",
          });
        }),
      },
    } as unknown as DatabaseClient;

    await expect(
      updatePrismaReference(database, "recipe-types", "missing-id", { nameUa: "Нова назва" }),
    ).resolves.toBeNull();
  });

  it("returns only API contract fields after a mutation", async () => {
    const database = {
      allergen: {
        create: vi.fn(async () => ({
          id: "allergen-id",
          code: "milk",
          nameUa: "Молоко",
          nameEn: "Milk",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      },
    } as unknown as DatabaseClient;

    await expect(
      createPrismaReference(
        database,
        "allergens",
        { code: "milk", nameUa: "Молоко", nameEn: "Milk", isActive: true },
        "actor-id",
      ),
    ).resolves.toEqual({
      id: "allergen-id",
      code: "milk",
      nameUa: "Молоко",
      nameEn: "Milk",
      isActive: true,
    });
  });

  it("records the creating administrator as an expert verifier", async () => {
    const create = vi.fn(async ({ data }: { data: Prisma.AuthorUncheckedCreateInput }) => ({
      id: "author-id",
      ...data,
    }));
    const database = { author: { create } } as unknown as DatabaseClient;

    await createPrismaReference(
      database,
      "authors",
      {
        type: "EXPERT",
        expertiseArea: "DIETITIAN",
        slug: "verified-expert",
        displayName: "Перевірений експерт",
        isActive: true,
      },
      "admin-id",
    );

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        createdByUserId: "admin-id",
        expertiseVerifiedByUserId: "admin-id",
        expertiseVerifiedAt: expect.any(Date),
        createdAt: expect.any(Date),
      }),
    });
    const data = create.mock.calls[0]?.[0].data;
    expect(data?.expertiseVerifiedAt).toEqual(data?.createdAt);
  });

  it("maps an author shape constraint to a stable client error", async () => {
    const database = {
      author: {
        create: vi.fn(async () => {
          throw new Prisma.PrismaClientKnownRequestError("Constraint failed", {
            code: "P2004",
            clientVersion: "7.9.1",
          });
        }),
      },
    } as unknown as DatabaseClient;

    await expect(
      createPrismaReference(
        database,
        "authors",
        { type: "MEALMIND", slug: "author", displayName: "Автор", isActive: true },
        "admin-id",
      ),
    ).rejects.toMatchObject({ code: "INVALID_REFERENCE_RELATION", statusCode: 400 });
  });
});
