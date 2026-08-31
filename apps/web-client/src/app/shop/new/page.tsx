import type { Metadata } from "next";
import { Suspense } from "react";

import { ShoppingListGeneration } from "@/features/shopping-list/shopping-list-generation";

export const metadata: Metadata = { title: "Створити список покупок" };

export default function NewShoppingListPage() {
  return (
    <Suspense>
      <ShoppingListGeneration />
    </Suspense>
  );
}
