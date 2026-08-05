import type { Metadata } from "next";

import { ProductEditor } from "@/features/products/product-editor";

export const metadata: Metadata = { title: "Редагування продукту" };

export default async function ProductDetailsPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = await params;
  return <ProductEditor productId={id} />;
}
