export type ShoppingListStatus = "OPEN" | "COMPLETED" | "ARCHIVED";
export type ShoppingListItemStatus = "PENDING" | "PURCHASED" | "REMOVED";

export interface ShoppingListWarning {
  readonly code: string;
  readonly message: string;
  readonly sourceName?: string;
}

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

export interface ShoppingListItemView {
  readonly id: string;
  readonly origin: "GENERATED" | "MANUAL";
  readonly status: ShoppingListItemStatus;
  readonly productId: string | null;
  readonly name: string;
  readonly category: {
    readonly code: string;
    readonly name: string;
  } | null;
  readonly groupCategory: {
    readonly code: string;
    readonly name: string;
  } | null;
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
  readonly warnings: readonly ShoppingListWarning[];
  readonly items: readonly ShoppingListItemView[];
}

export interface ShoppingListRepository {
  list(familyId: string): Promise<readonly ShoppingListSummary[]>;
  find(familyId: string, listId: string): Promise<ShoppingListDetail | null>;
  generate(input: {
    readonly familyId: string;
    readonly userId: string;
    readonly mealPlanId: string;
    readonly periodStart: string;
    readonly periodEnd: string;
  }): Promise<ShoppingListDetail>;
  regenerate(input: {
    readonly familyId: string;
    readonly userId: string;
    readonly listId: string;
    readonly expectedRevision: number;
  }): Promise<ShoppingListDetail>;
  updateItem(input: {
    readonly familyId: string;
    readonly listId: string;
    readonly itemId: string;
    readonly expectedRevision: number;
    readonly requestedQuantity?: number | undefined;
    readonly resetQuantity?: boolean | undefined;
    readonly notes?: string | null | undefined;
  }): Promise<ShoppingListDetail>;
  setItemStatus(input: {
    readonly familyId: string;
    readonly listId: string;
    readonly itemId: string;
    readonly expectedRevision: number;
    readonly status: ShoppingListItemStatus;
  }): Promise<ShoppingListDetail>;
  addCatalogItem(input: {
    readonly familyId: string;
    readonly userId: string;
    readonly listId: string;
    readonly productId: string;
    readonly expectedRevision: number;
    readonly quantity: number;
  }): Promise<ShoppingListDetail>;
  addCustomItem(input: {
    readonly familyId: string;
    readonly userId: string;
    readonly listId: string;
    readonly expectedRevision: number;
    readonly name: string;
    readonly quantity?: number | undefined;
    readonly measurementUnitId?: string | undefined;
    readonly notes?: string | undefined;
  }): Promise<ShoppingListDetail>;
  setStatus(input: {
    readonly familyId: string;
    readonly listId: string;
    readonly expectedRevision: number;
    readonly status: ShoppingListStatus;
  }): Promise<ShoppingListDetail>;
}
