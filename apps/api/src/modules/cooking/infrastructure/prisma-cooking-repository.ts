import { createHash } from "node:crypto";

import { Prisma, type DatabaseClient } from "@mealmind/db";

import {
  CookingConflictError,
  CookingNotFoundError,
  CookingValidationError,
} from "../application/cooking-errors.js";
import type {
  CookingActor,
  CookingRepository,
  CookingSessionView,
} from "../domain/cooking-repository.js";

const CALCULATOR_VERSION = "cooking-ingredient-sum-v1";

const sessionInclude = {
  mealEntries: {
    orderBy: [{ dateSnapshot: "asc" }, { mealEntryId: "asc" }],
    include: { mealEntry: { select: { removedAt: true } } },
  },
  ingredients: {
    orderBy: [{ position: "asc" }, { id: "asc" }],
    include: {
      plannedMeasurementUnit: { select: { symbol: true } },
      actualMeasurementUnit: { select: { symbol: true } },
    },
  },
  steps: { orderBy: [{ position: "asc" }, { id: "asc" }] },
  nutrients: {
    include: { nutrient: { select: { code: true, nameUa: true, unit: true } } },
    orderBy: [{ nutrient: { sortOrder: "asc" } }, { nutrientId: "asc" }],
  },
} satisfies Prisma.CookingSessionInclude;

type SessionRow = Prisma.CookingSessionGetPayload<{ include: typeof sessionInclude }>;
type Transaction = Prisma.TransactionClient;

interface CalculatedNutrient {
  nutrientId: string;
  code: string;
  name: string;
  unit: string;
  valueTotal: number;
  completeness: "COMPLETE" | "PARTIAL" | "UNVERIFIED";
}

