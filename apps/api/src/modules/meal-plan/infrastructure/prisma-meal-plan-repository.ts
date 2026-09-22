import { Prisma, type DatabaseClient } from "@mealmind/db";

import {
  MealEntryNotFoundError,
  MealPlanAccessDeniedError,
  MealPlanConflictError,
  MealPlanIdempotencyConflictError,
  MealPlanValidationError,
} from "../application/meal-plan-errors.js";

import type {
  AggregatedMealPlanEntryView,
  CreateMealEntriesCommand,
  MealPlanEntryView,
  MealPlanRepository,
  MealTypeView,
  MemberDetailsView,
  MemberFoodView,
  NutrientAmount,
  NutrientTargetAmount,
  NutritionAggregateView,
  NutritionAssessment,
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

function targetMinimum(target: NutrientTargetAmount): number | null {
  return target.minimumValue ?? target.targetValue;
}

function targetMaximum(target: NutrientTargetAmount): number | null {
  return target.maximumValue ?? target.targetValue;
}

function assessment(
  planned: readonly NutrientAmount[],
  targets: readonly NutrientTargetAmount[],
): NutritionAssessment {
  const values = new Map(planned.map((item) => [item.code, item.value]));

  const targetValues = new Map(targets.map((item) => [item.code, item.value]));
  const targetsByCode = new Map(targets.map((item) => [item.code, item]));

  const energy = values.get("energy_kcal") ?? null;

  const energyTarget = targetValues.get("energy_kcal") ?? null;
  const energyTargetDetails = targetsByCode.get("energy_kcal");
  const energyMinimum = energyTargetDetails ? targetMinimum(energyTargetDetails) : null;
  const energyMaximum = energyTargetDetails ? targetMaximum(energyTargetDetails) : null;

  const coverage =
    energy !== null && energyTarget !== null && energyTarget > 0
      ? Math.round((energy * 100) / energyTarget)
      : null;

  const protein = values.get("protein") ?? null;

  const fat = values.get("total_fat") ?? null;

  const carbs = values.get("carbohydrate") ?? null;

  const macroEnergy =
    protein !== null && fat !== null && carbs !== null ? protein * 4 + fat * 9 + carbs * 4 : null;

  const macroPercent = (value: number | null, factor: number) =>
    value !== null && macroEnergy !== null && macroEnergy > 0
      ? Math.round((value * factor * 100) / macroEnergy)
      : null;

  const signals: string[] = [];

  if (energy !== null && energyMinimum !== null && energy < energyMinimum * 0.8) {
    signals.push("Заплановано менше енергії за ціль");
  }

  if (energy !== null && energyMaximum !== null && energy > energyMaximum * 1.2) {
    signals.push("Заплановано більше енергії за ціль");
  }

  const proteinTarget = targetsByCode.get("protein");
  const proteinMinimum = proteinTarget ? targetMinimum(proteinTarget) : null;

  if (
    protein !== null &&
    proteinMinimum !== null &&
    proteinMinimum > 0 &&
    protein < proteinMinimum * 0.8
  ) {
    signals.push("Варто додати джерело білка");
  }

  const appendMacroSignal = (code: "total_fat" | "carbohydrate", label: "жирів" | "вуглеводів") => {
    const value = values.get(code);
    const target = targetsByCode.get(code);

    if (value === undefined || target === undefined) {
      return;
    }
    const minimum = targetMinimum(target);
    const maximum = targetMaximum(target);

    if (minimum !== null && minimum > 0 && value < minimum * 0.8) {
      signals.push("План поки не досягає орієнтира для " + label);
    } else if (maximum !== null && maximum > 0 && value > maximum * 1.2) {
      signals.push("План перевищує орієнтир для " + label);
    }
  };

  appendMacroSignal("total_fat", "жирів");
  appendMacroSignal("carbohydrate", "вуглеводів");

  return {
    energyCoveragePercent: coverage,

    macroEnergyPercent: {
      protein: macroPercent(protein, 4),

      fat: macroPercent(fat, 9),

      carbohydrate: macroPercent(carbs, 4),
    },

    signals,
  };
}

function assertDateInRange(value: string, start: Date, end: Date) {
  if (value < dateOnly(start) || value > dateOnly(end)) {
    throw new MealPlanValidationError("Meal entry date must belong to the active week");
  }
}

function resultFromJson(result: Prisma.JsonValue): {
  entries: {
    id: string;
    revision: number;
  }[];
} {
  if (!result || typeof result !== "object" || Array.isArray(result) || !("entries" in result)) {
    throw new MealPlanConflictError("Stored idempotency result is invalid");
  }

  return result as unknown as {
    entries: {
      id: string;
      revision: number;
    }[];
  };
}

/* -------------------------------------------------------------------------- */
/*                                Read helpers                                */
/* -------------------------------------------------------------------------- */

interface EntryPlacement {
  readonly date: string;
  readonly mealTypeId: string;
}

interface PortionNutrientValue {
  readonly code: string;
  readonly name: string;
  readonly unit: string;
  readonly value: number;
  readonly complete: boolean;
}

interface MemberFoodSource {
  readonly memberId: string;

  readonly food: MemberFoodView;

  readonly nutrients: readonly PortionNutrientValue[];

  readonly complete: boolean;
}

function portionNutrients(
  entry: {
    readonly product: {
      readonly nutrients: readonly {
        readonly valuePer100g: {
          toString(): string;
        };

        readonly nutrient: {
          readonly code: string;
          readonly nameUa: string;
          readonly unit: string;
        };
      }[];
    } | null;

    readonly recipe: {
      readonly yieldWeightG: {
        toString(): string;
      } | null;

      readonly nutrients: readonly {
        readonly valueTotal: {
          toString(): string;
        };

        readonly completeness: string;

        readonly nutrient: {
          readonly code: string;
          readonly nameUa: string;
          readonly unit: string;
        };
      }[];
    } | null;
  },
  grams: number,
): PortionNutrientValue[] {
  if (entry.product) {
    return entry.product.nutrients.map(({ nutrient, valuePer100g }) => ({
      code: nutrient.code,
      name: nutrient.nameUa,
      unit: nutrient.unit,

      value: (numeric(valuePer100g) * grams) / 100,

      complete: true,
    }));
  }

  if (entry.recipe?.yieldWeightG) {
    const yieldWeight = numeric(entry.recipe.yieldWeightG);

    if (yieldWeight <= 0) {
      return [];
    }

    return entry.recipe.nutrients.map(({ nutrient, valueTotal, completeness }) => ({
      code: nutrient.code,
      name: nutrient.nameUa,
      unit: nutrient.unit,

      value: (numeric(valueTotal) * grams) / yieldWeight,

      complete: completeness === "COMPLETE",
    }));
  }

  return [];
}

function energyPer100g(entry: {
  readonly product: {
    readonly nutrients: readonly {
      readonly valuePer100g: {
        toString(): string;
      };

      readonly nutrient: {
        readonly code: string;
      };
    }[];
  } | null;

  readonly recipe: {
    readonly yieldWeightG: {
      toString(): string;
    } | null;

    readonly nutrients: readonly {
      readonly valueTotal: {
        toString(): string;
      };

      readonly nutrient: {
        readonly code: string;
      };
    }[];
  } | null;
}): number | null {
  if (entry.product) {
    const energy = entry.product.nutrients.find(({ nutrient }) => nutrient.code === "energy_kcal");

    if (!energy) {
      return null;
    }

    return Math.round(numeric(energy.valuePer100g) * 10) / 10;
  }

  if (entry.recipe?.yieldWeightG) {
    const energy = entry.recipe.nutrients.find(({ nutrient }) => nutrient.code === "energy_kcal");

    const yieldWeight = numeric(entry.recipe.yieldWeightG);

    if (!energy || yieldWeight <= 0) {
      return null;
    }

    return Math.round((numeric(energy.valueTotal) / yieldWeight) * 100 * 10) / 10;
  }

  return null;
}

function aggregateNutrition(
  sources: readonly MemberFoodSource[],
  targets: readonly NutrientTargetAmount[],
): NutritionAggregateView {
  const values = new Map<string, NutrientAmount>();

  let partial = false;

  for (const source of sources) {
    if (!source.complete) {
      partial = true;
    }

    for (const nutrient of source.nutrients) {
      const current = values.get(nutrient.code);

      values.set(nutrient.code, {
        code: nutrient.code,
        name: nutrient.name,
        unit: nutrient.unit,

        value: (current?.value ?? 0) + nutrient.value,
      });
    }
  }

  const planned = [...values.values()].map((item) => ({
    ...item,

    value: Math.round(item.value * 10) / 10,
  }));

  const completeness =
    sources.length === 0
      ? ("unavailable" as const)
      : partial
        ? ("partial" as const)
        : ("complete" as const);

  return {
    planned,
    targets,
    completeness,

    // Не формуємо висновки з неповного набору базових нутрієнтів.
    // Розподіл енергії макронутрієнтів лишається доступним, але target
    // comparison вимикається до появи повних даних.
    assessment: assessment(planned, completeness === "complete" ? targets : []),
  };
}

function sumTargets(groups: readonly (readonly NutrientTargetAmount[])[]): NutrientTargetAmount[] {
  const values = new Map<
    string,
    NutrientTargetAmount & {
      readonly occurrences: number;
      readonly minimumOccurrences: number;
      readonly targetOccurrences: number;
      readonly maximumOccurrences: number;
    }
  >();

  for (const group of groups) {
    for (const target of group) {
      const current = values.get(target.code);
      const minimum = targetMinimum(target);
      const maximum = targetMaximum(target);
      values.set(target.code, {
        ...target,
        value: (current?.value ?? 0) + target.value,
        minimumValue:
          minimum === null
            ? (current?.minimumValue ?? null)
            : (current?.minimumValue ?? 0) + minimum,
        targetValue:
          target.targetValue === null
            ? (current?.targetValue ?? null)
            : (current?.targetValue ?? 0) + target.targetValue,
        maximumValue:
          maximum === null
            ? (current?.maximumValue ?? null)
            : (current?.maximumValue ?? 0) + maximum,
        occurrences: (current?.occurrences ?? 0) + 1,
        minimumOccurrences: (current?.minimumOccurrences ?? 0) + (minimum === null ? 0 : 1),
        targetOccurrences:
          (current?.targetOccurrences ?? 0) + (target.targetValue === null ? 0 : 1),
        maximumOccurrences: (current?.maximumOccurrences ?? 0) + (maximum === null ? 0 : 1),
      });
    }
  }

  return [...values.values()]
    .filter((target) => target.occurrences === groups.length)
    .map((target) => ({
      code: target.code,
      name: target.name,
      unit: target.unit,
      value: Math.round(target.value * 10) / 10,
      minimumValue:
        target.targetOccurrences !== groups.length &&
        target.minimumOccurrences === groups.length &&
        target.minimumValue !== null
          ? Math.round(target.minimumValue * 10) / 10
          : null,
      targetValue:
        target.targetOccurrences === groups.length && target.targetValue !== null
          ? Math.round(target.targetValue * 10) / 10
          : null,
      maximumValue:
        target.targetOccurrences !== groups.length &&
        target.maximumOccurrences === groups.length &&
        target.maximumValue !== null
          ? Math.round(target.maximumValue * 10) / 10
          : null,
    }));
}

function buildMemberDetails(
  memberId: string,
  selectedDates: readonly string[],
  mealTypes: readonly MealTypeView[],
  sources: readonly MemberFoodSource[],
  dailyTargetsByDate: ReadonlyMap<string, readonly NutrientTargetAmount[]>,
): MemberDetailsView {
  const memberSources = sources.filter((source) => source.memberId === memberId);

  const days = selectedDates.map((date) => {
    const daySources = memberSources.filter((source) => source.food.date === date);

    const meals = mealTypes.flatMap((mealType) => {
      const mealSources = daySources.filter((source) => source.food.mealType.id === mealType.id);

      if (!mealSources.length) {
        return [];
      }

      return [
        {
          mealType,

          entryCount: mealSources.length,

          preparedCount: mealSources.filter((source) => source.food.preparedAt !== null).length,

          /*
           * Meal-specific targets
           * поки відсутні.
           */
          nutrition: aggregateNutrition(mealSources, []),

          entries: mealSources.map((source) => source.food),
        },
      ];
    });

    return {
      date,

      entryCount: daySources.length,

      mealCount: meals.length,

      preparedCount: daySources.filter((source) => source.food.preparedAt !== null).length,

      /*
       * Для одного дня використовуємо
       * добову ціль.
       */
      nutrition: aggregateNutrition(daySources, dailyTargetsByDate.get(date) ?? []),

      meals,
    };
  });

  /*
   * Ці групи агрегують один meal type
   * через УСІ вибрані дні.
   */
  const mealTypeGroups = mealTypes.flatMap((mealType) => {
    const mealSources = memberSources.filter((source) => source.food.mealType.id === mealType.id);

    if (!mealSources.length) {
      return [];
    }

    return [
      {
        mealType,

        entryCount: mealSources.length,

        preparedCount: mealSources.filter((source) => source.food.preparedAt !== null).length,

        /*
         * Не використовуємо daily target,
         * бо це створило б хибний
         * meal-level coverage.
         */
        nutrition: aggregateNutrition(mealSources, []),

        entries: mealSources.map((source) => source.food),
      },
    ];
  });

  return {
    days,
    mealTypes: mealTypeGroups,
  };
}

/* -------------------------------------------------------------------------- */
/*                         MealView aggregation helper                        */
/* -------------------------------------------------------------------------- */

function aggregateMealEntries(
  entries: readonly MealPlanEntryView[],
  placementByEntryId: ReadonlyMap<string, EntryPlacement>,
  selectedDates: ReadonlySet<string>,
  mealTypeId?: string,
): AggregatedMealPlanEntryView[] {
  interface MutableParticipant {
    memberId: string;
    name: string;
    portions: number;
    quantityInGrams: number;
    avatarUrl: string | null;
  }

  interface MutableGroup {
    key: string;

    kind: MealPlanEntryView["kind"];

    foodId: string;

    name: string;

    imageUrl: string | null;

    imageObjectPath: string | null;

    categoryCode: string | null;

    categoryName: string | null;

    recipeType: MealPlanEntryView["recipeType"];

    totalTimeMin: number | null;

    difficulty: string | null;

    dates: Set<string>;

    totalPortions: number;

    totalWeightGrams: number;

    participants: Map<string, MutableParticipant>;

    sources: {
      entryId: string;
      revision: number;
      date: string;
      mealTypeId: string;
      preparedAt: string | null;
      cookingSession: MealPlanEntryView["cookingSession"];
    }[];

    firstDate: string;

    firstPosition: number;
  }

  const groups = new Map<string, MutableGroup>();

  for (const entry of entries) {
    const placement = placementByEntryId.get(entry.id);

    if (!placement) {
      continue;
    }

    if (!selectedDates.has(placement.date)) {
      continue;
    }

    if (mealTypeId && placement.mealTypeId !== mealTypeId) {
      continue;
    }

    const key = `${entry.kind}:${entry.foodId}`;

    let group = groups.get(key);

    if (!group) {
      group = {
        key,

        kind: entry.kind,

        foodId: entry.foodId,

        name: entry.name,

        imageUrl: entry.imageUrl,

        imageObjectPath: entry.imageObjectPath ?? null,

        categoryCode: entry.categoryCode,

        categoryName: entry.categoryName,

        recipeType: entry.recipeType,

        totalTimeMin: entry.totalTimeMin,

        difficulty: entry.difficulty,

        dates: new Set<string>(),

        totalPortions: 0,

        totalWeightGrams: 0,

        participants: new Map(),

        sources: [],

        firstDate: placement.date,

        firstPosition: entry.position,
      };

      groups.set(key, group);
    }

    group.dates.add(placement.date);

    group.sources.push({
      entryId: entry.id,

      revision: entry.revision,

      date: placement.date,

      mealTypeId: placement.mealTypeId,

      preparedAt: entry.preparedAt,

      cookingSession: entry.cookingSession,
    });

    for (const participant of entry.participants) {
      group.totalPortions += 1;

      group.totalWeightGrams += participant.quantityInGrams;

      const current = group.participants.get(participant.memberId);

      if (current) {
        current.portions += 1;

        current.quantityInGrams += participant.quantityInGrams;
      } else {
        group.participants.set(participant.memberId, {
          memberId: participant.memberId,

          name: participant.name,

          portions: 1,

          quantityInGrams: participant.quantityInGrams,

          avatarUrl: participant.avatarUrl,
        });
      }
    }
  }

  return [...groups.values()]
    .sort(
      (left, right) =>
        left.firstDate.localeCompare(right.firstDate) ||
        left.firstPosition - right.firstPosition ||
        left.name.localeCompare(right.name, "uk"),
    )
    .map((group) => ({
      key: group.key,

      kind: group.kind,

      foodId: group.foodId,

      name: group.name,

      imageUrl: group.imageUrl,

      imageObjectPath: group.imageObjectPath,

      categoryCode: group.categoryCode,

      categoryName: group.categoryName,

      recipeType: group.recipeType,

      totalTimeMin: group.totalTimeMin,

      difficulty: group.difficulty,

      dates: [...group.dates].sort(),

      totalPortions: group.totalPortions,

      totalWeightGrams: Math.round(group.totalWeightGrams * 10) / 10,

      participants: [...group.participants.values()]
        .map((participant) => ({
          ...participant,

          quantityInGrams: Math.round(participant.quantityInGrams * 10) / 10,
        }))
        .sort((left, right) => left.name.localeCompare(right.name, "uk")),

      sources: group.sources.sort(
        (left, right) =>
          left.date.localeCompare(right.date) || left.mealTypeId.localeCompare(right.mealTypeId),
      ),
    }));
}

/* -------------------------------------------------------------------------- */
/*                                Repository                                  */
/* -------------------------------------------------------------------------- */

export function createPrismaMealPlanRepository(database: DatabaseClient): MealPlanRepository {
  const repository: MealPlanRepository = {
    async readWeek(familyId, query) {
      const [family, members, plan] = await Promise.all([
        database.family.findUniqueOrThrow({
          where: {
            id: familyId,
          },

          select: {
            name: true,
            timeZone: true,
            weekStartsOn: true,
          },
        }),

        database.familyMember.findMany({
          where: {
            familyId,

            archivedAt: null,

            personProfile: {
              archivedAt: null,

              ...(query.role === "MEMBER"
                ? {
                    userId: query.userId,
                  }
                : {}),
            },
          },

          select: {
            id: true,

            personProfile: {
              select: {
                userId: true,

                firstName: true,

                lastName: true,

                mealTypePreferences: {
                  where: {
                    mealType: {
                      isActive: true,
                    },
                  },

                  select: {
                    mealType: {
                      select: {
                        id: true,
                        code: true,
                        nameUa: true,
                        sortOrder: true,
                      },
                    },
                  },

                  orderBy: {
                    mealType: {
                      sortOrder: "asc",
                    },
                  },
                },

                nutrientTargetSets: {
                  where: {
                    effectiveFrom: {
                      lte: query.weekEnd,
                    },

                    OR: [
                      {
                        effectiveTo: null,
                      },
                      {
                        effectiveTo: {
                          gte: query.weekStart,
                        },
                      },
                    ],
                  },

                  select: {
                    effectiveFrom: true,
                    effectiveTo: true,

                    targets: {
                      where: {
                        nutrient: {
                          code: {
                            in: [...summaryNutrients],
                          },
                        },
                      },

                      select: {
                        minimumValue: true,
                        targetValue: true,
                        maximumValue: true,

                        nutrient: {
                          select: {
                            code: true,
                            nameUa: true,
                            unit: true,
                            sortOrder: true,
                          },
                        },
                      },

                      orderBy: {
                        nutrient: {
                          sortOrder: "asc",
                        },
                      },
                    },
                  },

                  orderBy: [
                    {
                      effectiveFrom: "desc",
                    },
                    {
                      createdAt: "desc",
                    },
                  ],
                },
              },
            },
          },

          orderBy: [
            {
              joinedAt: "asc",
            },
            {
              id: "asc",
            },
          ],
        }),

        database.mealPlan.findUnique({
          where: {
            familyId_weekStart: {
              familyId,
              weekStart: query.weekStart,
            },
          },

          select: {
            id: true,

            entries: {
              where: {
                removedAt: null,
                date: {
                  gte: query.weekStart,
                  lte: query.weekEnd,
                },

                ...(query.role === "MEMBER"
                  ? {
                      participants: {
                        some: {
                          familyMember: {
                            personProfile: {
                              userId: query.userId,
                            },
                          },
                        },
                      },
                    }
                  : {}),
              },

              select: {
                id: true,
                revision: true,
                date: true,
                mealTypeId: true,
                position: true,
                preparedAt: true,

                cookingAllocations: {
                  where: { releasedAt: null },
                  take: 1,
                  select: {
                    cookingSession: {
                      select: {
                        id: true,
                        status: true,
                        steps: { select: { status: true } },
                      },
                    },
                  },
                },

                product: {
                  select: {
                    id: true,
                    nameUa: true,
                    nameEn: true,

                    category: {
                      select: {
                        code: true,
                        nameUa: true,
                      },
                    },

                    media: {
                      where: {
                        status: "ACTIVE",
                        archivedAt: null,
                      },

                      select: {
                        storageObjectPath: true,
                      },

                      orderBy: [
                        {
                          isPrimary: "desc",
                        },
                        {
                          sortOrder: "asc",
                        },
                        {
                          id: "asc",
                        },
                      ],

                      take: 1,
                    },

                    nutrients: {
                      where: {
                        nutrient: {
                          code: {
                            in: [...summaryNutrients],
                          },
                        },
                      },

                      select: {
                        valuePer100g: true,

                        nutrient: {
                          select: {
                            code: true,
                            nameUa: true,
                            unit: true,
                          },
                        },
                      },
                    },
                  },
                },

                recipe: {
                  select: {
                    id: true,
                    title: true,
                    yieldWeightG: true,
                    difficulty: true,
                    prepTimeMin: true,
                    cookTimeMin: true,
                    restTimeMin: true,

                    recipeType: {
                      select: {
                        code: true,
                        nameUa: true,
                      },
                    },

                    media: {
                      where: {
                        kind: "STORED_IMAGE",
                        status: "ACTIVE",
                        archivedAt: null,
                      },

                      select: {
                        storageObjectPath: true,
                      },

                      orderBy: [
                        {
                          isPrimary: "desc",
                        },
                        {
                          sortOrder: "asc",
                        },
                        {
                          id: "asc",
                        },
                      ],

                      take: 1,
                    },

                    nutrients: {
                      where: {
                        nutrient: {
                          code: {
                            in: [...summaryNutrients],
                          },
                        },
                      },

                      select: {
                        valueTotal: true,

                        completeness: true,

                        nutrient: {
                          select: {
                            code: true,
                            nameUa: true,
                            unit: true,
                          },
                        },
                      },
                    },
                  },
                },

                participants: {
                  ...(query.role === "MEMBER"
                    ? {
                        where: {
                          familyMember: {
                            personProfile: {
                              userId: query.userId,
                            },
                          },
                        },
                      }
                    : {}),

                  select: {
                    familyMemberId: true,

                    quantity: true,

                    quantityInGrams: true,

                    measurementUnit: {
                      select: {
                        symbol: true,
                      },
                    },

                    familyMember: {
                      select: {
                        personProfile: {
                          select: {
                            firstName: true,

                            lastName: true,
                          },
                        },
                      },
                    },
                  },

                  orderBy: {
                    familyMemberId: "asc",
                  },
                },
              },

              orderBy: [
                {
                  date: "asc",
                },

                {
                  mealType: {
                    sortOrder: "asc",
                  },
                },

                {
                  position: "asc",
                },
              ],
            },
          },
        }),
      ]);

      const selected = new Set(query.selectedDates);

      /*
       * Meal types family-wide.
       * Використовуються MealView.
       */
      const configuredMealTypes = [
        ...new Map(
          members
            .flatMap((member) => member.personProfile.mealTypePreferences)
            .map(({ mealType }) => [mealType.id, mealType] as const),
        ).values(),
      ].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));

      const mealTypeById = new Map<string, MealTypeView>(
        configuredMealTypes.map((mealType) => [
          mealType.id,
          {
            id: mealType.id,
            code: mealType.code,
            name: mealType.nameUa,
            sortOrder: mealType.sortOrder,
          },
        ]),
      );

      const placementByEntryId = new Map<string, EntryPlacement>();

      /*
       * Персональні portions для
       * MemberView.
       */
      const memberFoodSources: MemberFoodSource[] = [];

      const entries = (plan?.entries ?? []).map((entry): MealPlanEntryView => {
        const entryDate = dateOnly(entry.date);

        placementByEntryId.set(entry.id, {
          date: entryDate,
          mealTypeId: entry.mealTypeId,
        });

        const view: MealPlanEntryView = {
          id: entry.id,

          revision: entry.revision,

          kind: entry.product ? "product" : "recipe",

          foodId: entry.product?.id ?? entry.recipe!.id,

          name: entry.product
            ? (entry.product.nameUa ?? entry.product.nameEn)
            : entry.recipe!.title,

          imageUrl: null,

          imageObjectPath:
            entry.product?.media[0]?.storageObjectPath ??
            entry.recipe?.media[0]?.storageObjectPath ??
            null,

          categoryCode: entry.product?.category.code ?? null,

          categoryName: entry.product?.category.nameUa ?? null,

          recipeType: entry.recipe?.recipeType
            ? {
                code: entry.recipe.recipeType.code,

                name: entry.recipe.recipeType.nameUa,
              }
            : null,

          totalTimeMin: entry.recipe
            ? (entry.recipe.prepTimeMin ?? 0) +
              (entry.recipe.cookTimeMin ?? 0) +
              (entry.recipe.restTimeMin ?? 0)
            : null,

          difficulty: entry.recipe?.difficulty ?? null,

          preparedAt: entry.preparedAt?.toISOString() ?? null,

          cookingSession: entry.cookingAllocations[0]
            ? {
                id: entry.cookingAllocations[0].cookingSession.id,
                status: entry.cookingAllocations[0].cookingSession.status as
                  "IN_PROGRESS" | "COMPLETED",
                resolvedSteps: entry.cookingAllocations[0].cookingSession.steps.filter(
                  (step) => step.status !== "PENDING",
                ).length,
                totalSteps: entry.cookingAllocations[0].cookingSession.steps.length,
              }
            : null,

          position: entry.position,

          participants: entry.participants.map((participant) => ({
            memberId: participant.familyMemberId,

            name: fullName(participant.familyMember.personProfile),

            quantity: numeric(participant.quantity),

            quantityInGrams: numeric(participant.quantityInGrams),

            unit: participant.measurementUnit.symbol,

            avatarUrl: null,
          })),
        };

        /*
         * Member details потрібні
         * лише для selectedDates.
         */
        if (selected.has(entryDate)) {
          const mealType = mealTypeById.get(entry.mealTypeId);

          if (mealType) {
            for (const participant of entry.participants) {
              const grams = numeric(participant.quantityInGrams);

              const nutrients = portionNutrients(entry, grams);

              const nutrientByCode = new Map(
                nutrients.map((nutrient) => [nutrient.code, nutrient.value] as const),
              );

              const complete =
                nutrients.length === summaryNutrients.length &&
                nutrients.every((nutrient) => nutrient.complete);

              memberFoodSources.push({
                memberId: participant.familyMemberId,

                nutrients,

                complete,

                food: {
                  entryId: entry.id,

                  revision: entry.revision,

                  date: entryDate,

                  mealType,

                  kind: view.kind,

                  foodId: view.foodId,

                  name: view.name,

                  imageUrl: null,

                  imageObjectPath: view.imageObjectPath ?? null,

                  categoryCode: view.categoryCode,

                  categoryName: view.categoryName,

                  recipeType: view.recipeType,

                  preparedAt: view.preparedAt,

                  portionGrams: grams,

                  energyPer100g: energyPer100g(entry),

                  portionEnergyKcal: nutrientByCode.get("energy_kcal") ?? null,

                  macros: {
                    protein: nutrientByCode.get("protein") ?? null,

                    fat: nutrientByCode.get("total_fat") ?? null,

                    carbohydrate: nutrientByCode.get("carbohydrate") ?? null,
                  },
                },
              });
            }
          }
        }

        return view;
      });

      /* ---------------------------- MealView aggregates ---------------------------- */

      const aggregatedMeals = {
        nutrition: aggregateNutrition(memberFoodSources, []),

        all: aggregateMealEntries(entries, placementByEntryId, selected),

        byMealType: configuredMealTypes.map((mealType) => ({
          mealType: {
            id: mealType.id,

            code: mealType.code,

            name: mealType.nameUa,

            sortOrder: mealType.sortOrder,
          },

          nutrition: aggregateNutrition(
            memberFoodSources.filter((source) => source.food.mealType.id === mealType.id),
            [],
          ),

          entries: aggregateMealEntries(entries, placementByEntryId, selected, mealType.id),
        })),
      };

      /* ------------------------------- Raw week days ------------------------------- */

      const days = Array.from(
        {
          length: 7,
        },
        (_, index) => {
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
        },
      );

      /* --------------------------------- Members --------------------------------- */

      const memberViews = members.map((member) => {
        /*
         * Daily targets:
         * НЕ множимо тут на кількість днів.
         */
        const dailyTargetsByDate = new Map(
          query.selectedDates.map((date) => {
            const activeSet = member.personProfile.nutrientTargetSets.find(
              (targetSet) =>
                dateOnly(targetSet.effectiveFrom) <= date &&
                (targetSet.effectiveTo === null || dateOnly(targetSet.effectiveTo) >= date),
            );
            const targets: NutrientTargetAmount[] =
              activeSet?.targets.flatMap(({ nutrient, minimumValue, targetValue, maximumValue }) =>
                minimumValue !== null || targetValue !== null || maximumValue !== null
                  ? [
                      {
                        code: nutrient.code,
                        name: nutrient.nameUa,
                        unit: nutrient.unit,
                        value:
                          targetValue !== null
                            ? numeric(targetValue)
                            : minimumValue !== null && maximumValue !== null
                              ? (numeric(minimumValue) + numeric(maximumValue)) / 2
                              : numeric(minimumValue ?? maximumValue!),
                        minimumValue: minimumValue === null ? null : numeric(minimumValue),
                        targetValue: targetValue === null ? null : numeric(targetValue),
                        maximumValue: maximumValue === null ? null : numeric(maximumValue),
                      },
                    ]
                  : [],
              ) ?? [];

            return [date, targets] as const;
          }),
        );

        /*
         * Overall targets для selectedDates.
         */
        const targetGroups = query.selectedDates.map((date) => dailyTargetsByDate.get(date) ?? []);
        // Не порівнюємо період із неповною нормою: якщо хоча б на один день
        // немає активного target set, клієнт отримає явний стан «цілі відсутні».
        const overallTargets = targetGroups.every((targets) => targets.length > 0)
          ? sumTargets(targetGroups)
          : [];

        const sources = memberFoodSources.filter((source) => source.memberId === member.id);

        const overall = aggregateNutrition(sources, overallTargets);

        /*
         * Для MemberView використовуємо
         * meal types саме цього member.
         */
        const memberMealTypes: MealTypeView[] = member.personProfile.mealTypePreferences
          .map(({ mealType }) => ({
            id: mealType.id,

            code: mealType.code,

            name: mealType.nameUa,

            sortOrder: mealType.sortOrder,
          }))
          .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));

        return {
          memberId: member.id,

          name: fullName(member.personProfile),

          avatarUrl: null,

          planned: overall.planned,

          targets: overall.targets,

          completeness: overall.completeness,

          assessment: overall.assessment,

          details: buildMemberDetails(
            member.id,

            query.selectedDates,

            memberMealTypes,

            memberFoodSources,

            dailyTargetsByDate,
          ),
        };
      });

      return {
        planId: plan?.id ?? null,

        familyId,

        familyName: family.name,

        role: query.role,

        selfMemberId:
          members.find((member) => member.personProfile.userId === query.userId)?.id ?? null,

        selectedDates: query.selectedDates,

        weekStart: dateOnly(query.weekStart),

        weekEnd: dateOnly(query.weekEnd),

        weekStartsOn: family.weekStartsOn,

        timeZone: family.timeZone,

        days,

        aggregatedMeals,

        members: memberViews,
      };
    },

    async readPlanningContext(familyId, userId, role, weekStart, weekEnd) {
      const [family, members] = await Promise.all([
        database.family.findUniqueOrThrow({
          where: {
            id: familyId,
          },

          select: {
            name: true,
          },
        }),

        database.familyMember.findMany({
          where: {
            familyId,

            archivedAt: null,

            personProfile: {
              archivedAt: null,

              ...(role === "MEMBER"
                ? {
                    userId,
                  }
                : {}),
            },
          },

          select: {
            id: true,

            personProfile: {
              select: {
                userId: true,
                firstName: true,
                lastName: true,

                mealTypePreferences: {
                  where: {
                    mealType: {
                      isActive: true,
                    },
                  },

                  select: {
                    mealType: {
                      select: {
                        id: true,
                        code: true,
                        nameUa: true,
                        sortOrder: true,
                      },
                    },
                  },

                  orderBy: {
                    mealType: {
                      sortOrder: "asc",
                    },
                  },
                },
              },
            },
          },

          orderBy: [
            {
              joinedAt: "asc",
            },
            {
              id: "asc",
            },
          ],
        }),
      ]);

      return {
        familyId,

        familyName: family.name,

        role,

        weekStart: dateOnly(weekStart),

        weekEnd: dateOnly(weekEnd),

        availableDays: Array.from(
          {
            length: 7,
          },
          (_, index) => dateOnly(addDays(weekStart, index)),
        ),

        members: members.map((member) => ({
          id: member.id,

          name: fullName(member.personProfile),

          avatarUrl: null,

          isSelf: member.personProfile.userId === userId,

          canPlan: role === "OWNER" || member.personProfile.userId === userId,

          mealTypes: member.personProfile.mealTypePreferences.map(({ mealType }) => ({
            id: mealType.id,

            code: mealType.code,

            name: mealType.nameUa,

            sortOrder: mealType.sortOrder,
          })),
        })),
      };
    },

    async createEntries(command) {
      try {
        return await database.$transaction(
          async (transaction) => {
            const replay = await transaction.mealPlanMutationRequest.findUnique({
              where: {
                familyId_requestId: {
                  familyId: command.familyId,

                  requestId: command.requestId,
                },
              },
            });

            if (replay) {
              if (
                replay.createdByUserId !== command.userId ||
                replay.requestFingerprint !== command.fingerprint
              ) {
                throw new MealPlanIdempotencyConflictError();
              }

              return {
                ...resultFromJson(replay.result),

                replayed: true,
              };
            }

            for (const entry of command.entries) {
              assertDateInRange(entry.date, command.weekStart, command.weekEnd);
            }

            const requestedMemberIds = [
              ...new Set(
                command.entries.flatMap((entry) =>
                  entry.participants.map((participant) => participant.memberId),
                ),
              ),
            ];

            const members = await transaction.familyMember.findMany({
              where: {
                id: {
                  in: requestedMemberIds,
                },

                familyId: command.familyId,

                archivedAt: null,

                personProfile: {
                  archivedAt: null,
                },
              },

              select: {
                id: true,

                personProfile: {
                  select: {
                    userId: true,

                    mealTypePreferences: {
                      select: {
                        mealTypeId: true,
                      },
                    },
                  },
                },
              },
            });

            if (members.length !== requestedMemberIds.length) {
              throw new MealPlanValidationError("One or more family members are unavailable");
            }

            const memberById = new Map(members.map((member) => [member.id, member]));

            for (const entry of command.entries) {
              for (const participant of entry.participants) {
                const member = memberById.get(participant.memberId)!;

                if (command.role !== "OWNER" && member.personProfile.userId !== command.userId) {
                  throw new MealPlanAccessDeniedError();
                }

                if (
                  !member.personProfile.mealTypePreferences.some(
                    (preference) => preference.mealTypeId === entry.mealTypeId,
                  )
                ) {
                  throw new MealPlanValidationError(
                    "Meal type is not enabled for a selected member",
                  );
                }
              }
            }

            await validateFood(transaction, command);

            const gramUnit = await transaction.measurementUnit.findFirst({
              where: {
                dimension: "MASS",

                isBaseUnit: true,

                isActive: true,
              },

              select: {
                id: true,
              },
            });

            if (!gramUnit) {
              throw new MealPlanValidationError("Base mass unit is unavailable");
            }

            const plan = await transaction.mealPlan.upsert({
              where: {
                familyId_weekStart: {
                  familyId: command.familyId,

                  weekStart: command.weekStart,
                },
              },

              create: {
                familyId: command.familyId,

                weekStart: command.weekStart,

                weekStartsOn: await familyWeekStartsOn(
                  transaction,

                  command.familyId,
                ),
              },

              update: {},

              select: {
                id: true,
              },
            });

            const result: {
              id: string;
              revision: number;
            }[] = [];

            for (const input of command.entries) {
              const foodWhere =
                input.kind === "product"
                  ? {
                      productId: input.foodId,
                    }
                  : {
                      recipeId: input.foodId,
                    };

              const existing = await transaction.mealEntry.findFirst({
                where: {
                  mealPlanId: plan.id,

                  removedAt: null,

                  date: new Date(input.date + "T00:00:00.000Z"),

                  mealTypeId: input.mealTypeId,

                  ...foodWhere,
                },

                select: {
                  id: true,
                  revision: true,
                },
              });

              if (existing && command.conflictPolicy === "REJECT") {
                throw new MealPlanConflictError(
                  "This food is already planned for the selected slot",
                );
              }

              if (existing) {
                for (const participant of input.participants) {
                  await transaction.mealEntryParticipant.upsert({
                    where: {
                      mealEntryId_familyMemberId: {
                        mealEntryId: existing.id,

                        familyMemberId: participant.memberId,
                      },
                    },

                    create: {
                      mealEntryId: existing.id,

                      familyMemberId: participant.memberId,

                      quantity: participant.quantityGrams,

                      quantityInGrams: participant.quantityGrams,

                      measurementUnitId: gramUnit.id,
                    },

                    update: {
                      quantity: participant.quantityGrams,

                      quantityInGrams: participant.quantityGrams,

                      measurementUnitId: gramUnit.id,
                    },
                  });
                }

                const updated = await transaction.mealEntry.update({
                  where: {
                    id: existing.id,
                  },

                  data: {
                    revision: {
                      increment: 1,
                    },
                  },

                  select: {
                    id: true,
                    revision: true,
                  },
                });

                await synchronizeUnstartedCookingSession(transaction, existing.id, command.userId);

                result.push(updated);
              } else {
                const last = await transaction.mealEntry.findFirst({
                  where: {
                    mealPlanId: plan.id,

                    removedAt: null,

                    date: new Date(input.date + "T00:00:00.000Z"),

                    mealTypeId: input.mealTypeId,
                  },

                  orderBy: {
                    position: "desc",
                  },

                  select: {
                    position: true,
                  },
                });

                const created = await transaction.mealEntry.create({
                  data: {
                    mealPlanId: plan.id,

                    date: new Date(input.date + "T00:00:00.000Z"),

                    mealTypeId: input.mealTypeId,

                    position: (last?.position ?? 0) + 1,

                    ...(input.kind === "product"
                      ? {
                          productId: input.foodId,
                        }
                      : {
                          recipeId: input.foodId,
                        }),

                    participants: {
                      create: input.participants.map((participant) => ({
                        familyMemberId: participant.memberId,

                        quantity: participant.quantityGrams,

                        quantityInGrams: participant.quantityGrams,

                        measurementUnitId: gramUnit.id,
                      })),
                    },
                  },

                  select: {
                    id: true,
                    revision: true,
                  },
                });

                result.push(created);
              }
            }

            await transaction.mealPlanMutationRequest.create({
              data: {
                familyId: command.familyId,

                requestId: command.requestId,

                requestFingerprint: command.fingerprint,

                createdByUserId: command.userId,

                result: {
                  entries: result,
                },
              },
            });

            return {
              entries: result,

              replayed: false,
            };
          },

          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === "P2002" || error.code === "P2034")
        ) {
          const replay = await database.mealPlanMutationRequest.findUnique({
            where: {
              familyId_requestId: {
                familyId: command.familyId,

                requestId: command.requestId,
              },
            },
          });

          if (replay) {
            if (
              replay.createdByUserId !== command.userId ||
              replay.requestFingerprint !== command.fingerprint
            ) {
              throw new MealPlanIdempotencyConflictError();
            }

            return {
              ...resultFromJson(replay.result),

              replayed: true,
            };
          }

          throw new MealPlanConflictError("Concurrent meal plan update must be retried");
        }

        throw error;
      }
    },

    async updateEntryPlacement(command) {
      if (command.role !== "OWNER") {
        throw new MealPlanAccessDeniedError();
      }

      return database.$transaction(async (transaction) => {
        const entry = await readMutableEntry(transaction, command.familyId, command.entryId);

        assertRevision(entry.revision, command.expectedRevision);

        const plan = entry.mealPlan;

        const weekEnd = addDays(plan.weekStart, 6);

        assertDateInRange(command.date, plan.weekStart, weekEnd);

        const duplicate = await transaction.mealEntry.findFirst({
          where: {
            id: {
              not: entry.id,
            },

            mealPlanId: plan.id,

            removedAt: null,

            date: new Date(command.date + "T00:00:00.000Z"),

            mealTypeId: command.mealTypeId,

            ...(entry.productId
              ? {
                  productId: entry.productId,
                }
              : {
                  recipeId: entry.recipeId,
                }),
          },

          select: {
            id: true,
          },
        });

        if (duplicate) {
          throw new MealPlanConflictError("This food is already planned for the selected slot");
        }

        const sameSlot =
          dateOnly(entry.date) === command.date && entry.mealTypeId === command.mealTypeId;

        const targetPosition = sameSlot
          ? entry.position
          : ((
              await transaction.mealEntry.aggregate({
                where: {
                  mealPlanId: plan.id,

                  date: new Date(command.date + "T00:00:00.000Z"),

                  mealTypeId: command.mealTypeId,
                },

                _max: {
                  position: true,
                },
              })
            )._max.position ?? 0) + 1;

        const allowed = await transaction.personMealTypePreference.count({
          where: {
            mealTypeId: command.mealTypeId,

            personProfile: {
              familyMembers: {
                some: {
                  id: {
                    in: entry.participants.map((item) => item.familyMemberId),
                  },

                  familyId: command.familyId,

                  archivedAt: null,
                },
              },
            },
          },
        });

        if (allowed !== entry.participants.length) {
          throw new MealPlanValidationError("Meal type is not enabled for every participant");
        }

        const updated = await transaction.mealEntry.updateMany({
          where: {
            id: entry.id,

            revision: command.expectedRevision,
          },

          data: {
            date: new Date(command.date + "T00:00:00.000Z"),

            mealTypeId: command.mealTypeId,

            position: targetPosition,

            revision: {
              increment: 1,
            },
          },
        });

        if (updated.count !== 1) {
          throw new MealPlanConflictError();
        }

        return {
          id: entry.id,

          revision: command.expectedRevision + 1,
        };
      });
    },

    async updateParticipant(command) {
      return database.$transaction(async (transaction) => {
        const entry = await readMutableEntry(transaction, command.familyId, command.entryId);

        assertRevision(entry.revision, command.expectedRevision);

        const participant = entry.participants.find(
          (item) => item.familyMemberId === command.memberId,
        );

        if (!participant) {
          throw new MealEntryNotFoundError();
        }

        if (
          command.role !== "OWNER" &&
          participant.familyMember.personProfile.userId !== command.userId
        ) {
          throw new MealPlanAccessDeniedError();
        }

        const unit = await transaction.measurementUnit.findFirstOrThrow({
          where: {
            dimension: "MASS",

            isBaseUnit: true,

            isActive: true,
          },

          select: {
            id: true,
          },
        });

        await transaction.mealEntryParticipant.update({
          where: {
            mealEntryId_familyMemberId: {
              mealEntryId: entry.id,

              familyMemberId: command.memberId,
            },
          },

          data: {
            quantity: command.quantityGrams,

            quantityInGrams: command.quantityGrams,

            measurementUnitId: unit.id,
          },
        });

        const updated = await transaction.mealEntry.updateMany({
          where: {
            id: entry.id,

            revision: command.expectedRevision,
          },

          data: {
            revision: {
              increment: 1,
            },
          },
        });

        if (updated.count !== 1) {
          throw new MealPlanConflictError();
        }

        await synchronizeUnstartedCookingSession(transaction, entry.id, command.userId);

        return {
          id: entry.id,

          revision: command.expectedRevision + 1,
        };
      });
    },

    async setEntryPrepared(command) {
      return database.$transaction(async (transaction) => {
        const entry = await readMutableEntry(transaction, command.familyId, command.entryId);

        assertRevision(entry.revision, command.expectedRevision);

        if (entry.cookingAllocations.length > 0) {
          throw new MealPlanConflictError("Prepared state is controlled by Cooking Mode");
        }

        if (
          command.role !== "OWNER" &&
          !entry.participants.some(
            (participant) => participant.familyMember.personProfile.userId === command.userId,
          )
        ) {
          throw new MealPlanAccessDeniedError();
        }

        const preparedAt = command.prepared ? new Date() : null;

        const updated = await transaction.mealEntry.updateMany({
          where: {
            id: entry.id,

            revision: command.expectedRevision,
          },

          data: {
            preparedAt,

            preparedByUserId: command.prepared ? command.userId : null,

            revision: {
              increment: 1,
            },
          },
        });

        if (updated.count !== 1) {
          throw new MealPlanConflictError();
        }

        return {
          id: entry.id,

          revision: command.expectedRevision + 1,

          preparedAt: preparedAt?.toISOString() ?? null,
        };
      });
    },

    async deleteEntry(command) {
      if (command.role !== "OWNER") {
        throw new MealPlanAccessDeniedError();
      }

      await database.$transaction(async (transaction) => {
        const entry = await readMutableEntry(transaction, command.familyId, command.entryId);

        assertRevision(entry.revision, command.expectedRevision);

        const deleted = await transaction.mealEntry.updateMany({
          where: {
            id: entry.id,

            revision: command.expectedRevision,
          },

          data: {
            removedAt: new Date(),
            removedByUserId: command.userId,
            revision: { increment: 1 },
          },
        });

        if (deleted.count !== 1) {
          throw new MealPlanConflictError();
        }

        await synchronizeUnstartedCookingSession(transaction, entry.id, command.userId, true);
      });
    },

    async deleteParticipant(command) {
      await database.$transaction(async (transaction) => {
        const entry = await readMutableEntry(transaction, command.familyId, command.entryId);

        assertRevision(entry.revision, command.expectedRevision);

        const participant = entry.participants.find(
          (item) => item.familyMemberId === command.memberId,
        );

        if (!participant) {
          throw new MealEntryNotFoundError();
        }

        if (
          command.role !== "OWNER" &&
          participant.familyMember.personProfile.userId !== command.userId
        ) {
          throw new MealPlanAccessDeniedError();
        }

        if (entry.participants.length === 1) {
          const deleted = await transaction.mealEntry.updateMany({
            where: {
              id: entry.id,

              revision: command.expectedRevision,
            },

            data: {
              removedAt: new Date(),
              removedByUserId: command.userId,
              revision: { increment: 1 },
            },
          });

          if (deleted.count !== 1) {
            throw new MealPlanConflictError();
          }

          await synchronizeUnstartedCookingSession(transaction, entry.id, command.userId, true);
        } else {
          await transaction.mealEntryParticipant.delete({
            where: {
              mealEntryId_familyMemberId: {
                mealEntryId: entry.id,

                familyMemberId: command.memberId,
              },
            },
          });

          const updated = await transaction.mealEntry.updateMany({
            where: {
              id: entry.id,

              revision: command.expectedRevision,
            },

            data: {
              revision: {
                increment: 1,
              },
            },
          });

          if (updated.count !== 1) {
            throw new MealPlanConflictError();
          }

          await synchronizeUnstartedCookingSession(transaction, entry.id, command.userId);
        }
      });
    },
  };

  return Object.freeze(repository);
}

