import { createHash } from "node:crypto";

import type { ActiveFamilyContextResolver } from "../../../application/family-context/active-family-context.js";
import { MealPlanValidationError } from "./meal-plan-errors.js";
import type {
  BatchEntryInput,
  MealPlanRepository,
  MealPlanWeekView,
  PlanningContextView,
} from "../domain/meal-plan-repository.js";
import {
  thumbnailObjectPath,
  type ProductMediaStorage,
} from "../../product/domain/product-media-storage.js";
import {
  recipeThumbnailObjectPath,
  type RecipeMediaStorage,
} from "../../recipe/domain/recipe-media-storage.js";

const weekDayIndex = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;

export interface CreateEntriesInput {
  readonly requestId: string;
  readonly conflictPolicy: "REJECT" | "UPSERT_PARTICIPANTS";
  readonly entries: readonly BatchEntryInput[];
}

export interface MealPlanService {
  readWeek(
    userId: string,
    anchorDate: string,
    selectedDates?: readonly string[],
  ): Promise<MealPlanWeekView>;
  readPlanningContext(userId: string, anchorDate: string): Promise<PlanningContextView>;
  createEntries(userId: string, anchorDate: string, input: CreateEntriesInput): Promise<unknown>;
  updateEntryPlacement(
    userId: string,
    entryId: string,
    input: { expectedRevision: number; date: string; mealTypeId: string },
  ): Promise<unknown>;
  updateParticipant(
    userId: string,
    entryId: string,
    memberId: string,
    input: { expectedRevision: number; quantityGrams: number },
  ): Promise<unknown>;
  setEntryPrepared(
    userId: string,
    entryId: string,
    input: { expectedRevision: number; prepared: boolean },
  ): Promise<unknown>;
  deleteEntry(userId: string, entryId: string, expectedRevision: number): Promise<void>;
  deleteParticipant(
    userId: string,
    entryId: string,
    memberId: string,
    expectedRevision: number,
  ): Promise<void>;
}

