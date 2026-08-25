import type { Metadata } from "next";
import { Suspense } from "react";

import { MealPlanScreen } from "@/features/meal-plan/meal-plan-screen";

export const metadata: Metadata = { title: "План харчування" };

export default function PlanPage() {
  return (
    <Suspense>
      <MealPlanScreen />
    </Suspense>
  );
}
