import type { DatabaseClient } from "@mealmind/db";

import type {
  MealPlanEntryView,
  MealPlanRepository,
  NutrientAmount,
} from "../domain/meal-plan-repository.js";

const summaryNutrients = ["energy_kcal", "protein", "total_fat", "carbohydrate"] as const;

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function numeric(value: { toString(): string }): number {
  return Number(value.toString());
}

function fullName(profile: { firstName: string; lastName: string | null }): string {
  return [profile.firstName, profile.lastName].filter(Boolean).join(" ");
}

export function createPrismaMealPlanRepository(database: DatabaseClient): MealPlanRepository {
  const repository: MealPlanRepository = {
    async readWeek(familyId, query) {
      const [family, members, plan] = await Promise.all([
        database.family.findUniqueOrThrow({
          where: { id: familyId },
          select: { name: true, timeZone: true, weekStartsOn: true },
        }),
        database.familyMember.findMany({
          where: { familyId, archivedAt: null, personProfile: { archivedAt: null } },
          select: {
            id: true,
            personProfile: {
              select: {
                firstName: true,
                lastName: true,
                mealTypePreferences: {
                  where: { mealType: { isActive: true } },
                  select: {
                    mealType: {
                      select: { id: true, code: true, nameUa: true, sortOrder: true },
                    },
                  },
                  orderBy: { mealType: { sortOrder: "asc" } },
                },
                nutrientTargetSets: {
                  where: {
                    effectiveFrom: { lte: query.weekEnd },
                    OR: [{ effectiveTo: null }, { effectiveTo: { gte: query.weekStart } }],
                  },
                  select: {
                    targets: {
                      where: { nutrient: { code: { in: [...summaryNutrients] } } },
                      select: {
                        targetValue: true,
                        nutrient: {
                          select: { code: true, nameUa: true, unit: true, sortOrder: true },
                        },
                      },
                      orderBy: { nutrient: { sortOrder: "asc" } },
                    },
                  },
                  orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
                  take: 1,
                },
              },
            },
          },
          orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
        }),
        database.mealPlan.findUnique({
          where: { familyId_weekStart: { familyId, weekStart: query.weekStart } },
          select: {
            id: true,
            entries: {
              where: { date: { gte: query.weekStart, lte: query.weekEnd } },
              select: {
                id: true,
                date: true,
                mealTypeId: true,
                position: true,
                product: {
                  select: {
                    id: true,
                    nameUa: true,
                    nameEn: true,
                    category: { select: { code: true } },
                    nutrients: {
                      where: { nutrient: { code: { in: [...summaryNutrients] } } },
                      select: {
                        valuePer100g: true,
                        nutrient: { select: { code: true, nameUa: true, unit: true } },
                      },
                    },
                  },
                },
                recipe: {
                  select: {
                    id: true,
                    title: true,
                    yieldWeightG: true,
                    nutrients: {
                      where: { nutrient: { code: { in: [...summaryNutrients] } } },
                      select: {
                        valueTotal: true,
                        completeness: true,
                        nutrient: { select: { code: true, nameUa: true, unit: true } },
                      },
                    },
                  },
                },
                participants: {
                  select: {
                    familyMemberId: true,
                    quantity: true,
                    quantityInGrams: true,
                    measurementUnit: { select: { symbol: true } },
                    familyMember: {
                      select: { personProfile: { select: { firstName: true, lastName: true } } },
                    },
                  },
                  orderBy: { familyMemberId: "asc" },
                },
              },
              orderBy: [{ date: "asc" }, { mealType: { sortOrder: "asc" } }, { position: "asc" }],
            },
          },
        }),
      ]);

      const totals = new Map<string, Map<string, NutrientAmount>>();
      const completeness = new Map<string, { hasFood: boolean; partial: boolean }>();

      for (const member of members) {
        totals.set(member.id, new Map());
        completeness.set(member.id, { hasFood: false, partial: false });
      }

      const entries = (plan?.entries ?? []).map((entry): MealPlanEntryView => {
        for (const participant of entry.participants) {
          const memberTotals = totals.get(participant.familyMemberId);
          const state = completeness.get(participant.familyMemberId);
          if (!memberTotals || !state) continue;

          state.hasFood = true;
          const grams = numeric(participant.quantityInGrams);
          const values = entry.product
            ? entry.product.nutrients.map(({ nutrient, valuePer100g }) => ({
                nutrient,
                value: (numeric(valuePer100g) * grams) / 100,
                complete: true,
              }))
            : entry.recipe?.yieldWeightG
              ? entry.recipe.nutrients.map(
                  ({ nutrient, valueTotal, completeness: valueState }) => ({
                    nutrient,
                    value: (numeric(valueTotal) * grams) / numeric(entry.recipe!.yieldWeightG!),
                    complete: valueState === "COMPLETE",
                  }),
                )
              : [];

          if (values.length < summaryNutrients.length || values.some((value) => !value.complete)) {
            state.partial = true;
          }

          for (const value of values) {
            const current = memberTotals.get(value.nutrient.code);
            memberTotals.set(value.nutrient.code, {
              code: value.nutrient.code,
              name: value.nutrient.nameUa,
              unit: value.nutrient.unit,
              value: (current?.value ?? 0) + value.value,
            });
          }
        }

        const product = entry.product;
        const recipe = entry.recipe;
        return {
          id: entry.id,
          kind: product ? "product" : "recipe",
          foodId: product?.id ?? recipe!.id,
          name: product ? (product.nameUa ?? product.nameEn) : recipe!.title,
          imageUrl: null,
          categoryCode: product?.category.code ?? null,
          position: entry.position,
          participants: entry.participants.map((participant) => ({
            memberId: participant.familyMemberId,
            name: fullName(participant.familyMember.personProfile),
            quantity: numeric(participant.quantity),
            quantityInGrams: numeric(participant.quantityInGrams),
            unit: participant.measurementUnit.symbol,
          })),
        };
      });

      const placementByEntryId = new Map(
        (plan?.entries ?? []).map((entry) => [
          entry.id,
          { date: dateOnly(entry.date), mealTypeId: entry.mealTypeId },
        ]),
      );

      const configuredMealTypes = [
        ...new Map(
          members
            .flatMap((member) => member.personProfile.mealTypePreferences)
            .map(({ mealType }) => [mealType.id, mealType] as const),
        ).values(),
      ].sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));

      const days = Array.from({ length: 7 }, (_, index) => {
        const date = dateOnly(addDays(query.weekStart, index));
        return {
          date,
          meals: configuredMealTypes.map((mealType) => ({
            mealType: {
              id: mealType.id,
              code: mealType.code,
              name: mealType.nameUa,
              sortOrder: mealType.sortOrder,
            },
            entries: entries.filter((entry) => {
              const placement = placementByEntryId.get(entry.id);
              return placement?.mealTypeId === mealType.id && placement.date === date;
            }),
          })),
        };
      });

      return {
        planId: plan?.id ?? null,
        familyName: family.name,
        weekStart: dateOnly(query.weekStart),
        weekEnd: dateOnly(query.weekEnd),
        weekStartsOn: family.weekStartsOn,
        timeZone: family.timeZone,
        days,
        members: members.map((member) => {
          const state = completeness.get(member.id)!;
          const targets =
            member.personProfile.nutrientTargetSets[0]?.targets.flatMap(
              ({ nutrient, targetValue }) =>
                targetValue
                  ? [
                      {
                        code: nutrient.code,
                        name: nutrient.nameUa,
                        unit: nutrient.unit,
                        value: numeric(targetValue),
                      },
                    ]
                  : [],
            ) ?? [];

          return {
            memberId: member.id,
            name: fullName(member.personProfile),
            avatarUrl: null,
            consumed: [...totals.get(member.id)!.values()].map((item) => ({
              ...item,
              value: Math.round(item.value * 10) / 10,
            })),
            targets,
            completeness: !state.hasFood ? "unavailable" : state.partial ? "partial" : "complete",
          };
        }),
      };
    },
  };

  return Object.freeze(repository);
}
