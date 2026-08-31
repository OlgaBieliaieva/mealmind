import type { ActiveFamilyContextResolver } from "../../../application/family-context/active-family-context.js";
import {
  ShoppingListNotFoundError,
  ShoppingListPeriodInPastError,
  ShoppingListValidationError,
} from "./shopping-list-errors.js";
import type {
  ShoppingListDetail,
  ShoppingListItemStatus,
  ShoppingListRepository,
  ShoppingListStatus,
  ShoppingListSummary,
} from "../domain/shopping-list-repository.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: string): Date {
  if (!DATE_PATTERN.test(value)) {
    throw new ShoppingListValidationError("Date must use YYYY-MM-DD format");
  }
  const result = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(result.getTime()) || result.toISOString().slice(0, 10) !== value) {
    throw new ShoppingListValidationError("Date is invalid");
  }
  return result;
}

function familyToday(now: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    throw new ShoppingListValidationError("Family time zone is invalid");
  }
}

function validatePeriod(start: string, end: string, today: string): void {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  const duration = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
  if (duration < 1 || duration > 7) {
    throw new ShoppingListValidationError("Shopping list period must contain 1 to 7 days");
  }
  if (start < today) {
    throw new ShoppingListPeriodInPastError();
  }
}

export interface ShoppingListService {
  list(userId: string): Promise<readonly ShoppingListSummary[]>;
  read(userId: string, listId: string): Promise<ShoppingListDetail>;
  generate(
    userId: string,
    input: { mealPlanId: string; periodStart: string; periodEnd: string },
  ): Promise<ShoppingListDetail>;
  regenerate(userId: string, listId: string, expectedRevision: number): Promise<ShoppingListDetail>;
  updateItem(
    userId: string,
    listId: string,
    itemId: string,
    input: {
      expectedRevision: number;
      requestedQuantity?: number | undefined;
      resetQuantity?: boolean | undefined;
      notes?: string | null | undefined;
    },
  ): Promise<ShoppingListDetail>;
  setItemStatus(
    userId: string,
    listId: string,
    itemId: string,
    expectedRevision: number,
    status: ShoppingListItemStatus,
  ): Promise<ShoppingListDetail>;
  addCatalogItem(
    userId: string,
    listId: string,
    input: { expectedRevision: number; productId: string; quantity: number },
  ): Promise<ShoppingListDetail>;
  addCustomItem(
    userId: string,
    listId: string,
    input: {
      expectedRevision: number;
      name: string;
      quantity?: number | undefined;
      measurementUnitId?: string | undefined;
      notes?: string | undefined;
    },
  ): Promise<ShoppingListDetail>;
  setStatus(
    userId: string,
    listId: string,
    expectedRevision: number,
    status: ShoppingListStatus,
  ): Promise<ShoppingListDetail>;
}

export function createShoppingListService(
  repository: ShoppingListRepository,
  familyContext: ActiveFamilyContextResolver,
  clock: () => Date = () => new Date(),
): ShoppingListService {
  async function family(userId: string) {
    return familyContext.resolve(userId);
  }

  const service: ShoppingListService = {
    async list(userId) {
      const context = await family(userId);
      const today = familyToday(clock(), context.timeZone);
      const lists = await repository.list(context.id);
      return [...lists].sort((left, right) => {
        const leftDistance = Math.abs(
          parseDate(left.periodStart).getTime() - parseDate(today).getTime(),
        );
        const rightDistance = Math.abs(
          parseDate(right.periodStart).getTime() - parseDate(today).getTime(),
        );
        return leftDistance - rightDistance || left.periodStart.localeCompare(right.periodStart);
      });
    },
    async read(userId, listId) {
      const context = await family(userId);
      const list = await repository.find(context.id, listId);
      if (!list) {
        throw new ShoppingListNotFoundError();
      }
      return list;
    },
    async generate(userId, input) {
      const context = await family(userId);
      validatePeriod(input.periodStart, input.periodEnd, familyToday(clock(), context.timeZone));
      return repository.generate({ ...input, familyId: context.id, userId });
    },
    async regenerate(userId, listId, expectedRevision) {
      const context = await family(userId);
      const existing = await repository.find(context.id, listId);
      if (!existing) {
        throw new ShoppingListNotFoundError();
      }
      validatePeriod(
        existing.periodStart,
        existing.periodEnd,
        familyToday(clock(), context.timeZone),
      );
      return repository.regenerate({ familyId: context.id, userId, listId, expectedRevision });
    },
    async updateItem(userId, listId, itemId, input) {
      const context = await family(userId);
      return repository.updateItem({ familyId: context.id, listId, itemId, ...input });
    },
    async setItemStatus(userId, listId, itemId, expectedRevision, status) {
      const context = await family(userId);
      return repository.setItemStatus({
        familyId: context.id,
        listId,
        itemId,
        expectedRevision,
        status,
      });
    },
    async addCatalogItem(userId, listId, input) {
      const context = await family(userId);
      return repository.addCatalogItem({ familyId: context.id, userId, listId, ...input });
    },
    async addCustomItem(userId, listId, input) {
      const context = await family(userId);
      return repository.addCustomItem({ familyId: context.id, userId, listId, ...input });
    },
    async setStatus(userId, listId, expectedRevision, status) {
      const context = await family(userId);
      return repository.setStatus({
        familyId: context.id,
        listId,
        expectedRevision,
        status,
      });
    },
  };
  return Object.freeze(service);
}
