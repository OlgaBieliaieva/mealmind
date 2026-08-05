import type { Metadata } from "next";

import { ProductList } from "@/features/products/product-list";

export const metadata: Metadata = { title: "Продукти" };

export default function ProductsPage() {
  return <ProductList />;
}