/* -------------------------------------------------------------------------- */
/*                              Mutation helpers                              */
/* -------------------------------------------------------------------------- */

async function familyWeekStartsOn(transaction: Prisma.TransactionClient, familyId: string) {
  return (
    await transaction.family.findUniqueOrThrow({
      where: {
        id: familyId,
      },

      select: {
        weekStartsOn: true,
      },
    })
  ).weekStartsOn;
}

async function validateFood(
  transaction: Prisma.TransactionClient,
  command: CreateMealEntriesCommand,
) {
  const products = [
    ...new Set(
      command.entries.filter((entry) => entry.kind === "product").map((entry) => entry.foodId),
    ),
  ];

  const recipes = [
    ...new Set(
      command.entries.filter((entry) => entry.kind === "recipe").map((entry) => entry.foodId),
    ),
  ];

  const [productCount, recipeCount] = await Promise.all([
    transaction.product.count({
      where: {
        id: {
          in: products,
        },

        status: "ACTIVE",

        archivedAt: null,
      },
    }),

    transaction.recipe.count({
      where: {
        id: {
          in: recipes,
        },

        status: "PUBLISHED",

        archivedAt: null,

        OR: [
          {
            visibility: "PUBLIC",
          },
          {
            visibility: "FAMILY",

            familyId: command.familyId,
          },
        ],
      },
    }),
  ]);

  if (productCount !== products.length || recipeCount !== recipes.length) {
    throw new MealPlanValidationError("One or more food items are unavailable");
  }
}

