import type { ApiClient } from "./api-client";

export interface CookingIngredientAmount {
  readonly productId: string;
  readonly productName: string;
  readonly quantity: number;
  readonly unit: string | null;
  readonly gramWeight: number | null;
}

export interface CookingSession {
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
    readonly imageUrl: string | null;
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
    readonly planned: CookingIngredientAmount | null;
    readonly actual: CookingIngredientAmount | null;
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

type SessionResponse = { readonly data: CookingSession };

export function startCookingSession(
  client: ApiClient,
  mealEntries: readonly { readonly id: string; readonly expectedRevision: number }[],
  requestId = globalThis.crypto.randomUUID(),
) {
  return client.post<SessionResponse>("/api/v1/cooking-sessions", {
    requestId,
    mealEntries,
  });
}

export function getCookingSession(client: ApiClient, sessionId: string, signal?: AbortSignal) {
  return client.get<SessionResponse>(
    `/api/v1/cooking-sessions/${encodeURIComponent(sessionId)}`,
    signal ? { signal } : undefined,
  );
}

export function updateCookingIngredient(
  client: ApiClient,
  sessionId: string,
  ingredientId: string,
  input: {
    readonly expectedRevision: number;
    readonly status: "USED" | "OMITTED" | "SUBSTITUTED";
    readonly productId?: string;
    readonly quantityGrams?: number;
  },
) {
  return client.patch<SessionResponse>(
    `/api/v1/cooking-sessions/${encodeURIComponent(sessionId)}/ingredients/${encodeURIComponent(ingredientId)}`,
    input,
  );
}

export function addCookingIngredient(
  client: ApiClient,
  sessionId: string,
  input: {
    readonly expectedRevision: number;
    readonly productId: string;
    readonly quantityGrams: number;
  },
) {
  return client.post<SessionResponse>(
    `/api/v1/cooking-sessions/${encodeURIComponent(sessionId)}/ingredients`,
    input,
  );
}

export function deleteCookingIngredient(
  client: ApiClient,
  sessionId: string,
  ingredientId: string,
  expectedRevision: number,
) {
  return client.delete<SessionResponse>(
    `/api/v1/cooking-sessions/${encodeURIComponent(sessionId)}/ingredients/${encodeURIComponent(ingredientId)}?expectedRevision=${expectedRevision}`,
  );
}

export function updateCookingStep(
  client: ApiClient,
  sessionId: string,
  stepId: string,
  input: { readonly expectedRevision: number; readonly status: "COMPLETED" | "SKIPPED" },
) {
  return client.patch<SessionResponse>(
    `/api/v1/cooking-sessions/${encodeURIComponent(sessionId)}/steps/${encodeURIComponent(stepId)}`,
    input,
  );
}

export function updateCookingYield(
  client: ApiClient,
  sessionId: string,
  input:
    | {
        readonly expectedRevision: number;
        readonly method: "DIRECT";
        readonly actualWeightG: number;
      }
    | {
        readonly expectedRevision: number;
        readonly method: "CONTAINER_DIFFERENCE";
        readonly tareWeightG: number;
        readonly grossWeightG: number;
      }
    | { readonly expectedRevision: number; readonly method: null },
) {
  return client.patch<SessionResponse>(
    `/api/v1/cooking-sessions/${encodeURIComponent(sessionId)}/yield`,
    input,
  );
}

export function completeCookingSession(
  client: ApiClient,
  sessionId: string,
  expectedRevision: number,
  resolvePending: boolean,
) {
  return client.post<SessionResponse>(
    `/api/v1/cooking-sessions/${encodeURIComponent(sessionId)}/complete`,
    { expectedRevision, resolvePending },
  );
}

export function cancelCookingSession(
  client: ApiClient,
  sessionId: string,
  expectedRevision: number,
) {
  return client.post<SessionResponse>(
    `/api/v1/cooking-sessions/${encodeURIComponent(sessionId)}/cancel`,
    { expectedRevision },
  );
}