function parseDate(value: string): Date {
  return new Date(value + "T00:00:00.000Z");
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function weekRange(anchorDate: string, weekStartsOn: keyof typeof weekDayIndex) {
  const anchor = parseDate(anchorDate);
  const offset = (anchor.getUTCDay() - weekDayIndex[weekStartsOn] + 7) % 7;
  const weekStart = addDays(anchor, -offset);
  return { weekStart, weekEnd: addDays(weekStart, 6) };
}

function canonicalSelectedDates(
  values: readonly string[] | undefined,
  weekStart: Date,
  weekEnd: Date,
) {
  const start = dateOnly(weekStart);
  const end = dateOnly(weekEnd);
  const result = [...new Set(values ?? [])].sort();
  if (result.some((value) => value < start || value > end)) {
    throw new MealPlanValidationError("Selected dates must belong to the active week");
  }
  return result;
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function createMealPlanService(
  repository: MealPlanRepository,
  familyContext: ActiveFamilyContextResolver,
  mediaStorage?: {
    readonly products: Pick<ProductMediaStorage, "createReadUrl">;
    readonly recipes: Pick<RecipeMediaStorage, "createReadUrl">;
  },
): MealPlanService {
  const service: MealPlanService = {
    async readWeek(userId, anchorDate, selectedDates) {
      const family = await familyContext.resolve(userId);
      const range = weekRange(anchorDate, family.weekStartsOn);

      const week = await repository.readWeek(family.id, {
        ...range,

        selectedDates: canonicalSelectedDates(
          selectedDates ?? [anchorDate],
          range.weekStart,
          range.weekEnd,
        ),

        userId,
        role: family.role,
      });
      // Signed URLs мають обмежений строк дії. Кеш потрібен лише для усунення
      // повторних підписів у межах однієї відповіді, а не між HTTP-запитами.
      const imageUrlCache = new Map<string, Promise<string>>();

      const resolveImage = async <
        T extends {
          readonly kind: "product" | "recipe";
          readonly imageUrl: string | null;
          readonly imageObjectPath?: string | null;
        },
      >(
        source: T,
      ) => {
        const { imageObjectPath, ...entry } = source;

        if (!imageObjectPath || !mediaStorage) {
          return entry;
        }

        try {
          const cacheKey = `${source.kind}:${imageObjectPath}`;

          let urlPromise = imageUrlCache.get(cacheKey);

          if (!urlPromise) {
            urlPromise =
              source.kind === "product"
                ? mediaStorage.products.createReadUrl(thumbnailObjectPath(imageObjectPath))
                : mediaStorage.recipes.createReadUrl(recipeThumbnailObjectPath(imageObjectPath));

            imageUrlCache.set(cacheKey, urlPromise);
          }

          const imageUrl = await urlPromise;

          return {
            ...entry,
            imageUrl,
          };
        } catch {
          return entry;
        }
      };

      return {
        ...week,

        days: await Promise.all(
          week.days.map(async (day) => ({
            ...day,

            meals: await Promise.all(
              day.meals.map(async (meal) => ({
                ...meal,

                entries: await Promise.all(meal.entries.map(resolveImage)),
              })),
            ),
          })),
        ),

        aggregatedMeals: {
          nutrition: week.aggregatedMeals.nutrition,

          all: await Promise.all(week.aggregatedMeals.all.map(resolveImage)),

          byMealType: await Promise.all(
            week.aggregatedMeals.byMealType.map(async (group) => ({
              ...group,

              entries: await Promise.all(group.entries.map(resolveImage)),
            })),
          ),
        },
        members: await Promise.all(
          week.members.map(async (member) => ({
            ...member,

            details: {
              days: await Promise.all(
                member.details.days.map(async (day) => ({
                  ...day,

                  meals: await Promise.all(
                    day.meals.map(async (meal) => ({
                      ...meal,

                      entries: await Promise.all(meal.entries.map(resolveImage)),
                    })),
                  ),
                })),
              ),

              mealTypes: await Promise.all(
                member.details.mealTypes.map(async (meal) => ({
                  ...meal,

                  entries: await Promise.all(meal.entries.map(resolveImage)),
                })),
              ),
            },
          })),
        ),
      };
    },

    async readPlanningContext(userId, anchorDate) {
      const family = await familyContext.resolve(userId);
      const range = weekRange(anchorDate, family.weekStartsOn);
      return repository.readPlanningContext(
        family.id,
        userId,
        family.role,
        range.weekStart,
        range.weekEnd,
      );
    },

    async createEntries(userId, anchorDate, input) {
      const family = await familyContext.resolve(userId);
      const range = weekRange(anchorDate, family.weekStartsOn);
      const normalized = {
        conflictPolicy: input.conflictPolicy,
        entries: [...input.entries]
          .map((entry) => ({
            ...entry,
            participants: [...entry.participants].sort((a, b) =>
              a.memberId.localeCompare(b.memberId),
            ),
          }))
          .sort((a, b) =>
            `${a.date}:${a.mealTypeId}:${a.kind}:${a.foodId}`.localeCompare(
              `${b.date}:${b.mealTypeId}:${b.kind}:${b.foodId}`,
            ),
          ),
      };
      return repository.createEntries({
        familyId: family.id,
        userId,
        role: family.role,
        ...range,
        requestId: input.requestId,
        fingerprint: fingerprint(normalized),
        ...normalized,
      });
    },

    async updateEntryPlacement(userId, entryId, input) {
      const family = await familyContext.resolve(userId);
      return repository.updateEntryPlacement({
        familyId: family.id,
        userId,
        role: family.role,
        entryId,
        ...input,
      });
    },

    async updateParticipant(userId, entryId, memberId, input) {
      const family = await familyContext.resolve(userId);
      return repository.updateParticipant({
        familyId: family.id,
        userId,
        role: family.role,
        entryId,
        memberId,
        ...input,
      });
    },

    async setEntryPrepared(userId, entryId, input) {
      const family = await familyContext.resolve(userId);
      return repository.setEntryPrepared({
        familyId: family.id,
        userId,
        role: family.role,
        entryId,
        ...input,
      });
    },

    async deleteEntry(userId, entryId, expectedRevision) {
      const family = await familyContext.resolve(userId);
      await repository.deleteEntry({
        familyId: family.id,
        userId,
        role: family.role,
        entryId,
        expectedRevision,
      });
    },

    async deleteParticipant(userId, entryId, memberId, expectedRevision) {
      const family = await familyContext.resolve(userId);
      await repository.deleteParticipant({
        familyId: family.id,
        userId,
        role: family.role,
        entryId,
        memberId,
        expectedRevision,
      });
    },
  };
  return Object.freeze(service);
}
