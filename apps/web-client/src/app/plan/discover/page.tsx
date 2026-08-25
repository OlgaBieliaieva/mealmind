import type { Metadata } from "next";
import { Suspense } from "react";

import { FoodDiscovery } from "@/features/food-discovery/food-discovery";

export const metadata: Metadata = { title: "Пошук їжі" };

export default function DiscoverFoodPage() {
  return (
    <Suspense>
      <FoodDiscovery />
    </Suspense>
  );
}
