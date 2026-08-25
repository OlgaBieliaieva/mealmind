import type { ActiveFamilyContextResolver } from "../../../application/family-context/active-family-context.js";
import type { MealPlanRepository, MealPlanWeekView } from "../domain/meal-plan-repository.js";

const weekDayIndex = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;

export interface MealPlanService {
  readWeek(userId: string, anchorDate: string): Promise<MealPlanWeekView>;
}

function parseDate(value: string): Date {
  return new Date(value + "T00:00:00.000Z");
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function createMealPlanService(
  repository: MealPlanRepository,
  familyContext: ActiveFamilyContextResolver,
): MealPlanService {
  const service: MealPlanService = {
    async readWeek(userId, anchorDate) {
      const family = await familyContext.resolve(userId);
      const anchor = parseDate(anchorDate);
      const startDay = weekDayIndex[family.weekStartsOn];
      const offset = (anchor.getUTCDay() - startDay + 7) % 7;
      const weekStart = addDays(anchor, -offset);

      return repository.readWeek(family.id, {
        weekStart,
        weekEnd: addDays(weekStart, 6),
      });
    },
  };

  return Object.freeze(service);
}
