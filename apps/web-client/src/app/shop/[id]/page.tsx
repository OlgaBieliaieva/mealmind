import type { Metadata } from "next";

import { ShoppingListDetailScreen } from "@/features/shopping-list/shopping-list-detail";

export const metadata: Metadata = { title: "Список покупок" };

export default function ShoppingListDetailPage() {
  return <ShoppingListDetailScreen />;
}
