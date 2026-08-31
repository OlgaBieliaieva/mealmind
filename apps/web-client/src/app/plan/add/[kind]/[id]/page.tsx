import type { Metadata } from "next";
import { Suspense } from "react";

import { AdvancedPlanningFlow } from "@/features/meal-plan/advanced-planning-flow";
import type { FoodKind } from "@/shared/api/food";

export const metadata: Metadata = { title: "Додати в план" };

export default async function AdvancedPlanningPage({
  params,
}: {
  readonly params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  if (kind !== "product" && kind !== "recipe") return null;
  return (
    <Suspense>
      <AdvancedPlanningFlow kind={kind as FoodKind} id={id} />
    </Suspense>
  );
}
