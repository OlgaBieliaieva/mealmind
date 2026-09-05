import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConsumptionAddFlow } from "@/features/consumption/consumption-add-flow";
import type { FoodKind } from "@/shared/api/food";

export const metadata: Metadata = { title: "Додати до щоденника" };
export default async function DiaryAddPage({
  params,
}: {
  readonly params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  if (kind !== "product" && kind !== "recipe") notFound();
  return (
    <Suspense>
      <ConsumptionAddFlow kind={kind satisfies FoodKind} id={id} />
    </Suspense>
  );
}
