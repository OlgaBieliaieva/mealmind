import type { DatabaseClient } from "@mealmind/db";
import type {
  ConsumptionDashboard,
  ConsumptionRepository,
  DashboardMember,
  DiaryDay,
  DiaryItem,
  DiaryMember,
  DiaryNutrient,
} from "../domain/consumption-repository.js";
import {
  ConsumptionConflictError,
  ConsumptionForbiddenError,
  ConsumptionNotFoundError,
  ConsumptionValidationError,
} from "../application/consumption-errors.js";

const CALCULATOR_VERSION = "consumption-v1";
const CARD_NUTRIENTS = ["energy_kcal", "protein", "total_fat", "carbohydrate"] as const;

function dateValue(value: string): Date {
  const result = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(result.getTime()) || result.toISOString().slice(0, 10) !== value) {
    throw new ConsumptionValidationError("Date is invalid");
  }
  return result;
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function personName(profile: { firstName: string; lastName: string | null }): string {
  return [profile.firstName, profile.lastName].filter(Boolean).join(" ");
}

type Snapshot = readonly {
  nutrientId: string;
  code: string;
  name: string;
  unit: string;
  value: number;
  calculationMethod: "PRODUCT_PER_100G" | "RECIPE_TOTAL" | "COOKING_SESSION_TOTAL";
  completeness: "COMPLETE" | "PARTIAL" | "UNVERIFIED";
}[];

type NumericValue = { toNumber(): number };
type CardNutrition = {
  readonly energy: number | null;
  readonly protein: number | null;
  readonly fat: number | null;
  readonly carbohydrate: number | null;
};

function cardNutrition(
  values: readonly { readonly nutrient: { readonly code: string }; readonly value: NumericValue }[],
): CardNutrition {
  const byCode = new Map(values.map((item) => [item.nutrient.code, item.value.toNumber()]));
  return {
    energy: byCode.get("energy_kcal") ?? null,
    protein: byCode.get("protein") ?? null,
    fat: byCode.get("total_fat") ?? null,
    carbohydrate: byCode.get("carbohydrate") ?? null,
  };
}

function scaleNutrition(value: CardNutrition, factor: number): CardNutrition {
  return {
    energy: value.energy === null ? null : value.energy * factor,
    protein: value.protein === null ? null : value.protein * factor,
    fat: value.fat === null ? null : value.fat * factor,
    carbohydrate: value.carbohydrate === null ? null : value.carbohydrate * factor,
  };
}