async function synchronizeUnstartedCookingSession(
  transaction: Prisma.TransactionClient,
  entryId: string,
  actorUserId: string,
  releaseEntry = false,
) {
  const allocation = await transaction.cookingSessionMealEntry.findFirst({
    where: {
      mealEntryId: entryId,
      releasedAt: null,
      cookingSession: { status: "IN_PROGRESS" },
    },
    select: {
      cookingSessionId: true,
      mealEntryId: true,
      cookingSession: {
        select: {
          id: true,
          revision: true,
          plannedYieldWeightG: true,
          actualYieldWeightG: true,
          ingredients: {
            select: {
              id: true,
              source: true,
              status: true,
              actualProductId: true,
              actualQuantity: true,
              actualGramWeight: true,
              plannedQuantity: true,
              plannedGramWeight: true,
            },
          },
          steps: { select: { status: true } },
          mealEntries: {
            where: { releasedAt: null },
            select: {
              cookingSessionId: true,
              mealEntryId: true,
              mealEntry: {
                select: {
                  participants: { select: { quantityInGrams: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!allocation) return;

  const session = allocation.cookingSession;
  const hasProgress =
    session.actualYieldWeightG !== null ||
    session.steps.some((step) => step.status !== "PENDING") ||
    session.ingredients.some(
      (ingredient) =>
        ingredient.source === "ADDED_DURING_COOKING" ||
        ingredient.status !== "PENDING" ||
        ingredient.actualProductId !== null ||
        ingredient.actualQuantity !== null ||
        ingredient.actualGramWeight !== null,
    );

  if (hasProgress) return;

  const remainingAllocations = releaseEntry
    ? session.mealEntries.filter((item) => item.mealEntryId !== allocation.mealEntryId)
    : session.mealEntries;

  if (releaseEntry) {
    await transaction.cookingSessionMealEntry.update({
      where: {
        cookingSessionId_mealEntryId: {
          cookingSessionId: allocation.cookingSessionId,
          mealEntryId: allocation.mealEntryId,
        },
      },
      data: { releasedAt: new Date() },
    });
  }

  if (remainingAllocations.length === 0) {
    const cancelled = await transaction.cookingSession.updateMany({
      where: { id: session.id, revision: session.revision, status: "IN_PROGRESS" },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledByUserId: actorUserId,
        revision: { increment: 1 },
      },
    });

    if (cancelled.count !== 1) throw new MealPlanConflictError();

    return;
  }

  const demands = remainingAllocations.map((item) => ({
    cookingSessionId: item.cookingSessionId,
    mealEntryId: item.mealEntryId,
    weightG: item.mealEntry.participants.reduce(
      (sum, participant) => sum + participant.quantityInGrams.toNumber(),
      0,
    ),
  }));
  const newPlannedYieldWeightG = demands.reduce((sum, item) => sum + item.weightG, 0);
  const oldPlannedYieldWeightG = session.plannedYieldWeightG?.toNumber() ?? newPlannedYieldWeightG;
  const scale = oldPlannedYieldWeightG > 0 ? newPlannedYieldWeightG / oldPlannedYieldWeightG : 1;

  for (const demand of demands) {
    await transaction.cookingSessionMealEntry.update({
      where: {
        cookingSessionId_mealEntryId: {
          cookingSessionId: demand.cookingSessionId,
          mealEntryId: demand.mealEntryId,
        },
      },
      data: { plannedDemandWeightG: demand.weightG },
    });
  }

  for (const ingredient of session.ingredients) {
    if (ingredient.source !== "RECIPE") continue;

    await transaction.cookingSessionIngredient.update({
      where: { id: ingredient.id },
      data: {
        plannedQuantity:
          ingredient.plannedQuantity === null
            ? null
            : ingredient.plannedQuantity.toNumber() * scale,
        plannedGramWeight:
          ingredient.plannedGramWeight === null
            ? null
            : ingredient.plannedGramWeight.toNumber() * scale,
      },
    });
  }

  const updated = await transaction.cookingSession.updateMany({
    where: { id: session.id, revision: session.revision, status: "IN_PROGRESS" },
    data: {
      plannedYieldWeightG: newPlannedYieldWeightG,
      revision: { increment: 1 },
    },
  });

  if (updated.count !== 1) throw new MealPlanConflictError();
}

async function readMutableEntry(
  transaction: Prisma.TransactionClient,
  familyId: string,
  entryId: string,
) {
  const entry = await transaction.mealEntry.findFirst({
    where: {
      id: entryId,

      removedAt: null,

      mealPlan: {
        familyId,
      },
    },

    select: {
      id: true,
      revision: true,
      date: true,
      mealTypeId: true,
      position: true,
      productId: true,
      recipeId: true,

      cookingAllocations: {
        where: { releasedAt: null },
        select: { cookingSession: { select: { id: true, status: true } } },
      },

      mealPlan: {
        select: {
          id: true,
          weekStart: true,
        },
      },

      participants: {
        select: {
          familyMemberId: true,

          familyMember: {
            select: {
              personProfile: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!entry) {
    throw new MealEntryNotFoundError();
  }

  return entry;
}

function assertRevision(actual: number, expected: number) {
  if (actual !== expected) {
    throw new MealPlanConflictError();
  }
}
