import type { Metadata } from "next";

import { ProductImportCandidateList } from "@/features/product-import-review/product-import-candidate-list";

export const metadata: Metadata = { title: "Перевірка імпорту" };

export default function ProductImportPage() {
  return <ProductImportCandidateList />;
}
