import type { Metadata } from "next";

import { ShoppingListsScreen } from "@/features/shopping-list/shopping-lists-screen";

export const metadata: Metadata = { title: "Списки покупок" };

export default function ShoppingListsPage() {
  return <ShoppingListsScreen />;
}
