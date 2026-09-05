import type { ActiveFamilyContextResolver } from "../../../application/family-context/active-family-context.js";
import type {
  ConsumptionDashboard,
  ConsumptionRepository,
  DiaryDay,
  DiaryFoodKind,
} from "../domain/consumption-repository.js";
import {
  thumbnailObjectPath,
  type ProductMediaStorage,
} from "../../product/domain/product-media-storage.js";
import {
  recipeThumbnailObjectPath,
  type RecipeMediaStorage,
} from "../../recipe/domain/recipe-media-storage.js";

export interface ConsumptionService {
  readDay(userId: string, date: string): Promise<DiaryDay>;
  readDashboard(userId: string, dates: readonly string[]): Promise<ConsumptionDashboard>;
  confirmPlanned(userId: string, participantId: string, quantityGrams?: number): Promise<DiaryDay>;
  skipPlanned(userId: string, participantId: string, date: string): Promise<DiaryDay>;
  restorePlanned(userId: string, participantId: string, date: string): Promise<DiaryDay>;
  updateEntry(
    userId: string,
    entryId: string,
    input: {
      expectedRevision: number;
      quantityGrams: number;
      mealTypeId: string;
      date: string;
    },
  ): Promise<DiaryDay>;
  voidEntry(
    userId: string,
    entryId: string,
    input: { expectedRevision: number; date: string },
  ): Promise<DiaryDay>;
  addManual(
    userId: string,
    input: {
      memberId: string;
      date: string;
      kind: DiaryFoodKind;
      foodId: string;
      mealTypeId: string;
      quantityGrams: number;
    },
  ): Promise<DiaryDay>;
}

export function createConsumptionService(
  repository: ConsumptionRepository,
  familyContext: ActiveFamilyContextResolver,
  mediaStorage?: {
    readonly products: Pick<ProductMediaStorage, "createReadUrl">;
    readonly recipes: Pick<RecipeMediaStorage, "createReadUrl">;
  },
): ConsumptionService {
  async function context(userId: string) {
    return familyContext.resolve(userId);
  }
  async function read(userId: string, date: string): Promise<DiaryDay> {
    const family = await context(userId);
    const day = await repository.readDay({
      familyId: family.id,
      familyName: family.name,
      timeZone: family.timeZone,
      role: family.role,
      userId,
      date,
    });
    const cache = new Map<string, Promise<string>>();
    return {
      ...day,
      members: await Promise.all(
        day.members.map(async (member) => ({
          ...member,
          items: await Promise.all(
            member.items.map(async (item) => {
              const { imageObjectPath, ...visible } = item;
              if (!imageObjectPath || !mediaStorage) return visible;
              try {
                const key = `${item.kind}:${imageObjectPath}`;
                let url = cache.get(key);
                if (!url) {
                  url =
                    item.kind === "product"
                      ? mediaStorage.products.createReadUrl(thumbnailObjectPath(imageObjectPath))
                      : mediaStorage.recipes.createReadUrl(
                          recipeThumbnailObjectPath(imageObjectPath),
                        );
                  cache.set(key, url);
                }
                return { ...visible, imageUrl: await url };
              } catch {
                return visible;
              }
            }),
          ),
        })),
      ),
    };
  }
  const service: ConsumptionService = {
    readDay: read,
    async readDashboard(userId, dates) {
      const family = await context(userId);
      return repository.readDashboard({
        familyId: family.id,
        familyName: family.name,
        timeZone: family.timeZone,
        role: family.role,
        userId,
        dates,
      });
    },
    async confirmPlanned(userId, participantId, quantityGrams) {
      const family = await context(userId);
      await repository.confirmPlanned({
        familyId: family.id,
        role: family.role,
        userId,
        participantId,
        ...(quantityGrams === undefined ? {} : { quantityGrams }),
      });
      const day = await repository.readDay({
        familyId: family.id,
        familyName: family.name,
        timeZone: family.timeZone,
        role: family.role,
        userId,
        date: await repository.participantDate(family.id, participantId),
      });
      return day;
    },
    async skipPlanned(userId, participantId, date) {
      const family = await context(userId);
      await repository.skipPlanned({
        familyId: family.id,
        role: family.role,
        userId,
        participantId,
      });
      return read(userId, date);
    },
    async restorePlanned(userId, participantId, date) {
      const family = await context(userId);
      await repository.restorePlanned({
        familyId: family.id,
        role: family.role,
        userId,
        participantId,
      });
      return read(userId, date);
    },
    async updateEntry(userId, entryId, input) {
      const family = await context(userId);
      await repository.updateEntry({
        familyId: family.id,
        role: family.role,
        userId,
        entryId,
        expectedRevision: input.expectedRevision,
        quantityGrams: input.quantityGrams,
        mealTypeId: input.mealTypeId,
      });
      return read(userId, input.date);
    },
    async voidEntry(userId, entryId, input) {
      const family = await context(userId);
      await repository.voidEntry({
        familyId: family.id,
        role: family.role,
        userId,
        entryId,
        expectedRevision: input.expectedRevision,
      });
      return read(userId, input.date);
    },
    async addManual(userId, input) {
      const family = await context(userId);
      await repository.addManual({ familyId: family.id, role: family.role, userId, ...input });
      return read(userId, input.date);
    },
  };
  return Object.freeze(service);
}
