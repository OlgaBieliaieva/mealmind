import type { ActiveFamilyContextResolver } from "../../../application/family-context/active-family-context.js";
import type { RecipeMediaStorage } from "../../recipe/domain/recipe-media-storage.js";
import type { CookingRepository, CookingSessionView } from "../domain/cooking-repository.js";

export type CookingSessionResponse = Omit<CookingSessionView, "recipe"> & {
  readonly recipe: Omit<CookingSessionView["recipe"], "imageObjectPath"> & {
    readonly imageUrl: string | null;
  };
};

export interface CookingService {
  start(
    userId: string,
    input: Parameters<CookingRepository["start"]>[1],
  ): Promise<CookingSessionResponse>;
  find(userId: string, sessionId: string): Promise<CookingSessionResponse>;
  updateIngredient(
    userId: string,
    sessionId: string,
    ingredientId: string,
    input: Parameters<CookingRepository["updateIngredient"]>[3],
  ): Promise<CookingSessionResponse>;
  addIngredient(
    userId: string,
    sessionId: string,
    input: Parameters<CookingRepository["addIngredient"]>[2],
  ): Promise<CookingSessionResponse>;
  deleteIngredient(
    userId: string,
    sessionId: string,
    ingredientId: string,
    expectedRevision: number,
  ): Promise<CookingSessionResponse>;
  updateStep(
    userId: string,
    sessionId: string,
    stepId: string,
    input: Parameters<CookingRepository["updateStep"]>[3],
  ): Promise<CookingSessionResponse>;
  updateYield(
    userId: string,
    sessionId: string,
    input: Parameters<CookingRepository["updateYield"]>[2],
  ): Promise<CookingSessionResponse>;
  complete(
    userId: string,
    sessionId: string,
    input: Parameters<CookingRepository["complete"]>[2],
  ): Promise<CookingSessionResponse>;
  cancel(
    userId: string,
    sessionId: string,
    expectedRevision: number,
  ): Promise<CookingSessionResponse>;
}

export function createCookingService(
  repository: CookingRepository,
  familyContext: ActiveFamilyContextResolver,
  mediaStorage?: RecipeMediaStorage,
): CookingService {
  async function actor(userId: string) {
    const family = await familyContext.resolve(userId);
    return { userId, familyId: family.id, role: family.role } as const;
  }
  async function response(value: Promise<CookingSessionView>): Promise<CookingSessionResponse> {
    const session = await value;
    const { imageObjectPath, ...recipe } = session.recipe;
    let imageUrl: string | null = null;
    if (imageObjectPath && mediaStorage) {
      try {
        imageUrl = await mediaStorage.createReadUrl(imageObjectPath);
      } catch {
        // Недоступне зображення не повинно блокувати Cooking Mode.
      }
    }
    return { ...session, recipe: { ...recipe, imageUrl } };
  }
  const service: CookingService = {
    async start(userId, input) {
      return response(repository.start(await actor(userId), input));
    },
    async find(userId, sessionId) {
      return response(repository.find(await actor(userId), sessionId));
    },
    async updateIngredient(userId, sessionId, ingredientId, input) {
      return response(
        repository.updateIngredient(await actor(userId), sessionId, ingredientId, input),
      );
    },
    async addIngredient(userId, sessionId, input) {
      return response(repository.addIngredient(await actor(userId), sessionId, input));
    },
    async deleteIngredient(userId, sessionId, ingredientId, expectedRevision) {
      return response(
        repository.deleteIngredient(await actor(userId), sessionId, ingredientId, expectedRevision),
      );
    },
    async updateStep(userId, sessionId, stepId, input) {
      return response(repository.updateStep(await actor(userId), sessionId, stepId, input));
    },
    async updateYield(userId, sessionId, input) {
      return response(repository.updateYield(await actor(userId), sessionId, input));
    },
    async complete(userId, sessionId, input) {
      return response(repository.complete(await actor(userId), sessionId, input));
    },
    async cancel(userId, sessionId, expectedRevision) {
      return response(repository.cancel(await actor(userId), sessionId, expectedRevision));
    },
  };
  return Object.freeze(service);
}
