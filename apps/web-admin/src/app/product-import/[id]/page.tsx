import type { Metadata } from "next";

import { ProductImportCandidateEditor } from "@/features/product-import-review/product-import-candidate-editor";

export const metadata: Metadata = { title: "Перевірка кандидата" };

export default async function ProductImportCandidatePage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = await params;
  return <ProductImportCandidateEditor candidateId={id} />;
}
