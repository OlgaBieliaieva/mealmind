import { createHash } from "node:crypto";

import { Prisma, type DatabaseClient } from "@mealmind/db";

import {
  ShoppingListConflictError,
  ShoppingListNotFoundError,
  ShoppingListReadOnlyError,
  ShoppingListValidationError,
} from "../application/shopping-list-errors.js";
import type {
  ShoppingListDetail,
  ShoppingListItemStatus,
  ShoppingListRepository,
  ShoppingListStatus,
  ShoppingListSummary,
  ShoppingListWarning,
} from "../domain/shopping-list-repository.js";

type Client = DatabaseClient | Prisma.TransactionClient;

interface DerivedSource {
  readonly kind: "DIRECT_PRODUCT" | "RECIPE_INGREDIENT";
  readonly sourceKey: string;
  readonly sourceFingerprint: string;
  readonly mealEntryId: string;
  readonly recipeIngredientId: string | null;
  readonly recipeId: string | null;
  readonly recipeTitle: string | null;
  readonly mealDate: Date;
  readonly productId: string;
  readonly baseQuantity: number;
  readonly baseMeasurementUnitId: string;
  readonly scaleFactor: number;
  readonly conversionKind: "IDENTITY" | "MEASUREMENT_FACTOR" | "PRODUCT_PORTION";
  readonly conversionFactor: number;
  readonly contributedQuantity: number;
  readonly contributedMeasurementUnitId: string;
}

interface DerivedGroup {
  readonly productId: string;
  readonly productCategoryId: string;
  readonly productName: string;
  readonly categoryCode: string;
  readonly categoryName: string;
  readonly groupCategoryCode: string;
  readonly groupCategoryName: string;
  readonly unitId: string;
  readonly sources: DerivedSource[];
}

interface Derivation {
  readonly mealPlanId: string;
  readonly fingerprint: string;
  readonly warnings: readonly ShoppingListWarning[];
  readonly groups: readonly DerivedGroup[];
}

