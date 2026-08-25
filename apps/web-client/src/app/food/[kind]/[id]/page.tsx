import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { FoodDetails } from "@/features/food-discovery/food-details";
import type { FoodKind } from "@/shared/api/food";

export const metadata: Metadata = { title: "Деталі їжі" };

export default async function FoodDetailsPage({
  params,
}: {
  readonly params: Promise<{ readonly kind: string; readonly id: string }>;
}) {
  const { kind, id } = await params;
  if (kind !== "product" && kind !== "recipe") notFound();
  return (
    <Suspense>
      <FoodDetails kind={kind satisfies FoodKind} id={id} />
    </Suspense>
  );
}