function number(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function fingerprint(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function actorWhere(actor: CookingActor): Prisma.CookingSessionWhereInput {
  return {
    familyId: actor.familyId,
    ...(actor.role === "OWNER"
      ? {}
      : {
          mealEntries: {
            some: {
              mealEntry: {
                participants: {
                  some: { familyMember: { personProfile: { userId: actor.userId } } },
                },
              },
            },
          },
        }),
  };
}

async function sessionRow(
  database: DatabaseClient | Transaction,
  actor: CookingActor,
  sessionId: string,
): Promise<SessionRow> {
  const row = await database.cookingSession.findFirst({
    where: { id: sessionId, ...actorWhere(actor) },
    include: sessionInclude,
  });
  if (!row) throw new CookingNotFoundError();
  return row;
}

async function gramUnit(database: DatabaseClient | Transaction): Promise<string> {
  const unit = await database.measurementUnit.findUnique({
    where: { code: "g" },
    select: { id: true },
  });
  if (!unit) throw new CookingValidationError("Gram measurement unit is unavailable");
  return unit.id;
}

async function product(database: DatabaseClient | Transaction, productId: string) {
  const row = await database.product.findFirst({
    where: { id: productId, status: "ACTIVE", archivedAt: null },
    select: { id: true, nameUa: true, nameEn: true },
  });
  if (!row) throw new CookingValidationError("Product is unavailable");
  return { id: row.id, name: row.nameUa ?? row.nameEn };
}

async function calculateNutrition(
  database: DatabaseClient | Transaction,
  sessionId: string,
): Promise<CalculatedNutrient[]> {
  const ingredients = await database.cookingSessionIngredient.findMany({
    where: {
      cookingSessionId: sessionId,
      status: { in: ["USED", "SUBSTITUTED"] },
      actualProductId: { not: null },
      actualGramWeight: { gt: 0 },
    },
    select: {
      actualProductId: true,
      actualGramWeight: true,
      actualProduct: { select: { verificationStatus: true } },
    },
  });
  const nutrients = await database.nutrient.findMany({
    where: { isActive: true, OR: [{ displayLevel: "BASIC" }, { isTargetable: true }] },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true, code: true, nameUa: true, unit: true },
  });
  const productIds = [
    ...new Set(ingredients.flatMap((item) => (item.actualProductId ? [item.actualProductId] : []))),
  ];
  const values =
    productIds.length === 0
      ? []
      : await database.productNutrient.findMany({
          where: {
            productId: { in: productIds },
            nutrientId: { in: nutrients.map((item) => item.id) },
          },
          select: { productId: true, nutrientId: true, valuePer100g: true },
        });
  const valueByKey = new Map(
    values.map((value) => [
      `${value.productId}:${value.nutrientId}`,
      value.valuePer100g.toNumber(),
    ]),
  );
  const containsUnverified = ingredients.some(
    (item) => item.actualProduct?.verificationStatus !== "VERIFIED",
  );

  return nutrients.map((nutrient) => {
    let valueTotal = 0;
    let covered = 0;
    for (const ingredient of ingredients) {
      if (!ingredient.actualProductId || !ingredient.actualGramWeight) continue;
      const valuePer100g = valueByKey.get(`${ingredient.actualProductId}:${nutrient.id}`);
      if (valuePer100g === undefined) continue;
      covered += 1;
      valueTotal += (ingredient.actualGramWeight.toNumber() * valuePer100g) / 100;
    }
    const completeness =
      covered < ingredients.length ? "PARTIAL" : containsUnverified ? "UNVERIFIED" : "COMPLETE";
    return {
      nutrientId: nutrient.id,
      code: nutrient.code,
      name: nutrient.nameUa,
      unit: nutrient.unit,
      valueTotal,
      completeness,
    };
  });
}

function nutritionCompleteness(
  items: readonly { completeness: "COMPLETE" | "PARTIAL" | "UNVERIFIED" }[],
) {
  if (items.some((item) => item.completeness === "PARTIAL")) return "PARTIAL" as const;
  if (items.some((item) => item.completeness === "UNVERIFIED")) return "UNVERIFIED" as const;
  return "COMPLETE" as const;
}

async function present(
  database: DatabaseClient | Transaction,
  row: SessionRow,
): Promise<CookingSessionView> {
  const calculated =
    row.status === "COMPLETED"
      ? row.nutrients.map((item) => ({
          nutrientId: item.nutrientId,
          code: item.nutrient.code,
          name: item.nutrient.nameUa,
          unit: item.nutrient.unit,
          valueTotal: item.valueTotal.toNumber(),
          completeness: item.completeness,
        }))
      : await calculateNutrition(database, row.id);
  const actualYield = number(row.actualYieldWeightG);
  const plannedYield = number(row.plannedYieldWeightG) ?? 0;
  const basis =
    actualYield !== null ? "ACTUAL" : plannedYield > 0 ? "PLANNED_ESTIMATE" : "UNAVAILABLE";
  const yieldWeight = actualYield ?? (plannedYield > 0 ? plannedYield : null);
  const resolvedIngredients = row.ingredients.filter((item) => item.status !== "PENDING").length;
  const resolvedSteps = row.steps.filter((item) => item.status !== "PENDING").length;
  const hasCookingProgress =
    resolvedIngredients > 0 ||
    resolvedSteps > 0 ||
    row.ingredients.some((item) => item.source === "ADDED_DURING_COOKING") ||
    actualYield !== null;

  return Object.freeze({
    id: row.id,
    recipeId: row.recipeId,
    status: row.status,
    revision: row.revision,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    recipe: Object.freeze({
      title: row.recipeTitleSnapshot,
      summary: row.recipeSummarySnapshot,
      description: row.recipeDescriptionSnapshot,
      difficulty: row.recipeDifficultySnapshot,
      prepTimeMin: row.prepTimeMinSnapshot,
      cookTimeMin: row.cookTimeMinSnapshot,
      restTimeMin: row.restTimeMinSnapshot,
      imageObjectPath: row.imageObjectPathSnapshot,
    }),
    planEntries: Object.freeze(
      row.mealEntries.map((item) =>
        Object.freeze({
          id: item.mealEntryId,
          date: dateOnly(item.dateSnapshot),
          mealType: item.mealTypeNameSnapshot,
          plannedDemandWeightG: item.plannedDemandWeightG.toNumber(),
          removed: item.mealEntry.removedAt !== null,
        }),
      ),
    ),
    ingredients: Object.freeze(
      row.ingredients.map((item) =>
        Object.freeze({
          id: item.id,
          source: item.source,
          position: item.position,
          status: item.status,
          planned:
            item.source === "ADDED_DURING_COOKING"
              ? null
              : Object.freeze({
                  productId: item.plannedProductId!,
                  productName: item.productNameSnapshot!,
                  quantity: item.plannedQuantity!.toNumber(),
                  unit: item.plannedMeasurementUnit?.symbol ?? null,
                  gramWeight: number(item.plannedGramWeight),
                }),
          actual:
            !item.actualProductId || !item.actualProductNameSnapshot || !item.actualQuantity
              ? null
              : Object.freeze({
                  productId: item.actualProductId,
                  productName: item.actualProductNameSnapshot,
                  quantity: item.actualQuantity.toNumber(),
                  unit: item.actualMeasurementUnit?.symbol ?? null,
                  gramWeight: number(item.actualGramWeight),
                }),
        }),
      ),
    ),
    steps: Object.freeze(
      row.steps.map((item) =>
        Object.freeze({
          id: item.id,
          position: item.position,
          instruction: item.instructionSnapshot,
          timerSeconds: item.timerSecondsSnapshot,
          status: item.status,
        }),
      ),
    ),
    progress: Object.freeze({
      resolvedIngredients,
      totalIngredients: row.ingredients.length,
      resolvedSteps,
      totalSteps: row.steps.length,
    }),
    nutrition: Object.freeze({
      basis,
      completeness: nutritionCompleteness(calculated),
      nutrients: Object.freeze(
        calculated.map((item) =>
          Object.freeze({
            nutrientId: item.nutrientId,
            code: item.code,
            name: item.name,
            unit: item.unit,
            valueTotal: item.valueTotal,
            valuePer100g: yieldWeight === null ? null : (item.valueTotal * 100) / yieldWeight,
          }),
        ),
      ),
    }),
    yield: Object.freeze({
      plannedWeightG: plannedYield,
      actualWeightG: actualYield,
      method: row.yieldMeasurementMethod,
      tareWeightG: number(row.containerTareWeightG),
      grossWeightG: number(row.containerGrossWeightG),
    }),
    hasCookingProgress,
    canComplete:
      row.status === "IN_PROGRESS" &&
      resolvedIngredients === row.ingredients.length &&
      resolvedSteps === row.steps.length,
  });
}

async function bumpRevision(
  tx: Transaction,
  sessionId: string,
  expectedRevision: number,
): Promise<void> {
  const result = await tx.cookingSession.updateMany({
    where: { id: sessionId, status: "IN_PROGRESS", revision: expectedRevision },
    data: { revision: { increment: 1 } },
  });
  if (result.count !== 1)
    throw new CookingConflictError("Cooking session was changed by another request");
}

async function ensureMutable(
  tx: Transaction,
  actor: CookingActor,
  sessionId: string,
  expectedRevision: number,
) {
  const row = await tx.cookingSession.findFirst({
    where: {
      id: sessionId,
      status: "IN_PROGRESS",
      revision: expectedRevision,
      ...actorWhere(actor),
    },
    select: { id: true },
  });
  if (!row) {
    const exists = await tx.cookingSession.findFirst({
      where: { id: sessionId, ...actorWhere(actor) },
      select: { revision: true, status: true },
    });
    if (!exists) throw new CookingNotFoundError();
    throw new CookingConflictError(
      exists.status === "IN_PROGRESS"
        ? "Cooking session was changed by another request"
        : "Completed or cancelled cooking session is immutable",
    );
  }
}

export function createPrismaCookingRepository(database: DatabaseClient): CookingRepository {
  const repository: CookingRepository = {
    async start(actor, input) {
      const canonical = [...input.mealEntries].sort((a, b) => a.id.localeCompare(b.id));
      const requestFingerprint = fingerprint(canonical);
      const sessionId = await database.$transaction(
        async (tx) => {
          const replay = await tx.cookingSession.findUnique({
            where: { startRequestId: input.requestId },
            select: { id: true, familyId: true, startRequestFingerprint: true },
          });
          if (replay) {
            if (
              replay.familyId !== actor.familyId ||
              replay.startRequestFingerprint !== requestFingerprint
            )
              throw new CookingConflictError("Cooking request id was reused with different input");
            return replay.id;
          }

          const entries = await tx.mealEntry.findMany({
            where: {
              id: { in: canonical.map((item) => item.id) },
              removedAt: null,
              mealPlan: { familyId: actor.familyId },
            },
            include: {
              mealPlan: { select: { familyId: true } },
              mealType: { select: { nameUa: true } },
              participants: {
                include: {
                  familyMember: { select: { personProfile: { select: { userId: true } } } },
                },
              },
              cookingAllocations: {
                where: { releasedAt: null },
                select: { cookingSessionId: true, cookingSession: { select: { status: true } } },
              },
            },
          });
          if (entries.length !== canonical.length) throw new CookingNotFoundError();
          const requested = new Map(canonical.map((item) => [item.id, item.expectedRevision]));
          if (entries.some((entry) => entry.revision !== requested.get(entry.id)))
            throw new CookingConflictError(
              "One or more meal entries changed before cooking started",
            );
          if (entries.some((entry) => !entry.recipeId))
            throw new CookingValidationError("Cooking mode requires recipe meal entries");
          const recipeId = entries[0]!.recipeId!;
          if (entries.some((entry) => entry.recipeId !== recipeId))
            throw new CookingValidationError("One cooking session can include only one recipe");
          if (
            actor.role === "MEMBER" &&
            entries.some(
              (entry) =>
                !entry.participants.some(
                  (participant) => participant.familyMember.personProfile.userId === actor.userId,
                ),
            )
          )
            throw new CookingNotFoundError();

          const allocated = entries.flatMap((entry) => entry.cookingAllocations);
          if (allocated.length > 0) {
            const ids = [...new Set(allocated.map((item) => item.cookingSessionId))];
            if (
              ids.length === 1 &&
              allocated.length === entries.length &&
              allocated.every((item) => item.cookingSession.status === "IN_PROGRESS")
            )
              return ids[0]!;
            throw new CookingConflictError(
              "One or more meal entries already belong to a cooking session",
            );
          }

          const recipe = await tx.recipe.findUnique({
            where: { id: recipeId },
            include: {
              ingredients: {
                orderBy: [{ position: "asc" }],
                include: { product: { select: { nameUa: true, nameEn: true } } },
              },
              steps: { orderBy: [{ position: "asc" }] },
              media: {
                where: { kind: "STORED_IMAGE", status: "ACTIVE", storageObjectPath: { not: null } },
                orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
                take: 1,
                select: { storageObjectPath: true },
              },
            },
          });
          if (!recipe) throw new CookingNotFoundError();
          const recipeYieldWeightG =
            recipe.yieldWeightG?.toNumber() ??
            recipe.ingredients.reduce(
              (sum, ingredient) => sum + (ingredient.gramWeight?.toNumber() ?? 0),
              0,
            );
          if (recipeYieldWeightG <= 0)
            throw new CookingValidationError("Recipe yield is unavailable");
          const allocations = entries.map((entry) => ({
            entry,
            demand: entry.participants.reduce(
              (sum, participant) => sum + participant.quantityInGrams.toNumber(),
              0,
            ),
          }));
          if (allocations.some((item) => item.demand <= 0))
            throw new CookingValidationError("Meal entry demand must be positive");
          const plannedYield = allocations.reduce((sum, item) => sum + item.demand, 0);
          const scale = plannedYield / recipeYieldWeightG;
          const now = new Date();
          const created = await tx.cookingSession.create({
            data: {
              startRequestId: input.requestId,
              startRequestFingerprint: requestFingerprint,
              familyId: actor.familyId,
              recipeId,
              startedByUserId: actor.userId,
              recipeTitleSnapshot: recipe.title,
              recipeSummarySnapshot: recipe.summary,
              recipeDescriptionSnapshot: recipe.description,
              recipeDifficultySnapshot: recipe.difficulty,
              prepTimeMinSnapshot: recipe.prepTimeMin,
              cookTimeMinSnapshot: recipe.cookTimeMin,
              restTimeMinSnapshot: recipe.restTimeMin,
              imageObjectPathSnapshot: recipe.media[0]?.storageObjectPath ?? null,
              plannedYieldWeightG: plannedYield,
              startedAt: now,
              mealEntries: {
                create: allocations.map(({ entry, demand }) => ({
                  mealEntryId: entry.id,
                  plannedDemandWeightG: demand,
                  dateSnapshot: entry.date,
                  mealTypeNameSnapshot: entry.mealType.nameUa,
                })),
              },
              ingredients: {
                create: recipe.ingredients.map((ingredient) => ({
                  recipeIngredientId: ingredient.id,
                  source: "RECIPE",
                  position: ingredient.position,
                  productNameSnapshot: ingredient.product.nameUa ?? ingredient.product.nameEn,
                  plannedProductId: ingredient.productId,
                  plannedQuantity: ingredient.quantity.toNumber() * scale,
                  plannedMeasurementUnitId: ingredient.measurementUnitId,
                  plannedGramWeight: ingredient.gramWeight
                    ? ingredient.gramWeight.toNumber() * scale
                    : null,
                })),
              },
              steps: {
                create: recipe.steps.map((step) => ({
                  recipeStepId: step.id,
                  position: step.position,
                  instructionSnapshot: step.instruction,
                  timerSecondsSnapshot: step.timerSeconds,
                })),
              },
            },
            select: { id: true },
          });
          return created.id;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return present(database, await sessionRow(database, actor, sessionId));
    },

    async find(actor, sessionId) {
      return present(database, await sessionRow(database, actor, sessionId));
    },

    async updateIngredient(actor, sessionId, ingredientId, input) {
      await database.$transaction(async (tx) => {
        await ensureMutable(tx, actor, sessionId, input.expectedRevision);
        const ingredient = await tx.cookingSessionIngredient.findFirst({
          where: { id: ingredientId, cookingSessionId: sessionId },
          select: {
            source: true,
            plannedProductId: true,
            productNameSnapshot: true,
            plannedQuantity: true,
            plannedMeasurementUnitId: true,
            plannedGramWeight: true,
          },
        });
        if (!ingredient || ingredient.source !== "RECIPE") throw new CookingNotFoundError();
        const now = new Date();
        if (input.status === "OMITTED") {
          await tx.cookingSessionIngredient.update({
            where: { id: ingredientId },
            data: {
              status: "OMITTED",
              actualProductId: null,
              actualProductNameSnapshot: null,
              actualQuantity: null,
              actualMeasurementUnitId: null,
              actualGramWeight: null,
              resolvedByUserId: actor.userId,
              resolvedAt: now,
            },
          });
        } else if (input.status === "USED") {
          if (
            !ingredient.plannedProductId ||
            !ingredient.productNameSnapshot ||
            !ingredient.plannedQuantity
          )
            throw new CookingValidationError("Planned ingredient snapshot is incomplete");
          const quantityGrams = input.quantityGrams;
          const edited = quantityGrams !== undefined;
          await tx.cookingSessionIngredient.update({
            where: { id: ingredientId },
            data: {
              status: "USED",
              actualProductId: ingredient.plannedProductId,
              actualProductNameSnapshot: ingredient.productNameSnapshot,
              actualQuantity: edited ? quantityGrams : ingredient.plannedQuantity,
              actualMeasurementUnitId: edited
                ? await gramUnit(tx)
                : ingredient.plannedMeasurementUnitId,
              actualGramWeight: edited ? quantityGrams : ingredient.plannedGramWeight,
              resolvedByUserId: actor.userId,
              resolvedAt: now,
            },
          });
        } else {
          if (!input.productId || !input.quantityGrams)
            throw new CookingValidationError("Substitution product and gram weight are required");
          const replacement = await product(tx, input.productId);
          if (replacement.id === ingredient.plannedProductId)
            throw new CookingValidationError("Substitution must use a different product");
          await tx.cookingSessionIngredient.update({
            where: { id: ingredientId },
            data: {
              status: "SUBSTITUTED",
              actualProductId: replacement.id,
              actualProductNameSnapshot: replacement.name,
              actualQuantity: input.quantityGrams,
              actualMeasurementUnitId: await gramUnit(tx),
              actualGramWeight: input.quantityGrams,
              resolvedByUserId: actor.userId,
              resolvedAt: now,
            },
          });
        }
        await bumpRevision(tx, sessionId, input.expectedRevision);
      });
      return present(database, await sessionRow(database, actor, sessionId));
    },

    async addIngredient(actor, sessionId, input) {
      await database.$transaction(async (tx) => {
        await ensureMutable(tx, actor, sessionId, input.expectedRevision);
        const added = await product(tx, input.productId);
        const last = await tx.cookingSessionIngredient.aggregate({
          where: { cookingSessionId: sessionId },
          _max: { position: true },
        });
        await tx.cookingSessionIngredient.create({
          data: {
            cookingSessionId: sessionId,
            source: "ADDED_DURING_COOKING",
            position: (last._max.position ?? -1) + 1,
            productNameSnapshot: null,
            plannedProductId: null,
            plannedQuantity: null,
            status: "USED",
            actualProductId: added.id,
            actualProductNameSnapshot: added.name,
            actualQuantity: input.quantityGrams,
            actualMeasurementUnitId: await gramUnit(tx),
            actualGramWeight: input.quantityGrams,
            resolvedByUserId: actor.userId,
            resolvedAt: new Date(),
          },
        });
        await bumpRevision(tx, sessionId, input.expectedRevision);
      });
      return present(database, await sessionRow(database, actor, sessionId));
    },

    async deleteIngredient(actor, sessionId, ingredientId, expectedRevision) {
      await database.$transaction(async (tx) => {
        await ensureMutable(tx, actor, sessionId, expectedRevision);
        const deleted = await tx.cookingSessionIngredient.deleteMany({
          where: { id: ingredientId, cookingSessionId: sessionId, source: "ADDED_DURING_COOKING" },
        });
        if (deleted.count !== 1) throw new CookingNotFoundError();
        await bumpRevision(tx, sessionId, expectedRevision);
      });
      return present(database, await sessionRow(database, actor, sessionId));
    },

    async updateStep(actor, sessionId, stepId, input) {
      await database.$transaction(async (tx) => {
        await ensureMutable(tx, actor, sessionId, input.expectedRevision);
        const updated = await tx.cookingSessionStep.updateMany({
          where: { id: stepId, cookingSessionId: sessionId },
          data: { status: input.status, resolvedByUserId: actor.userId, resolvedAt: new Date() },
        });
        if (updated.count !== 1) throw new CookingNotFoundError();
        await bumpRevision(tx, sessionId, input.expectedRevision);
      });
      return present(database, await sessionRow(database, actor, sessionId));
    },

    async updateYield(actor, sessionId, input) {
      await database.$transaction(async (tx) => {
        await ensureMutable(tx, actor, sessionId, input.expectedRevision);
        if (
          input.method === "CONTAINER_DIFFERENCE" &&
          (!input.grossWeightG ||
            input.tareWeightG === undefined ||
            input.grossWeightG <= input.tareWeightG)
        )
          throw new CookingValidationError("Gross weight must be greater than tare weight");
        const data =
          input.method === null
            ? {
                yieldMeasurementMethod: null,
                actualYieldWeightG: null,
                containerTareWeightG: null,
                containerGrossWeightG: null,
              }
            : input.method === "DIRECT"
              ? {
                  yieldMeasurementMethod: "DIRECT" as const,
                  actualYieldWeightG: input.actualWeightG!,
                  containerTareWeightG: null,
                  containerGrossWeightG: null,
                }
              : {
                  yieldMeasurementMethod: "CONTAINER_DIFFERENCE" as const,
                  actualYieldWeightG: input.grossWeightG! - input.tareWeightG!,
                  containerTareWeightG: input.tareWeightG!,
                  containerGrossWeightG: input.grossWeightG!,
                };
        await tx.cookingSession.update({
          where: { id: sessionId },
          data: { ...data, revision: { increment: 1 } },
        });
      });
      return present(database, await sessionRow(database, actor, sessionId));
    },

    async complete(actor, sessionId, input) {
      await database.$transaction(async (tx) => {
        await ensureMutable(tx, actor, sessionId, input.expectedRevision);
        const pendingIngredients = await tx.cookingSessionIngredient.count({
          where: { cookingSessionId: sessionId, status: "PENDING" },
        });
        const pendingSteps = await tx.cookingSessionStep.count({
          where: { cookingSessionId: sessionId, status: "PENDING" },
        });
        if ((pendingIngredients > 0 || pendingSteps > 0) && !input.resolvePending)
          throw new CookingConflictError("Cooking session has pending items", {
            pendingIngredients,
            pendingSteps,
          });
        const now = new Date();
        if (input.resolvePending) {
          const pending = await tx.cookingSessionIngredient.findMany({
            where: { cookingSessionId: sessionId, status: "PENDING" },
          });
          for (const ingredient of pending) {
            await tx.cookingSessionIngredient.update({
              where: { id: ingredient.id },
              data: {
                status: "USED",
                actualProductId: ingredient.plannedProductId,
                actualProductNameSnapshot: ingredient.productNameSnapshot,
                actualQuantity: ingredient.plannedQuantity,
                actualMeasurementUnitId: ingredient.plannedMeasurementUnitId,
                actualGramWeight: ingredient.plannedGramWeight,
                resolvedByUserId: actor.userId,
                resolvedAt: now,
              },
            });
          }
          await tx.cookingSessionStep.updateMany({
            where: { cookingSessionId: sessionId, status: "PENDING" },
            data: { status: "COMPLETED", resolvedByUserId: actor.userId, resolvedAt: now },
          });
        }
        const nutrients = await calculateNutrition(tx, sessionId);
        await tx.cookingSessionNutrient.createMany({
          data: nutrients.map((item) => ({
            cookingSessionId: sessionId,
            nutrientId: item.nutrientId,
            valueTotal: item.valueTotal,
            calculationMethod: "ACTUAL_INGREDIENT_SUM",
            completeness: item.completeness,
            calculatorVersion: CALCULATOR_VERSION,
            calculatedAt: now,
          })),
        });
        const current = await tx.cookingSession.findUniqueOrThrow({
          where: { id: sessionId },
          select: { actualYieldWeightG: true, plannedYieldWeightG: true },
        });
        await tx.cookingSession.update({
          where: { id: sessionId },
          data: {
            status: "COMPLETED",
            completedByUserId: actor.userId,
            completedAt: now,
            yieldBasis: current.actualYieldWeightG
              ? "ACTUAL"
              : current.plannedYieldWeightG
                ? "PLANNED_ESTIMATE"
                : "UNAVAILABLE",
            revision: { increment: 1 },
          },
        });
        const allocations = await tx.cookingSessionMealEntry.findMany({
          where: { cookingSessionId: sessionId, releasedAt: null },
          select: { mealEntryId: true },
        });
        await tx.mealEntry.updateMany({
          where: { id: { in: allocations.map((item) => item.mealEntryId) } },
          data: { preparedAt: now, preparedByUserId: actor.userId, revision: { increment: 1 } },
        });
      });
      return present(database, await sessionRow(database, actor, sessionId));
    },

    async cancel(actor, sessionId, expectedRevision) {
      await database.$transaction(async (tx) => {
        await ensureMutable(tx, actor, sessionId, expectedRevision);
        const now = new Date();
        await tx.cookingSessionMealEntry.updateMany({
          where: { cookingSessionId: sessionId, releasedAt: null },
          data: { releasedAt: now },
        });
        await tx.cookingSession.update({
          where: { id: sessionId },
          data: {
            status: "CANCELLED",
            cancelledByUserId: actor.userId,
            cancelledAt: now,
            revision: { increment: 1 },
          },
        });
      });
      return present(database, await sessionRow(database, actor, sessionId));
    },
  };
  return Object.freeze(repository);
}