function numeric(value: { toString(): string } | number | null | undefined): number {
  return value === null || value === undefined ? 0 : Number(value.toString());
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function decimal(value: number, scale = 8): string {
  return value.toFixed(scale).replace(/\.?0+$/, "");
}

function productSnapshot(product: {
  readonly nameUa: string | null;
  readonly nameEn: string;
  readonly category: {
    readonly id: string;
    readonly code: string;
    readonly nameUa: string;
    readonly parentCategory: { readonly code: string; readonly nameUa: string } | null;
  };
}) {
  return {
    productCategoryId: product.category.id,
    productName: product.nameUa ?? product.nameEn,
    categoryCode: product.category.code,
    categoryName: product.category.nameUa,
    groupCategoryCode: product.category.parentCategory?.code ?? product.category.code,
    groupCategoryName: product.category.parentCategory?.nameUa ?? product.category.nameUa,
  };
}

async function derive(
  client: Client,
  familyId: string,
  mealPlanId: string,
  periodStart: string,
  periodEnd: string,
): Promise<Derivation> {
  const plan = await client.mealPlan.findFirst({
    where: { id: mealPlanId, familyId },
    select: {
      id: true,
      entries: {
        where: {
          removedAt: null,
          date: {
            gte: new Date(`${periodStart}T00:00:00.000Z`),
            lte: new Date(`${periodEnd}T00:00:00.000Z`),
          },
        },
        orderBy: [{ date: "asc" }, { id: "asc" }],
        select: {
          id: true,
          date: true,
          updatedAt: true,
          participants: {
            orderBy: { id: "asc" },
            select: { id: true, quantityInGrams: true, updatedAt: true },
          },
          product: {
            select: {
              id: true,
              nameUa: true,
              nameEn: true,
              updatedAt: true,
              category: {
                select: {
                  id: true,
                  code: true,
                  nameUa: true,
                  parentCategory: { select: { code: true, nameUa: true } },
                },
              },
            },
          },
          recipe: {
            select: {
              id: true,
              title: true,
              updatedAt: true,
              ingredients: {
                orderBy: [{ position: "asc" }, { id: "asc" }],
                select: {
                  id: true,
                  quantity: true,
                  gramWeight: true,
                  isOptional: true,
                  updatedAt: true,
                  measurementUnit: {
                    select: {
                      id: true,
                      dimension: true,
                      factorToBaseUnit: true,
                      isBaseUnit: true,
                    },
                  },
                  productPortionId: true,
                  product: {
                    select: {
                      id: true,
                      nameUa: true,
                      nameEn: true,
                      updatedAt: true,
                      category: {
                        select: {
                          id: true,
                          code: true,
                          nameUa: true,
                          parentCategory: { select: { code: true, nameUa: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!plan) {
    throw new ShoppingListValidationError("Meal plan was not found for the active family");
  }

  const baseUnits = await client.measurementUnit.findMany({
    where: { isBaseUnit: true, isActive: true },
    select: { id: true, code: true, dimension: true },
  });
  const baseByDimension = new Map(baseUnits.map((unit) => [unit.dimension, unit]));
  const gramUnit = baseByDimension.get("MASS");
  if (!gramUnit) {
    throw new ShoppingListValidationError("Base mass measurement unit is not configured");
  }

  const warnings: ShoppingListWarning[] = [];
  const groups = new Map<string, DerivedGroup>();
  const canonicalSources: unknown[] = [];

  function addSource(
    product: Parameters<typeof productSnapshot>[0] & { readonly id: string },
    unitId: string,
    source: DerivedSource,
  ) {
    const key = `${product.id}:${unitId}`;
    const existing = groups.get(key);
    if (existing) {
      existing.sources.push(source);
    } else {
      groups.set(key, {
        productId: product.id,
        ...productSnapshot(product),
        unitId,
        sources: [source],
      });
    }
    canonicalSources.push({
      ...source,
      mealDate: dateOnly(source.mealDate),
      sourceFingerprint: undefined,
    });
  }

  for (const entry of plan.entries) {
    const plannedWeight = entry.participants.reduce(
      (sum, participant) => sum + numeric(participant.quantityInGrams),
      0,
    );
    if (plannedWeight <= 0) continue;

    if (entry.product) {
      const sourceData = {
        kind: "DIRECT_PRODUCT" as const,
        sourceKey: `meal-entry:${entry.id}`,
        mealEntryId: entry.id,
        recipeIngredientId: null,
        recipeId: null,
        recipeTitle: null,
        mealDate: entry.date,
        productId: entry.product.id,
        baseQuantity: plannedWeight,
        baseMeasurementUnitId: gramUnit.id,
        scaleFactor: 1,
        conversionKind: "IDENTITY" as const,
        conversionFactor: 1,
        contributedQuantity: plannedWeight,
        contributedMeasurementUnitId: gramUnit.id,
      };
      addSource(entry.product, gramUnit.id, {
        ...sourceData,
        sourceFingerprint: sha256({
          ...sourceData,
          mealDate: dateOnly(entry.date),
          entryUpdatedAt: entry.updatedAt.toISOString(),
          participants: entry.participants.map((item) => [
            item.id,
            item.quantityInGrams.toString(),
            item.updatedAt.toISOString(),
          ]),
        }),
      });
      continue;
    }

    if (!entry.recipe) continue;
    const recipeWeight = entry.recipe.ingredients.reduce(
      (sum, ingredient) => sum + numeric(ingredient.gramWeight),
      0,
    );
    if (recipeWeight <= 0) {
      warnings.push({
        code: "RECIPE_WEIGHT_UNAVAILABLE",
        message: "Інгредієнти рецепта не мають достатніх вагових даних для масштабування.",
        sourceName: entry.recipe.title,
      });
      continue;
    }
    const scaleFactor = plannedWeight / recipeWeight;

    for (const ingredient of entry.recipe.ingredients) {
      const gramWeight = numeric(ingredient.gramWeight);
      if (gramWeight <= 0) {
        warnings.push({
          code: "INGREDIENT_WEIGHT_UNAVAILABLE",
          message: "Позицію пропущено, оскільки для інгредієнта не визначено вагу.",
          sourceName: ingredient.product.nameUa ?? ingredient.product.nameEn,
        });
        continue;
      }

      const originalUnit = ingredient.measurementUnit;
      const contributedUnit = originalUnit ? baseByDimension.get(originalUnit.dimension) : gramUnit;
      if (!contributedUnit) {
        warnings.push({
          code: "MEASUREMENT_UNIT_UNAVAILABLE",
          message: "Позицію пропущено, оскільки базову одиницю вимірювання не налаштовано.",
          sourceName: ingredient.product.nameUa ?? ingredient.product.nameEn,
        });
        continue;
      }

      const baseQuantity = originalUnit ? numeric(ingredient.quantity) : gramWeight;
      const conversionFactor = originalUnit ? numeric(originalUnit.factorToBaseUnit) : 1;
      const contributedQuantity = baseQuantity * scaleFactor * conversionFactor;
      const conversionKind = originalUnit
        ? originalUnit.isBaseUnit
          ? ("IDENTITY" as const)
          : ("MEASUREMENT_FACTOR" as const)
        : ingredient.productPortionId
          ? ("PRODUCT_PORTION" as const)
          : ("IDENTITY" as const);
      const baseUnitId = originalUnit?.id ?? gramUnit.id;
      const sourceData = {
        kind: "RECIPE_INGREDIENT" as const,
        sourceKey: `meal-entry:${entry.id}:ingredient:${ingredient.id}`,
        mealEntryId: entry.id,
        recipeIngredientId: ingredient.id,
        recipeId: entry.recipe.id,
        recipeTitle: entry.recipe.title,
        mealDate: entry.date,
        productId: ingredient.product.id,
        baseQuantity,
        baseMeasurementUnitId: baseUnitId,
        scaleFactor,
        conversionKind,
        conversionFactor,
        contributedQuantity,
        contributedMeasurementUnitId: contributedUnit.id,
      };
      addSource(ingredient.product, contributedUnit.id, {
        ...sourceData,
        sourceFingerprint: sha256({
          ...sourceData,
          mealDate: dateOnly(entry.date),
          entryUpdatedAt: entry.updatedAt.toISOString(),
          recipeUpdatedAt: entry.recipe.updatedAt.toISOString(),
          ingredientUpdatedAt: ingredient.updatedAt.toISOString(),
          optional: ingredient.isOptional,
          participants: entry.participants.map((item) => [
            item.id,
            item.quantityInGrams.toString(),
            item.updatedAt.toISOString(),
          ]),
        }),
      });
    }
  }

  canonicalSources.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return {
    mealPlanId: plan.id,
    fingerprint: sha256({ calculationVersion: "ingredient-weight-v1", sources: canonicalSources }),
    warnings,
    groups: [...groups.values()].sort(
      (left, right) =>
        left.groupCategoryName.localeCompare(right.groupCategoryName, "uk") ||
        left.productName.localeCompare(right.productName, "uk") ||
        left.unitId.localeCompare(right.unitId),
    ),
  };
}

const itemInclude = {
  requestedMeasurementUnit: {
    select: { id: true, code: true, symbol: true },
  },
  sources: {
    orderBy: [{ mealDateSnapshot: "asc" as const }, { sourceKey: "asc" as const }],
    select: {
      kind: true,
      mealDateSnapshot: true,
      recipeTitleSnapshot: true,
      contributedQuantity: true,
    },
  },
} satisfies Prisma.ShoppingListItemInclude;

const listInclude = {
  family: { select: { name: true } },
  mealPlan: { select: { weekStart: true } },
  items: {
    orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
    include: itemInclude,
  },
} satisfies Prisma.ShoppingListInclude;

type ListRow = Prisma.ShoppingListGetPayload<{ include: typeof listInclude }>;

function warningArray(value: Prisma.JsonValue): readonly ShoppingListWarning[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((warning): ShoppingListWarning[] => {
    if (
      typeof warning === "object" &&
      warning !== null &&
      !Array.isArray(warning) &&
      typeof warning.code === "string" &&
      typeof warning.message === "string"
    ) {
      return [
        {
          code: warning.code,
          message: warning.message,
          ...(typeof warning.sourceName === "string" ? { sourceName: warning.sourceName } : {}),
        },
      ];
    }
    return [];
  });
}

function summary(row: {
  readonly id: string;
  readonly mealPlanId: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly version: number;
  readonly revision: number;
  readonly status: ShoppingListStatus;
  readonly generatedAt: Date;
  readonly items: readonly { readonly status: ShoppingListItemStatus }[];
}): ShoppingListSummary {
  return {
    id: row.id,
    mealPlanId: row.mealPlanId,
    periodStart: dateOnly(row.periodStart),
    periodEnd: dateOnly(row.periodEnd),
    version: row.version,
    revision: row.revision,
    status: row.status,
    generatedAt: row.generatedAt.toISOString(),
    itemCount: row.items.filter((item) => item.status !== "REMOVED").length,
    purchasedCount: row.items.filter((item) => item.status === "PURCHASED").length,
    removedCount: row.items.filter((item) => item.status === "REMOVED").length,
  };
}

async function mapDetail(client: Client, row: ListRow): Promise<ShoppingListDetail> {
  let currentSourceFingerprint: string | null = null;
  try {
    currentSourceFingerprint = (
      await derive(
        client,
        row.familyId,
        row.mealPlanId,
        dateOnly(row.periodStart),
        dateOnly(row.periodEnd),
      )
    ).fingerprint;
  } catch {
    currentSourceFingerprint = null;
  }
  return {
    ...summary(row),
    familyName: row.family.name,
    weekStart: dateOnly(row.mealPlan.weekStart),
    sourceFingerprint: row.sourceFingerprint,
    currentSourceFingerprint,
    stale: currentSourceFingerprint !== null && currentSourceFingerprint !== row.sourceFingerprint,
    warnings: warningArray(row.generationWarnings),
    items: row.items.map((item) => ({
      id: item.id,
      origin: item.origin,
      status: item.status,
      productId: item.productId,
      name: item.productNameSnapshot ?? item.customName ?? "Без назви",
      category:
        item.categoryCodeSnapshot && item.categoryNameSnapshot
          ? { code: item.categoryCodeSnapshot, name: item.categoryNameSnapshot }
          : null,
      groupCategory:
        item.groupCategoryCodeSnapshot && item.groupCategoryNameSnapshot
          ? { code: item.groupCategoryCodeSnapshot, name: item.groupCategoryNameSnapshot }
          : null,
      derivedQuantity: item.derivedQuantity === null ? null : numeric(item.derivedQuantity),
      requestedQuantity: item.requestedQuantity === null ? null : numeric(item.requestedQuantity),
      unit: item.requestedMeasurementUnit,
      notes: item.notes,
      purchasedAt: item.purchasedAt?.toISOString() ?? null,
      sources: item.sources.map((source) => ({
        kind: source.kind,
        date: dateOnly(source.mealDateSnapshot),
        recipeTitle: source.recipeTitleSnapshot,
        contributedQuantity: numeric(source.contributedQuantity),
      })),
    })),
  };
}

async function readDetail(client: Client, familyId: string, listId: string) {
  const row = await client.shoppingList.findFirst({
    where: { id: listId, familyId },
    include: listInclude,
  });
  return row ? mapDetail(client, row) : null;
}

async function createSnapshot(
  client: Prisma.TransactionClient,
  input: {
    readonly familyId: string;
    readonly userId: string;
    readonly mealPlanId: string;
    readonly periodStart: string;
    readonly periodEnd: string;
    readonly version: number;
  },
): Promise<string> {
  const result = await derive(
    client,
    input.familyId,
    input.mealPlanId,
    input.periodStart,
    input.periodEnd,
  );
  const now = new Date();
  const list = await client.shoppingList.create({
    data: {
      familyId: input.familyId,
      mealPlanId: result.mealPlanId,
      periodStart: new Date(`${input.periodStart}T00:00:00.000Z`),
      periodEnd: new Date(`${input.periodEnd}T00:00:00.000Z`),
      version: input.version,
      revision: 1,
      status: "OPEN",
      sourceFingerprint: result.fingerprint,
      generationWarnings: result.warnings as unknown as Prisma.InputJsonValue,
      generatedAt: now,
      createdAt: now,
      createdByUserId: input.userId,
    },
  });

  for (const group of result.groups) {
    const derivedQuantity = group.sources.reduce(
      (sum, source) => sum + source.contributedQuantity,
      0,
    );
    const item = await client.shoppingListItem.create({
      data: {
        shoppingListId: list.id,
        origin: "GENERATED",
        status: "PENDING",
        productId: group.productId,
        productCategoryId: group.productCategoryId,
        productNameSnapshot: group.productName,
        categoryCodeSnapshot: group.categoryCode,
        categoryNameSnapshot: group.categoryName,
        groupCategoryCodeSnapshot: group.groupCategoryCode,
        groupCategoryNameSnapshot: group.groupCategoryName,
        derivedQuantity: decimal(derivedQuantity, 3),
        derivedMeasurementUnitId: group.unitId,
        requestedQuantity: decimal(derivedQuantity, 3),
        requestedMeasurementUnitId: group.unitId,
      },
    });
    await client.shoppingListItemSource.createMany({
      data: group.sources.map((source) => ({
        shoppingListItemId: item.id,
        kind: source.kind,
        sourceKey: source.sourceKey,
        sourceFingerprint: source.sourceFingerprint,
        mealEntrySnapshotId: source.mealEntryId,
        mealEntryId: source.mealEntryId,
        recipeIngredientSnapshotId: source.recipeIngredientId,
        recipeIngredientId: source.recipeIngredientId,
        recipeSnapshotId: source.recipeId,
        recipeTitleSnapshot: source.recipeTitle,
        mealDateSnapshot: source.mealDate,
        productId: source.productId,
        baseQuantity: decimal(source.baseQuantity),
        baseMeasurementUnitId: source.baseMeasurementUnitId,
        scaleFactor: decimal(source.scaleFactor, 9),
        conversionKind: source.conversionKind,
        conversionFactor: decimal(source.conversionFactor, 9),
        contributedQuantity: decimal(source.contributedQuantity),
        contributedMeasurementUnitId: source.contributedMeasurementUnitId,
        calculationVersion: "ingredient-weight-v1",
      })),
    });
  }
  return list.id;
}

async function bumpOpenList(
  transaction: Prisma.TransactionClient,
  familyId: string,
  listId: string,
  expectedRevision: number,
) {
  const result = await transaction.shoppingList.updateMany({
    where: { id: listId, familyId, status: "OPEN", revision: expectedRevision },
    data: { revision: { increment: 1 } },
  });
  if (result.count !== 1) {
    const existing = await transaction.shoppingList.findFirst({
      where: { id: listId, familyId },
      select: { status: true },
    });
    if (!existing) throw new ShoppingListNotFoundError();
    if (existing.status !== "OPEN") throw new ShoppingListReadOnlyError();
    throw new ShoppingListConflictError();
  }
}

function translateError(error: unknown): never {
  if (
    error instanceof ShoppingListConflictError ||
    error instanceof ShoppingListNotFoundError ||
    error instanceof ShoppingListReadOnlyError ||
    error instanceof ShoppingListValidationError
  ) {
    throw error;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002" || error.code === "P2034") {
      throw new ShoppingListConflictError();
    }
    if (error.code === "P2003" || error.code === "P2025") {
      throw new ShoppingListNotFoundError();
    }
  }
  throw error;
}

export function createPrismaShoppingListRepository(
  database: DatabaseClient,
): ShoppingListRepository {
  const repository: ShoppingListRepository = {
    async list(familyId) {
      const rows = await database.shoppingList.findMany({
        where: { familyId },
        orderBy: [{ periodStart: "asc" }, { version: "desc" }],
        include: { items: { select: { status: true } } },
      });
      return rows.map(summary);
    },
    async find(familyId, listId) {
      return readDetail(database, familyId, listId);
    },
    async generate(input) {
      try {
        const listId = await database.$transaction(
          async (transaction) => {
            const existing = await transaction.shoppingList.findFirst({
              where: {
                familyId: input.familyId,
                mealPlanId: input.mealPlanId,
                periodStart: new Date(`${input.periodStart}T00:00:00.000Z`),
                periodEnd: new Date(`${input.periodEnd}T00:00:00.000Z`),
                status: "OPEN",
              },
              select: { id: true },
            });
            if (existing) {
              throw new ShoppingListConflictError("An open list already exists for this period");
            }
            return createSnapshot(transaction, { ...input, version: 1 });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        const detail = await readDetail(database, input.familyId, listId);
        if (!detail) throw new ShoppingListNotFoundError();
        return detail;
      } catch (error) {
        return translateError(error);
      }
    },
    async regenerate(input) {
      try {
        const listId = await database.$transaction(
          async (transaction) => {
            const current = await transaction.shoppingList.findFirst({
              where: { id: input.listId, familyId: input.familyId },
            });
            if (!current) throw new ShoppingListNotFoundError();
            if (current.status === "ARCHIVED") throw new ShoppingListReadOnlyError();
            if (current.revision !== input.expectedRevision) throw new ShoppingListConflictError();
            const now = new Date();
            const archived = await transaction.shoppingList.updateMany({
              where: {
                id: current.id,
                familyId: input.familyId,
                revision: input.expectedRevision,
              },
              data: {
                revision: { increment: 1 },
                status: "ARCHIVED",
                archivedAt: now,
                completedAt: current.status === "COMPLETED" ? current.completedAt : null,
              },
            });
            if (archived.count !== 1) throw new ShoppingListConflictError();
            return createSnapshot(transaction, {
              familyId: input.familyId,
              userId: input.userId,
              mealPlanId: current.mealPlanId,
              periodStart: dateOnly(current.periodStart),
              periodEnd: dateOnly(current.periodEnd),
              version: current.version + 1,
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        const detail = await readDetail(database, input.familyId, listId);
        if (!detail) throw new ShoppingListNotFoundError();
        return detail;
      } catch (error) {
        return translateError(error);
      }
    },
    async updateItem(input) {
      try {
        await database.$transaction(async (transaction) => {
          await bumpOpenList(transaction, input.familyId, input.listId, input.expectedRevision);
          const item = await transaction.shoppingListItem.findFirst({
            where: { id: input.itemId, shoppingListId: input.listId },
            select: { derivedQuantity: true, origin: true },
          });
          if (!item) throw new ShoppingListNotFoundError();
          const requestedQuantity = input.resetQuantity
            ? item.derivedQuantity
            : input.requestedQuantity;
          const updated = await transaction.shoppingListItem.updateMany({
            where: { id: input.itemId, shoppingListId: input.listId, status: "PENDING" },
            data: {
              ...(requestedQuantity === undefined ? {} : { requestedQuantity }),
              ...(input.notes === undefined ? {} : { notes: input.notes?.trim() || null }),
            },
          });
          if (updated.count !== 1)
            throw new ShoppingListConflictError("Only pending items can be edited");
        });
        const detail = await readDetail(database, input.familyId, input.listId);
        if (!detail) throw new ShoppingListNotFoundError();
        return detail;
      } catch (error) {
        return translateError(error);
      }
    },
    async setItemStatus(input) {
      try {
        await database.$transaction(async (transaction) => {
          await bumpOpenList(transaction, input.familyId, input.listId, input.expectedRevision);
          const now = new Date();
          const result = await transaction.shoppingListItem.updateMany({
            where: { id: input.itemId, shoppingListId: input.listId },
            data: {
              status: input.status,
              purchasedAt: input.status === "PURCHASED" ? now : null,
              removedAt: input.status === "REMOVED" ? now : null,
            },
          });
          if (result.count !== 1) throw new ShoppingListNotFoundError();
        });
        const detail = await readDetail(database, input.familyId, input.listId);
        if (!detail) throw new ShoppingListNotFoundError();
        return detail;
      } catch (error) {
        return translateError(error);
      }
    },
    async addCatalogItem(input) {
      try {
        await database.$transaction(async (transaction) => {
          await bumpOpenList(transaction, input.familyId, input.listId, input.expectedRevision);
          const product = await transaction.product.findFirst({
            where: { id: input.productId, status: "ACTIVE", archivedAt: null },
            select: {
              id: true,
              nameUa: true,
              nameEn: true,
              defaultMeasurementUnitId: true,
              category: {
                select: {
                  id: true,
                  code: true,
                  nameUa: true,
                  parentCategory: { select: { code: true, nameUa: true } },
                },
              },
            },
          });
          if (!product) throw new ShoppingListValidationError("Product is unavailable");
          const compatible = await transaction.shoppingListItem.findFirst({
            where: {
              shoppingListId: input.listId,
              productId: input.productId,
              status: "PENDING",
              requestedMeasurementUnitId: product.defaultMeasurementUnitId,
            },
            select: { id: true, requestedQuantity: true },
          });
          if (compatible?.requestedQuantity) {
            await transaction.shoppingListItem.update({
              where: { id: compatible.id },
              data: {
                requestedQuantity: {
                  increment: input.quantity,
                },
              },
            });
            return;
          }
          const snapshot = productSnapshot(product);
          await transaction.shoppingListItem.create({
            data: {
              shoppingListId: input.listId,
              origin: "MANUAL",
              status: "PENDING",
              productId: product.id,
              productCategoryId: snapshot.productCategoryId,
              productNameSnapshot: snapshot.productName,
              categoryCodeSnapshot: snapshot.categoryCode,
              categoryNameSnapshot: snapshot.categoryName,
              groupCategoryCodeSnapshot: snapshot.groupCategoryCode,
              groupCategoryNameSnapshot: snapshot.groupCategoryName,
              requestedQuantity: input.quantity,
              requestedMeasurementUnitId: product.defaultMeasurementUnitId,
              createdByUserId: input.userId,
            },
          });
        });
        const detail = await readDetail(database, input.familyId, input.listId);
        if (!detail) throw new ShoppingListNotFoundError();
        return detail;
      } catch (error) {
        return translateError(error);
      }
    },
    async addCustomItem(input) {
      try {
        if ((input.quantity === undefined) !== (input.measurementUnitId === undefined)) {
          throw new ShoppingListValidationError(
            "Quantity and measurement unit must be provided together",
          );
        }
        await database.$transaction(async (transaction) => {
          await bumpOpenList(transaction, input.familyId, input.listId, input.expectedRevision);
          await transaction.shoppingListItem.create({
            data: {
              shoppingListId: input.listId,
              origin: "MANUAL",
              status: "PENDING",
              customName: input.name.trim(),
              ...(input.quantity === undefined
                ? {}
                : {
                    requestedQuantity: input.quantity,
                    requestedMeasurementUnitId: input.measurementUnitId as string,
                  }),
              notes: input.notes?.trim() || null,
              createdByUserId: input.userId,
            },
          });
        });
        const detail = await readDetail(database, input.familyId, input.listId);
        if (!detail) throw new ShoppingListNotFoundError();
        return detail;
      } catch (error) {
        return translateError(error);
      }
    },
    async setStatus(input) {
      try {
        const now = new Date();
        const result = await database.shoppingList.updateMany({
          where: {
            id: input.listId,
            familyId: input.familyId,
            revision: input.expectedRevision,
            status: input.status === "OPEN" ? "COMPLETED" : { not: "ARCHIVED" },
          },
          data: {
            revision: { increment: 1 },
            status: input.status,
            completedAt: input.status === "COMPLETED" ? now : null,
            archivedAt: input.status === "ARCHIVED" ? now : null,
          },
        });
        if (result.count !== 1) throw new ShoppingListConflictError();
        const detail = await readDetail(database, input.familyId, input.listId);
        if (!detail) throw new ShoppingListNotFoundError();
        return detail;
      } catch (error) {
        return translateError(error);
      }
    },
  };
  return Object.freeze(repository);
}