export function createPrismaConsumptionRepository(database: DatabaseClient): ConsumptionRepository {
  async function authorizeMember(
    familyId: string,
    role: "OWNER" | "MEMBER",
    userId: string,
    memberId: string,
  ) {
    const member = await database.familyMember.findFirst({
      where: { id: memberId, familyId, archivedAt: null },
      select: { id: true, personProfile: { select: { userId: true } } },
    });
    if (!member) throw new ConsumptionNotFoundError();
    if (role !== "OWNER" && member.personProfile.userId !== userId)
      throw new ConsumptionForbiddenError();
    return member;
  }

  async function snapshot(input: {
    productId: string | null;
    recipeId: string | null;
    cookingSessionId: string | null;
    quantityGrams: number;
  }): Promise<Snapshot> {
    if (input.cookingSessionId) {
      const session = await database.cookingSession.findFirst({
        where: { id: input.cookingSessionId, status: "COMPLETED", actualYieldWeightG: { gt: 0 } },
        select: {
          actualYieldWeightG: true,
          nutrients: {
            where: {
              nutrient: {
                isActive: true,
                OR: [{ displayLevel: "BASIC" }, { isTargetable: true }],
              },
            },
            select: {
              valueTotal: true,
              completeness: true,
              nutrient: { select: { id: true, code: true, nameUa: true, unit: true } },
            },
          },
        },
      });
      if (session?.actualYieldWeightG) {
        const factor = input.quantityGrams / session.actualYieldWeightG.toNumber();
        return session.nutrients.map((item) => ({
          nutrientId: item.nutrient.id,
          code: item.nutrient.code,
          name: item.nutrient.nameUa,
          unit: item.nutrient.unit,
          value: item.valueTotal.toNumber() * factor,
          calculationMethod: "COOKING_SESSION_TOTAL",
          completeness: item.completeness,
        }));
      }
    }
    if (input.productId) {
      const product = await database.product.findFirst({
        where: { id: input.productId, status: "ACTIVE" },
        select: {
          nutrients: {
            where: {
              nutrient: {
                isActive: true,
                OR: [{ displayLevel: "BASIC" }, { isTargetable: true }],
              },
            },
            select: {
              valuePer100g: true,
              valueType: true,
              nutrient: { select: { id: true, code: true, nameUa: true, unit: true } },
            },
          },
        },
      });
      if (!product) throw new ConsumptionNotFoundError();
      return product.nutrients.map((item) => ({
        nutrientId: item.nutrient.id,
        code: item.nutrient.code,
        name: item.nutrient.nameUa,
        unit: item.nutrient.unit,
        value: (item.valuePer100g.toNumber() * input.quantityGrams) / 100,
        calculationMethod: "PRODUCT_PER_100G",
        completeness:
          item.valueType === "ANALYTICAL"
            ? "COMPLETE"
            : item.valueType === "UNKNOWN"
              ? "UNVERIFIED"
              : "PARTIAL",
      }));
    }
    if (input.recipeId) {
      const recipe = await database.recipe.findFirst({
        where: { id: input.recipeId, status: "PUBLISHED" },
        select: {
          yieldWeightG: true,
          nutrients: {
            where: {
              nutrient: {
                isActive: true,
                OR: [{ displayLevel: "BASIC" }, { isTargetable: true }],
              },
            },
            select: {
              valueTotal: true,
              completeness: true,
              nutrient: { select: { id: true, code: true, nameUa: true, unit: true } },
            },
          },
        },
      });
      if (!recipe) throw new ConsumptionNotFoundError();
      if (!recipe.yieldWeightG || recipe.yieldWeightG.lessThanOrEqualTo(0)) return [];
      const factor = input.quantityGrams / recipe.yieldWeightG.toNumber();
      return recipe.nutrients.map((item) => ({
        nutrientId: item.nutrient.id,
        code: item.nutrient.code,
        name: item.nutrient.nameUa,
        unit: item.nutrient.unit,
        value: item.valueTotal.toNumber() * factor,
        calculationMethod: "RECIPE_TOTAL",
        completeness: item.completeness,
      }));
    }
    throw new ConsumptionValidationError("Exactly one food source is required");
  }

  function nutrientCreates(values: Snapshot) {
    const calculatedAt = new Date();
    return values.map((item) => ({
      nutrientId: item.nutrientId,
      value: item.value,
      calculationMethod: item.calculationMethod,
      completeness: item.completeness,
      calculatorVersion: CALCULATOR_VERSION,
      calculatedAt,
    }));
  }

  const repository: ConsumptionRepository = {
    async participantDate(familyId, participantId) {
      const participant = await database.mealEntryParticipant.findFirst({
        where: { id: participantId, familyMember: { familyId } },
        select: { mealEntry: { select: { date: true } } },
      });
      if (!participant) throw new ConsumptionNotFoundError();
      return isoDate(participant.mealEntry.date);
    },

    async readDay(input): Promise<DiaryDay> {
      const localDate = dateValue(input.date);
      const members = await database.familyMember.findMany({
        where: {
          familyId: input.familyId,
          archivedAt: null,
          ...(input.role === "MEMBER" ? { personProfile: { userId: input.userId } } : {}),
        },
        orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          personProfile: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              mealTypePreferences: {
                where: { mealType: { isActive: true } },
                orderBy: { mealType: { sortOrder: "asc" } },
                select: {
                  mealType: { select: { id: true, nameUa: true, sortOrder: true } },
                },
              },
              nutrientTargetSets: {
                orderBy: { effectiveFrom: "desc" },
                take: 1,
                select: {
                  targets: {
                    orderBy: { nutrient: { sortOrder: "asc" } },
                    select: {
                      minimumValue: true,
                      targetValue: true,
                      maximumValue: true,
                      nutrient: { select: { code: true, nameUa: true, unit: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });
      const memberIds = members.map((member) => member.id);
      const candidates = await database.mealEntryParticipant.findMany({
        where: {
          familyMemberId: { in: memberIds },
          mealEntry: { date: localDate, preparedAt: { not: null } },
        },
        orderBy: [
          { mealEntry: { mealType: { sortOrder: "asc" } } },
          { mealEntry: { position: "asc" } },
          { id: "asc" },
        ],
        select: {
          id: true,
          familyMemberId: true,
          quantityInGrams: true,
          mealEntry: {
            select: {
              id: true,
              preparedAt: true,
              productId: true,
              recipeId: true,
              product: {
                select: {
                  nameUa: true,
                  nameEn: true,
                  category: { select: { code: true, nameUa: true } },
                  media: {
                    where: { status: "ACTIVE", archivedAt: null },
                    select: { storageObjectPath: true },
                    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
                    take: 1,
                  },
                  nutrients: {
                    where: { nutrient: { code: { in: [...CARD_NUTRIENTS] } } },
                    select: {
                      valuePer100g: true,
                      nutrient: { select: { code: true } },
                    },
                  },
                },
              },
              recipe: {
                select: {
                  title: true,
                  yieldWeightG: true,
                  recipeType: { select: { code: true, nameUa: true } },
                  media: {
                    where: { kind: "STORED_IMAGE", status: "ACTIVE", archivedAt: null },
                    select: { storageObjectPath: true },
                    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
                    take: 1,
                  },
                  nutrients: {
                    where: { nutrient: { code: { in: [...CARD_NUTRIENTS] } } },
                    select: {
                      valueTotal: true,
                      nutrient: { select: { code: true } },
                    },
                  },
                },
              },
              mealType: { select: { id: true, nameUa: true, sortOrder: true } },
            },
          },
          consumptionEntry: {
            select: {
              id: true,
              revision: true,
              status: true,
              quantityInGrams: true,
              mealType: { select: { id: true, nameUa: true, sortOrder: true } },
              nutrients: {
                where: { nutrient: { code: { in: [...CARD_NUTRIENTS] } } },
                select: { value: true, nutrient: { select: { code: true } } },
              },
            },
          },
          consumptionResolution: { select: { outcome: true } },
        },
      });
      const manualEntries = await database.consumptionEntry.findMany({
        where: {
          familyId: input.familyId,
          familyMemberId: { in: memberIds },
          localDate,
          source: "MANUAL",
          status: "CONFIRMED",
        },
        orderBy: [{ consumedAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          revision: true,
          familyMemberId: true,
          productId: true,
          recipeId: true,
          mealType: { select: { id: true, nameUa: true, sortOrder: true } },
          quantityInGrams: true,
          nutrients: {
            where: { nutrient: { code: { in: [...CARD_NUTRIENTS] } } },
            select: { value: true, nutrient: { select: { code: true } } },
          },
          product: {
            select: {
              nameUa: true,
              nameEn: true,
              category: { select: { code: true, nameUa: true } },
              media: {
                where: { status: "ACTIVE", archivedAt: null },
                select: { storageObjectPath: true },
                orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
                take: 1,
              },
            },
          },
          recipe: {
            select: {
              title: true,
              recipeType: { select: { code: true, nameUa: true } },
              media: {
                where: { kind: "STORED_IMAGE", status: "ACTIVE", archivedAt: null },
                select: { storageObjectPath: true },
                orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
                take: 1,
              },
            },
          },
        },
      });
      const activeEntries = await database.consumptionEntry.findMany({
        where: {
          familyId: input.familyId,
          familyMemberId: { in: memberIds },
          localDate,
          status: "CONFIRMED",
        },
        select: {
          familyMemberId: true,
          nutrients: {
            select: {
              value: true,
              completeness: true,
              nutrient: { select: { code: true, nameUa: true, unit: true, sortOrder: true } },
            },
          },
        },
      });

      const diaryMembers: DiaryMember[] = members.map((member) => {
        const planned: DiaryItem[] = candidates
          .filter((item) => item.familyMemberId === member.id)
          .map((item) => {
            const grams = item.quantityInGrams.toNumber();
            const activeEntry =
              item.consumptionEntry?.status === "CONFIRMED" ? item.consumptionEntry : null;
            const outcome = item.consumptionResolution?.outcome;
            const per100 = item.mealEntry.product
              ? cardNutrition(
                  item.mealEntry.product.nutrients.map((value) => ({
                    nutrient: value.nutrient,
                    value: value.valuePer100g,
                  })),
                )
              : item.mealEntry.recipe?.yieldWeightG &&
                  item.mealEntry.recipe.yieldWeightG.greaterThan(0)
                ? scaleNutrition(
                    cardNutrition(
                      item.mealEntry.recipe.nutrients.map((value) => ({
                        nutrient: value.nutrient,
                        value: value.valueTotal,
                      })),
                    ),
                    100 / item.mealEntry.recipe.yieldWeightG.toNumber(),
                  )
                : { energy: null, protein: null, fat: null, carbohydrate: null };
            const plannedNutrition = scaleNutrition(per100, grams / 100);
            const actualNutrition = activeEntry
              ? cardNutrition(activeEntry.nutrients)
              : { energy: null, protein: null, fat: null, carbohydrate: null };
            const mealTypeChanged =
              activeEntry?.mealType?.id !== undefined &&
              activeEntry.mealType.id !== item.mealEntry.mealType.id;
            const status =
              outcome === "SKIPPED"
                ? "SKIPPED"
                : activeEntry
                  ? Math.abs(activeEntry.quantityInGrams.toNumber() - grams) > 0.0005 ||
                    mealTypeChanged
                    ? "CHANGED"
                    : "CONFIRMED"
                  : "PENDING";
            return {
              key: `plan:${item.id}`,
              source: "MEAL_PLAN",
              participantId: item.id,
              entryId: activeEntry?.id ?? null,
              revision: activeEntry?.revision ?? null,
              kind: item.mealEntry.productId ? "product" : "recipe",
              foodId: (item.mealEntry.productId ?? item.mealEntry.recipeId)!,
              name: item.mealEntry.product
                ? (item.mealEntry.product.nameUa ?? item.mealEntry.product.nameEn)
                : item.mealEntry.recipe!.title,
              imageUrl: null,
              imageObjectPath:
                item.mealEntry.product?.media[0]?.storageObjectPath ??
                item.mealEntry.recipe?.media[0]?.storageObjectPath ??
                null,
              categoryCode: item.mealEntry.product?.category.code ?? null,
              categoryName: item.mealEntry.product?.category.nameUa ?? null,
              recipeType: item.mealEntry.recipe?.recipeType
                ? {
                    code: item.mealEntry.recipe.recipeType.code,
                    name: item.mealEntry.recipe.recipeType.nameUa,
                  }
                : null,
              mealType: activeEntry?.mealType
                ? {
                    id: activeEntry.mealType.id,
                    name: activeEntry.mealType.nameUa,
                    sortOrder: activeEntry.mealType.sortOrder,
                  }
                : {
                    id: item.mealEntry.mealType.id,
                    name: item.mealEntry.mealType.nameUa,
                    sortOrder: item.mealEntry.mealType.sortOrder,
                  },
              plannedMealType: {
                id: item.mealEntry.mealType.id,
                name: item.mealEntry.mealType.nameUa,
                sortOrder: item.mealEntry.mealType.sortOrder,
              },
              energyPer100g: per100.energy,
              plannedQuantityGrams: grams,
              plannedEnergyKcal: plannedNutrition.energy,
              actualQuantityGrams: activeEntry?.quantityInGrams.toNumber() ?? null,
              actualEnergyKcal: actualNutrition.energy,
              macros: {
                protein: actualNutrition.protein,
                fat: actualNutrition.fat,
                carbohydrate: actualNutrition.carbohydrate,
              },
              status,
              preparedAt: item.mealEntry.preparedAt?.toISOString() ?? null,
            } satisfies DiaryItem;
          });
        const manual: DiaryItem[] = manualEntries
          .filter((item) => item.familyMemberId === member.id)
          .map((item) => {
            const quantity = item.quantityInGrams.toNumber();
            const actualNutrition = cardNutrition(item.nutrients);
            const per100 = scaleNutrition(actualNutrition, 100 / quantity);
            return {
              key: `manual:${item.id}`,
              source: "MANUAL",
              participantId: null,
              entryId: item.id,
              revision: item.revision,
              kind: item.productId ? "product" : "recipe",
              foodId: (item.productId ?? item.recipeId)!,
              name: item.product
                ? (item.product.nameUa ?? item.product.nameEn)
                : item.recipe!.title,
              imageUrl: null,
              imageObjectPath:
                item.product?.media[0]?.storageObjectPath ??
                item.recipe?.media[0]?.storageObjectPath ??
                null,
              categoryCode: item.product?.category.code ?? null,
              categoryName: item.product?.category.nameUa ?? null,
              recipeType: item.recipe?.recipeType
                ? { code: item.recipe.recipeType.code, name: item.recipe.recipeType.nameUa }
                : null,
              mealType: item.mealType
                ? {
                    id: item.mealType.id,
                    name: item.mealType.nameUa,
                    sortOrder: item.mealType.sortOrder,
                  }
                : null,
              plannedMealType: null,
              energyPer100g: per100.energy,
              plannedQuantityGrams: null,
              plannedEnergyKcal: null,
              actualQuantityGrams: quantity,
              actualEnergyKcal: actualNutrition.energy,
              macros: {
                protein: actualNutrition.protein,
                fat: actualNutrition.fat,
                carbohydrate: actualNutrition.carbohydrate,
              },
              status: "CONFIRMED",
              preparedAt: null,
            };
          });
        const nutrientMap = new Map<string, DiaryNutrient & { sortOrder: number }>();
        for (const entry of activeEntries.filter((item) => item.familyMemberId === member.id))
          for (const value of entry.nutrients) {
            const current = nutrientMap.get(value.nutrient.code);
            const completeness =
              current?.completeness === "UNVERIFIED" || value.completeness === "UNVERIFIED"
                ? "UNVERIFIED"
                : current?.completeness === "PARTIAL" || value.completeness === "PARTIAL"
                  ? "PARTIAL"
                  : "COMPLETE";
            nutrientMap.set(value.nutrient.code, {
              code: value.nutrient.code,
              name: value.nutrient.nameUa,
              unit: value.nutrient.unit,
              value: (current?.value ?? 0) + value.value.toNumber(),
              completeness,
              sortOrder: value.nutrient.sortOrder,
            });
          }
        const all = [...planned, ...manual];
        const confirmedCount = planned.filter((item) => item.status === "CONFIRMED").length;
        const changedCount = planned.filter((item) => item.status === "CHANGED").length;
        const skippedCount = planned.filter((item) => item.status === "SKIPPED").length;
        const addedCount = manual.length;
        return {
          memberId: member.id,
          name: personName(member.personProfile),
          isSelf: member.personProfile.userId === input.userId,
          canEdit: input.role === "OWNER" || member.personProfile.userId === input.userId,
          mealTypes: member.personProfile.mealTypePreferences.map(({ mealType }) => ({
            id: mealType.id,
            name: mealType.nameUa,
            sortOrder: mealType.sortOrder,
          })),
          summary: {
            plannedCount: planned.length,
            confirmedCount,
            changedCount,
            skippedCount,
            pendingCount: planned.filter((item) => item.status === "PENDING").length,
            addedCount,
            deviationCount: changedCount + skippedCount + addedCount,
            adherencePercent: planned.length
              ? Math.round(((confirmedCount + changedCount) / planned.length) * 100)
              : null,
          },
          nutrients: [...nutrientMap.values()]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((value) => ({
              code: value.code,
              name: value.name,
              unit: value.unit,
              value: value.value,
              completeness: value.completeness,
            })),
          targets: (member.personProfile.nutrientTargetSets[0]?.targets ?? []).map((target) => ({
            code: target.nutrient.code,
            name: target.nutrient.nameUa,
            unit: target.nutrient.unit,
            minimumValue: target.minimumValue?.toNumber() ?? null,
            targetValue: target.targetValue?.toNumber() ?? null,
            maximumValue: target.maximumValue?.toNumber() ?? null,
          })),
          items: all,
        };
      });
      return {
        familyName: input.familyName,
        role: input.role,
        selfMemberId:
          members.find((member) => member.personProfile.userId === input.userId)?.id ?? null,
        date: input.date,
        timeZone: input.timeZone,
        members: diaryMembers,
      };
    },

    async readDashboard(input): Promise<ConsumptionDashboard> {
      const dates = [...new Set(input.dates)].sort();
      if (!dates.length || dates.length > 31)
        throw new ConsumptionValidationError("Dashboard requires from one to 31 dates");
      const localDates = dates.map(dateValue);
      const periodStart = dates[0]!;
      const periodEnd = dates.at(-1)!;
      const endExclusive = dateValue(periodEnd);
      endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
      const startExclusive = dateValue(periodStart);
      startExclusive.setUTCDate(startExclusive.getUTCDate() + 1);

      const members = await database.familyMember.findMany({
        where: {
          familyId: input.familyId,
          archivedAt: null,
          ...(input.role === "MEMBER" ? { personProfile: { userId: input.userId } } : {}),
        },
        orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          personProfile: {
            select: {
              id: true,
              userId: true,
              firstName: true,
              lastName: true,
              nutrientTargetSets: {
                orderBy: { effectiveFrom: "desc" },
                take: 1,
                select: {
                  targets: {
                    orderBy: { nutrient: { sortOrder: "asc" } },
                    select: {
                      minimumValue: true,
                      targetValue: true,
                      maximumValue: true,
                      nutrient: { select: { code: true, nameUa: true, unit: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });
      members.sort(
        (left, right) =>
          Number(right.personProfile.userId === input.userId) -
          Number(left.personProfile.userId === input.userId),
      );
      const memberIds = members.map((member) => member.id);
      const profileIds = members.map((member) => member.personProfile.id);
      const [candidates, activeEntries, measurements] = await Promise.all([
        database.mealEntryParticipant.findMany({
          where: {
            familyMemberId: { in: memberIds },
            mealEntry: { date: { in: localDates }, preparedAt: { not: null } },
          },
          select: {
            familyMemberId: true,
            consumptionEntry: { select: { status: true } },
            consumptionResolution: { select: { outcome: true } },
          },
        }),
        database.consumptionEntry.findMany({
          where: {
            familyId: input.familyId,
            familyMemberId: { in: memberIds },
            localDate: { in: localDates },
            status: "CONFIRMED",
          },
          select: {
            familyMemberId: true,
            source: true,
            nutrients: {
              select: {
                value: true,
                completeness: true,
                nutrient: { select: { code: true, nameUa: true, unit: true, sortOrder: true } },
              },
            },
          },
        }),
        database.bodyMeasurement.findMany({
          where: {
            personProfileId: { in: profileIds },
            weightKg: { not: null },
            measuredAt: { lt: endExclusive },
          },
          orderBy: [{ measuredAt: "asc" }, { id: "asc" }],
          select: { personProfileId: true, weightKg: true, measuredAt: true },
        }),
      ]);

      const dashboardMembers: DashboardMember[] = members.map((member) => {
        const planned = candidates.filter((item) => item.familyMemberId === member.id);
        const status = (item: (typeof planned)[number]) => {
          if (item.consumptionResolution?.outcome === "SKIPPED") return "SKIPPED" as const;
          if (item.consumptionEntry?.status !== "CONFIRMED") return "PENDING" as const;
          return item.consumptionResolution?.outcome === "CHANGED"
            ? ("CHANGED" as const)
            : ("CONFIRMED" as const);
        };
        const facts = activeEntries.filter((item) => item.familyMemberId === member.id);
        const confirmedCount = planned.filter((item) => status(item) === "CONFIRMED").length;
        const changedCount = planned.filter((item) => status(item) === "CHANGED").length;
        const skippedCount = planned.filter((item) => status(item) === "SKIPPED").length;
        const pendingCount = planned.filter((item) => status(item) === "PENDING").length;
        const addedCount = facts.filter((item) => item.source === "MANUAL").length;
        const nutrientMap = new Map<string, DiaryNutrient & { sortOrder: number }>();
        for (const entry of facts)
          for (const value of entry.nutrients) {
            const current = nutrientMap.get(value.nutrient.code);
            const completeness =
              current?.completeness === "UNVERIFIED" || value.completeness === "UNVERIFIED"
                ? "UNVERIFIED"
                : current?.completeness === "PARTIAL" || value.completeness === "PARTIAL"
                  ? "PARTIAL"
                  : "COMPLETE";
            nutrientMap.set(value.nutrient.code, {
              code: value.nutrient.code,
              name: value.nutrient.nameUa,
              unit: value.nutrient.unit,
              value: (current?.value ?? 0) + value.value.toNumber(),
              completeness,
              sortOrder: value.nutrient.sortOrder,
            });
          }
        const profileMeasurements = measurements.filter(
          (measurement) => measurement.personProfileId === member.personProfile.id,
        );
        const startMeasurement =
          profileMeasurements
            .filter((measurement) => measurement.measuredAt < startExclusive)
            .at(-1) ??
          profileMeasurements[0] ??
          null;
        const endMeasurement = profileMeasurements.at(-1) ?? null;
        const startKg = startMeasurement?.weightKg?.toNumber() ?? null;
        const endKg = endMeasurement?.weightKg?.toNumber() ?? null;
        return {
          memberId: member.id,
          name: personName(member.personProfile),
          isSelf: member.personProfile.userId === input.userId,
          canEdit: input.role === "OWNER" || member.personProfile.userId === input.userId,
          summary: {
            plannedCount: planned.length,
            confirmedCount,
            changedCount,
            skippedCount,
            pendingCount,
            addedCount,
            deviationCount: changedCount + skippedCount + addedCount,
            adherencePercent: planned.length
              ? Math.round(((confirmedCount + changedCount) / planned.length) * 100)
              : null,
          },
          nutrients: [...nutrientMap.values()]
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((nutrient) => ({
              code: nutrient.code,
              name: nutrient.name,
              unit: nutrient.unit,
              value: nutrient.value,
              completeness: nutrient.completeness,
            })),
          targets: (member.personProfile.nutrientTargetSets[0]?.targets ?? []).map((target) => ({
            code: target.nutrient.code,
            name: target.nutrient.nameUa,
            unit: target.nutrient.unit,
            minimumValue:
              target.minimumValue === null ? null : target.minimumValue.toNumber() * dates.length,
            targetValue:
              target.targetValue === null ? null : target.targetValue.toNumber() * dates.length,
            maximumValue:
              target.maximumValue === null ? null : target.maximumValue.toNumber() * dates.length,
          })),
          weight: {
            startKg,
            endKg,
            changeKg: startKg === null || endKg === null ? null : endKg - startKg,
            startMeasuredAt: startMeasurement?.measuredAt.toISOString() ?? null,
            endMeasuredAt: endMeasurement?.measuredAt.toISOString() ?? null,
          },
        };
      });

      return {
        familyName: input.familyName,
        role: input.role,
        selfMemberId:
          members.find((member) => member.personProfile.userId === input.userId)?.id ?? null,
        dates,
        periodStart,
        periodEnd,
        timeZone: input.timeZone,
        members: dashboardMembers,
      };
    },

    async confirmPlanned(input) {
      const participant = await database.mealEntryParticipant.findFirst({
        where: { id: input.participantId, familyMember: { familyId: input.familyId } },
        select: {
          id: true,
          familyMemberId: true,
          quantity: true,
          measurementUnitId: true,
          quantityInGrams: true,
          mealEntry: {
            select: {
              date: true,
              preparedAt: true,
              productId: true,
              recipeId: true,
              mealTypeId: true,
              cookingAllocations: {
                where: { releasedAt: null, cookingSession: { status: "COMPLETED" } },
                take: 1,
                select: {
                  cookingSession: {
                    select: { id: true, actualYieldWeightG: true, plannedYieldWeightG: true },
                  },
                },
              },
            },
          },
          consumptionEntry: {
            select: {
              id: true,
              status: true,
              revision: true,
              quantityInGrams: true,
              mealTypeId: true,
            },
          },
        },
      });
      if (!participant || !participant.mealEntry.preparedAt) throw new ConsumptionNotFoundError();
      await authorizeMember(input.familyId, input.role, input.userId, participant.familyMemberId);
      const cookingSession = participant.mealEntry.cookingAllocations[0]?.cookingSession ?? null;
      const plannedQuantityGrams = participant.quantityInGrams.toNumber();
      const suggestedQuantityGrams =
        cookingSession?.actualYieldWeightG && cookingSession.plannedYieldWeightG
          ? (plannedQuantityGrams * cookingSession.actualYieldWeightG.toNumber()) /
            cookingSession.plannedYieldWeightG.toNumber()
          : plannedQuantityGrams;
      const quantityGrams = input.quantityGrams ?? suggestedQuantityGrams;
      const values = await snapshot({
        productId: participant.mealEntry.productId,
        recipeId: participant.mealEntry.recipeId,
        cookingSessionId: cookingSession?.id ?? null,
        quantityGrams,
      });
      await database.$transaction(async (tx) => {
        const common = {
          familyId: input.familyId,
          familyMemberId: participant.familyMemberId,
          recordedByUserId: input.userId,
          source: "MEAL_PLAN" as const,
          productId: participant.mealEntry.productId,
          recipeId: participant.mealEntry.recipeId,
          mealTypeId: participant.mealEntry.mealTypeId,
          quantity: quantityGrams,
          measurementUnitId: participant.measurementUnitId,
          quantityInGrams: quantityGrams,
          plannedQuantity: participant.quantity,
          plannedMeasurementUnitId: participant.measurementUnitId,
          plannedQuantityInGrams: participant.quantityInGrams,
          cookingSessionId: cookingSession?.id ?? null,
          consumedAt: new Date(`${isoDate(participant.mealEntry.date)}T12:00:00.000Z`),
          localDate: participant.mealEntry.date,
          timeZone: (
            await tx.family.findUniqueOrThrow({
              where: { id: input.familyId },
              select: { timeZone: true },
            })
          ).timeZone,
          status: "CONFIRMED" as const,
          voidedAt: null,
        };
        const restoredQuantity = participant.consumptionEntry?.quantityInGrams.toNumber();
        const actualQuantity =
          participant.consumptionEntry?.status === "VOIDED" && restoredQuantity !== undefined
            ? restoredQuantity
            : quantityGrams;
        const actualMealTypeId =
          participant.consumptionEntry?.status === "VOIDED"
            ? participant.consumptionEntry.mealTypeId
            : participant.mealEntry.mealTypeId;
        const changed =
          Math.abs(actualQuantity - participant.quantityInGrams.toNumber()) > 0.0005 ||
          actualMealTypeId !== participant.mealEntry.mealTypeId;
        const entry =
          participant.consumptionEntry?.status === "VOIDED"
            ? await tx.consumptionEntry.update({
                where: { id: participant.consumptionEntry.id },
                data: { status: "CONFIRMED", voidedAt: null, revision: { increment: 1 } },
                select: { id: true },
              })
            : participant.consumptionEntry
              ? await tx.consumptionEntry.update({
                  where: { id: participant.consumptionEntry.id },
                  data: {
                    quantity: quantityGrams,
                    quantityInGrams: quantityGrams,
                    revision: { increment: 1 },
                    nutrients: { deleteMany: {}, create: nutrientCreates(values) },
                  },
                  select: { id: true },
                })
              : await tx.consumptionEntry.create({
                  data: {
                    ...common,
                    sourceMealEntryParticipantId: participant.id,
                    nutrients: { create: nutrientCreates(values) },
                  },
                  select: { id: true },
                });
        await tx.mealConsumptionResolution.upsert({
          where: { mealEntryParticipantId: participant.id },
          create: {
            familyId: input.familyId,
            familyMemberId: participant.familyMemberId,
            mealEntryParticipantId: participant.id,
            outcome: changed ? "CHANGED" : "CONFIRMED",
            consumptionEntryId: entry.id,
            resolvedByUserId: input.userId,
            resolvedAt: new Date(),
          },
          update: {
            outcome: changed ? "CHANGED" : "CONFIRMED",
            consumptionEntryId: entry.id,
            resolvedByUserId: input.userId,
            resolvedAt: new Date(),
          },
        });
      });
    },

    async skipPlanned(input) {
      const participant = await database.mealEntryParticipant.findFirst({
        where: {
          id: input.participantId,
          familyMember: { familyId: input.familyId },
          mealEntry: { preparedAt: { not: null } },
        },
        select: {
          id: true,
          familyMemberId: true,
          consumptionEntry: { select: { id: true, status: true } },
        },
      });
      if (!participant) throw new ConsumptionNotFoundError();
      await authorizeMember(input.familyId, input.role, input.userId, participant.familyMemberId);
      await database.$transaction(async (tx) => {
        await tx.mealConsumptionResolution.upsert({
          where: { mealEntryParticipantId: participant.id },
          create: {
            familyId: input.familyId,
            familyMemberId: participant.familyMemberId,
            mealEntryParticipantId: participant.id,
            outcome: "SKIPPED",
            resolvedByUserId: input.userId,
            resolvedAt: new Date(),
          },
          update: {
            outcome: "SKIPPED",
            consumptionEntryId: null,
            resolvedByUserId: input.userId,
            resolvedAt: new Date(),
          },
        });
        if (participant.consumptionEntry?.status === "CONFIRMED")
          await tx.consumptionEntry.update({
            where: { id: participant.consumptionEntry.id },
            data: { status: "VOIDED", voidedAt: new Date(), revision: { increment: 1 } },
          });
      });
    },

    async restorePlanned(input) {
      const participant = await database.mealEntryParticipant.findFirst({
        where: {
          id: input.participantId,
          familyMember: { familyId: input.familyId },
          mealEntry: { preparedAt: { not: null } },
          consumptionResolution: { outcome: "SKIPPED" },
        },
        select: { id: true, familyMemberId: true },
      });
      if (!participant) throw new ConsumptionNotFoundError();
      await authorizeMember(input.familyId, input.role, input.userId, participant.familyMemberId);
      await database.mealConsumptionResolution.update({
        where: { mealEntryParticipantId: participant.id },
        data: {
          outcome: "UNCONFIRMED",
          consumptionEntryId: null,
          resolvedByUserId: input.userId,
          resolvedAt: new Date(),
        },
      });
    },

    async updateEntry(input) {
      const entry = await database.consumptionEntry.findFirst({
        where: { id: input.entryId, familyId: input.familyId, status: "CONFIRMED" },
        select: {
          id: true,
          revision: true,
          familyMemberId: true,
          productId: true,
          recipeId: true,
          cookingSessionId: true,
          plannedQuantityInGrams: true,
          sourceMealEntryParticipantId: true,
          sourceMealEntryParticipant: {
            select: { mealEntry: { select: { mealTypeId: true } } },
          },
        },
      });
      if (!entry) throw new ConsumptionNotFoundError();
      await authorizeMember(input.familyId, input.role, input.userId, entry.familyMemberId);
      if (entry.revision !== input.expectedRevision) throw new ConsumptionConflictError();
      const mealType = await database.mealType.findFirst({
        where: { id: input.mealTypeId, isActive: true },
        select: { id: true },
      });
      if (!mealType) throw new ConsumptionValidationError("Meal type is unavailable");
      const values = await snapshot({
        productId: entry.productId,
        recipeId: entry.recipeId,
        cookingSessionId: entry.cookingSessionId,
        quantityGrams: input.quantityGrams,
      });
      await database.$transaction(async (tx) => {
        await tx.consumptionEntry.update({
          where: { id: entry.id },
          data: {
            quantity: input.quantityGrams,
            quantityInGrams: input.quantityGrams,
            mealTypeId: mealType.id,
            revision: { increment: 1 },
            nutrients: { deleteMany: {}, create: nutrientCreates(values) },
          },
        });
        if (entry.sourceMealEntryParticipantId)
          await tx.mealConsumptionResolution.update({
            where: { mealEntryParticipantId: entry.sourceMealEntryParticipantId },
            data: {
              outcome:
                entry.plannedQuantityInGrams &&
                Math.abs(entry.plannedQuantityInGrams.toNumber() - input.quantityGrams) <= 0.0005 &&
                entry.sourceMealEntryParticipant?.mealEntry.mealTypeId === mealType.id
                  ? "CONFIRMED"
                  : "CHANGED",
              resolvedByUserId: input.userId,
              resolvedAt: new Date(),
            },
          });
      });
    },

    async voidEntry(input) {
      const entry = await database.consumptionEntry.findFirst({
        where: { id: input.entryId, familyId: input.familyId, status: "CONFIRMED" },
        select: {
          id: true,
          revision: true,
          familyMemberId: true,
          sourceMealEntryParticipantId: true,
        },
      });
      if (!entry) throw new ConsumptionNotFoundError();
      await authorizeMember(input.familyId, input.role, input.userId, entry.familyMemberId);
      if (entry.revision !== input.expectedRevision) throw new ConsumptionConflictError();
      await database.$transaction(async (tx) => {
        if (entry.sourceMealEntryParticipantId) {
          await tx.mealConsumptionResolution.update({
            where: { mealEntryParticipantId: entry.sourceMealEntryParticipantId },
            data: {
              outcome: "UNCONFIRMED",
              consumptionEntryId: null,
              resolvedByUserId: input.userId,
              resolvedAt: new Date(),
            },
          });
        }
        await tx.consumptionEntry.update({
          where: { id: entry.id },
          data: { status: "VOIDED", voidedAt: new Date(), revision: { increment: 1 } },
        });
      });
    },

    async addManual(input) {
      await authorizeMember(input.familyId, input.role, input.userId, input.memberId);
      const mealType = await database.mealType.findFirst({
        where: { id: input.mealTypeId, isActive: true },
        select: { id: true },
      });
      if (!mealType) throw new ConsumptionValidationError("Meal type is unavailable");
      const gram = await database.measurementUnit.findUnique({
        where: { code: "g" },
        select: { id: true },
      });
      if (!gram) throw new ConsumptionValidationError("Gram measurement unit is unavailable");
      const productId = input.kind === "product" ? input.foodId : null;
      const recipeId = input.kind === "recipe" ? input.foodId : null;
      const values = await snapshot({
        productId,
        recipeId,
        cookingSessionId: null,
        quantityGrams: input.quantityGrams,
      });
      const family = await database.family.findUniqueOrThrow({
        where: { id: input.familyId },
        select: { timeZone: true },
      });
      await database.consumptionEntry.create({
        data: {
          familyId: input.familyId,
          familyMemberId: input.memberId,
          recordedByUserId: input.userId,
          source: "MANUAL",
          productId,
          recipeId,
          mealTypeId: mealType.id,
          quantity: input.quantityGrams,
          measurementUnitId: gram.id,
          quantityInGrams: input.quantityGrams,
          consumedAt: new Date(`${input.date}T12:00:00.000Z`),
          localDate: dateValue(input.date),
          timeZone: family.timeZone,
          nutrients: { create: nutrientCreates(values) },
        },
      });
    },
  };
  return Object.freeze(repository);
}
