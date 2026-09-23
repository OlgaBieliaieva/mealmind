export type CookingActor = Readonly<{
  userId: string;
  familyId: string;
  role: "OWNER" | "MEMBER";
}>;

export interface CookingSessionView {
  readonly id: string;
  readonly recipeId: string;
  readonly status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  readonly revision: number;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly cancelledAt: string | null;
  readonly recipe: {
    readonly title: string;
    readonly summary: string | null;
    readonly description: string | null;
    readonly difficulty: string | null;
    readonly prepTimeMin: number | null;
    readonly cookTimeMin: number | null;
    readonly restTimeMin: number | null;
    readonly imageObjectPath: string | null;
  };
  readonly planEntries: readonly {
    readonly id: string;
    readonly date: string;
    readonly mealType: string;
    readonly plannedDemandWeightG: number;
    readonly removed: boolean;
  }[];
  readonly ingredients: readonly {
    readonly id: string;
    readonly source: "RECIPE" | "ADDED_DURING_COOKING";
    readonly position: number;
    readonly status: "PENDING" | "USED" | "OMITTED" | "SUBSTITUTED";
    readonly planned: null | {
      readonly productId: string;
      readonly productName: string;
      readonly quantity: number;
      readonly unit: string | null;
      readonly gramWeight: number | null;
    };
    readonly actual: null | {
      readonly productId: string;
      readonly productName: string;
      readonly quantity: number;
      readonly unit: string | null;
      readonly gramWeight: number | null;
    };
  }[];
  readonly steps: readonly {
    readonly id: string;
    readonly position: number;
    readonly instruction: string;
    readonly timerSeconds: number | null;
    readonly status: "PENDING" | "COMPLETED" | "SKIPPED";
  }[];
  readonly progress: {
    readonly resolvedIngredients: number;
    readonly totalIngredients: number;
    readonly resolvedSteps: number;
    readonly totalSteps: number;
  };
  readonly nutrition: {
    readonly basis: "ACTUAL" | "PLANNED_ESTIMATE" | "UNAVAILABLE";
    readonly completeness: "COMPLETE" | "PARTIAL" | "UNVERIFIED";
    readonly nutrients: readonly {
      readonly nutrientId: string;
      readonly code: string;
      readonly name: string;
      readonly unit: string;
      readonly valueTotal: number;
      readonly valuePer100g: number | null;
    }[];
  };
  readonly yield: {
    readonly plannedWeightG: number;
    readonly actualWeightG: number | null;
    readonly method: "DIRECT" | "CONTAINER_DIFFERENCE" | null;
    readonly tareWeightG: number | null;
    readonly grossWeightG: number | null;
  };
  readonly hasCookingProgress: boolean;
  readonly canComplete: boolean;
}

export interface CookingRepository {
  start(
    actor: CookingActor,
    input: {
      requestId: string;
      mealEntries: readonly { id: string; expectedRevision: number }[];
    },
  ): Promise<CookingSessionView>;
  find(actor: CookingActor, sessionId: string): Promise<CookingSessionView>;
  updateIngredient(
    actor: CookingActor,
    sessionId: string,
    ingredientId: string,
    input: {
      expectedRevision: number;
      status: "USED" | "OMITTED" | "SUBSTITUTED";
      productId?: string | undefined;
      quantityGrams?: number | undefined;
    },
  ): Promise<CookingSessionView>;
  addIngredient(
    actor: CookingActor,
    sessionId: string,
    input: {
      expectedRevision: number;
      productId: string;
      quantityGrams: number;
    },
  ): Promise<CookingSessionView>;
  deleteIngredient(
    actor: CookingActor,
    sessionId: string,
    ingredientId: string,
    expectedRevision: number,
  ): Promise<CookingSessionView>;
  updateStep(
    actor: CookingActor,
    sessionId: string,
    stepId: string,
    input: {
      expectedRevision: number;
      status: "COMPLETED" | "SKIPPED";
    },
  ): Promise<CookingSessionView>;
  updateYield(
    actor: CookingActor,
    sessionId: string,
    input: {
      expectedRevision: number;
      method: "DIRECT" | "CONTAINER_DIFFERENCE" | null;
      actualWeightG?: number | undefined;
      tareWeightG?: number | undefined;
      grossWeightG?: number | undefined;
    },
  ): Promise<CookingSessionView>;
  complete(
    actor: CookingActor,
    sessionId: string,
    input: {
      expectedRevision: number;
      resolvePending: boolean;
    },
  ): Promise<CookingSessionView>;
  cancel(
    actor: CookingActor,
    sessionId: string,
    expectedRevision: number,
  ): Promise<CookingSessionView>;
}
