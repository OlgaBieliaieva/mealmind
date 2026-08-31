import type { ApiClient } from "./api-client";

export type ShoppingListStatus = "OPEN" | "COMPLETED" | "ARCHIVED";
export type ShoppingItemStatus = "PENDING" | "PURCHASED" | "REMOVED";

export interface ShoppingListSummary {
  readonly id: string;
  readonly mealPlanId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly version: number;
  readonly revision: number;
  readonly status: ShoppingListStatus;
  readonly generatedAt: string;
  readonly itemCount: number;
  readonly purchasedCount: number;
  readonly removedCount: number;
}

export interface ShoppingListItem {
  readonly id: string;
  readonly origin: "GENERATED" | "MANUAL";
  readonly status: ShoppingItemStatus;
  readonly productId: string | null;
  readonly name: string;
  readonly category: { readonly code: string; readonly name: string } | null;
  readonly groupCategory: { readonly code: string; readonly name: string } | null;
  readonly derivedQuantity: number | null;
  readonly requestedQuantity: number | null;
  readonly unit: {
    readonly id: string;
    readonly code: string;
    readonly symbol: string;
  } | null;
  readonly notes: string | null;
  readonly purchasedAt: string | null;
  readonly sources: readonly {
    readonly kind: "DIRECT_PRODUCT" | "RECIPE_INGREDIENT";
    readonly date: string;
    readonly recipeTitle: string | null;
    readonly contributedQuantity: number;
  }[];
}

export interface ShoppingListDetail extends ShoppingListSummary {
  readonly familyName: string;
  readonly weekStart: string;
  readonly sourceFingerprint: string;
  readonly currentSourceFingerprint: string | null;
  readonly stale: boolean;
  readonly warnings: readonly {
    readonly code: string;
    readonly message: string;
    readonly sourceName?: string;
  }[];
  readonly items: readonly ShoppingListItem[];
}

export function listShoppingLists(client: ApiClient, signal?: AbortSignal) {
  return client.get<{ readonly data: readonly ShoppingListSummary[] }>(
    "/api/v1/shopping-lists",
    signal ? { signal } : undefined,
  );
}

export function readShoppingList(client: ApiClient, listId: string, signal?: AbortSignal) {
  return client.get<{ readonly data: ShoppingListDetail }>(
    `/api/v1/shopping-lists/${encodeURIComponent(listId)}`,
    signal ? { signal } : undefined,
  );
}

export function generateShoppingList(
  client: ApiClient,
  input: { readonly mealPlanId: string; readonly periodStart: string; readonly periodEnd: string },
) {
  return client.post<{ readonly data: ShoppingListDetail }>("/api/v1/shopping-lists", input);
}

export function regenerateShoppingList(
  client: ApiClient,
  listId: string,
  expectedRevision: number,
) {
  return client.post<{ readonly data: ShoppingListDetail }>(
    `/api/v1/shopping-lists/${encodeURIComponent(listId)}/regenerate`,
    { expectedRevision },
  );
}

export function updateShoppingItem(
  client: ApiClient,
  listId: string,
  itemId: string,
  input: {
    readonly expectedRevision: number;
    readonly requestedQuantity?: number;
    readonly resetQuantity?: boolean;
    readonly notes?: string | null;
  },
) {
  return client.patch<{ readonly data: ShoppingListDetail }>(
    `/api/v1/shopping-lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`,
    input,
  );
}

export function setShoppingItemStatus(
  client: ApiClient,
  listId: string,
  itemId: string,
  expectedRevision: number,
  status: ShoppingItemStatus,
) {
  return client.patch<{ readonly data: ShoppingListDetail }>(
    `/api/v1/shopping-lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}/status`,
    { expectedRevision, status },
  );
}

export function addCatalogShoppingItem(
  client: ApiClient,
  listId: string,
  input: {
    readonly expectedRevision: number;
    readonly productId: string;
    readonly quantity: number;
  },
) {
  return client.post<{ readonly data: ShoppingListDetail }>(
    `/api/v1/shopping-lists/${encodeURIComponent(listId)}/items/catalog`,
    input,
  );
}

export function addCustomShoppingItem(
  client: ApiClient,
  listId: string,
  input: {
    readonly expectedRevision: number;
    readonly name: string;
    readonly quantity?: number;
    readonly measurementUnitId?: string;
    readonly notes?: string;
  },
) {
  return client.post<{ readonly data: ShoppingListDetail }>(
    `/api/v1/shopping-lists/${encodeURIComponent(listId)}/items/custom`,
    input,
  );
}

export function setShoppingListStatus(
  client: ApiClient,
  listId: string,
  expectedRevision: number,
  status: ShoppingListStatus,
) {
  return client.patch<{ readonly data: ShoppingListDetail }>(
    `/api/v1/shopping-lists/${encodeURIComponent(listId)}/status`,
    { expectedRevision, status },
  );
}
