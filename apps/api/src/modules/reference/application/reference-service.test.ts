import { describe, expect, it } from "vitest";

import type { ReferenceRecord, ReferenceRepository } from "../domain/reference-repository.js";
import { createReferenceService } from "./reference-service.js";

function repositoryWith(records: readonly ReferenceRecord[]): ReferenceRepository {
  return {
    async list() {
      return records;
    },
    async create(_resource, data) {
      return { id: "brand-id", ...data };
    },
    async update() {
      return null;
    },
  };
}

const listOptions = {
  includeInactive: false,
  page: 1,
  pageSize: 50,
} as const;

describe("reference service", () => {
  it("orders results deterministically regardless of repository order", async () => {
    const service = createReferenceService(
      repositoryWith([
        { id: "3", code: "third", nameUa: "В", sortOrder: 20 },
        { id: "2", code: "second", nameUa: "Б", sortOrder: 10 },
        { id: "1", code: "first", nameUa: "А", sortOrder: 10 },
      ]),
    );

    const page = await service.list("recipe-types", listOptions);

    expect(page.items.map((item) => item.id)).toEqual(["1", "2", "3"]);
  });

  it("returns a stable empty page", async () => {
    const page = await createReferenceService(repositoryWith([])).list("meal-types", listOptions);

    expect(page).toEqual({ items: [], page: 1, pageSize: 50, total: 0 });
  });

  it("builds a sorted category hierarchy", async () => {
    const service = createReferenceService(
      repositoryWith([
        { id: "child", parentCategoryId: "root", nameUa: "Дитина", sortOrder: 20 },
        { id: "root", parentCategoryId: null, nameUa: "Корінь", sortOrder: 10 },
      ]),
    );

    const page = await service.list("product-categories", listOptions);

    expect(page.items).toEqual([
      expect.objectContaining({
        id: "root",
        children: [expect.objectContaining({ id: "child", children: [] })],
      }),
    ]);
    expect(page.total).toBe(2);
  });

  it("keeps ancestors when category search matches a descendant", async () => {
    const service = createReferenceService(
      repositoryWith([
        { id: "root", parentCategoryId: null, nameUa: "Овочі", sortOrder: 10 },
        { id: "child", parentCategoryId: "root", nameUa: "Листяні", sortOrder: 20 },
        { id: "other", parentCategoryId: null, nameUa: "Фрукти", sortOrder: 30 },
      ]),
    );

    const page = await service.list("product-categories", {
      ...listOptions,
      search: "лист",
    });

    expect(page.total).toBe(2);
    expect(page.items).toEqual([
      expect.objectContaining({
        id: "root",
        children: [expect.objectContaining({ id: "child" })],
      }),
    ]);
  });

  it("rejects an orphan category", async () => {
    const service = createReferenceService(
      repositoryWith([{ id: "orphan", parentCategoryId: "missing", sortOrder: 1 }]),
    );

    await expect(service.list("product-categories", listOptions)).rejects.toMatchObject({
      code: "INVALID_REFERENCE_HIERARCHY",
    });
  });

  it("rejects a category cycle", async () => {
    const service = createReferenceService(
      repositoryWith([
        { id: "a", parentCategoryId: "b", sortOrder: 1 },
        { id: "b", parentCategoryId: "a", sortOrder: 2 },
      ]),
    );

    await expect(service.list("product-categories", listOptions)).rejects.toMatchObject({
      code: "INVALID_REFERENCE_HIERARCHY",
    });
  });

  it("rejects a missing parent before creating a category", async () => {
    const service = createReferenceService(
      repositoryWith([{ id: "root", parentCategoryId: null, sortOrder: 1 }]),
    );

    await expect(
      service.create(
        "product-categories",
        {
          code: "child",
          nameUa: "Дочірня",
          nameEn: "Child",
          kind: "GROUP",
          parentCategoryId: "24b79ffc-e6af-440c-ae38-8cd37c22be1c",
          sortOrder: 2,
        },
        "actor-id",
      ),
    ).rejects.toMatchObject({ code: "INVALID_REFERENCE_RELATION", statusCode: 400 });
  });

  it("rejects a cycle before updating a category", async () => {
    const service = createReferenceService(
      repositoryWith([
        { id: "root", parentCategoryId: null, sortOrder: 1 },
        { id: "child", parentCategoryId: "root", sortOrder: 2 },
      ]),
    );

    await expect(
      service.update("product-categories", "root", { parentCategoryId: "child" }),
    ).rejects.toMatchObject({ code: "INVALID_REFERENCE_RELATION", statusCode: 400 });
  });

  it("does not deactivate a category that still has active children", async () => {
    const service = createReferenceService(
      repositoryWith([
        { id: "root", parentCategoryId: null, isActive: true, sortOrder: 1 },
        { id: "child", parentCategoryId: "root", isActive: true, sortOrder: 2 },
      ]),
    );

    await expect(
      service.update("product-categories", "root", { isActive: false }),
    ).rejects.toMatchObject({ code: "INVALID_REFERENCE_RELATION", statusCode: 400 });
  });
});
