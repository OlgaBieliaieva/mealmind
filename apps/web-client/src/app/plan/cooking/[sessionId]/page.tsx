import type { Metadata } from "next";

import { CookingModeScreen } from "@/features/cooking/cooking-mode-screen";

export const metadata: Metadata = { title: "Режим приготування" };

export default async function CookingModePage({
  params,
}: {
  readonly params: Promise<{ readonly sessionId: string }>;
}) {
  return <CookingModeScreen sessionId={(await params).sessionId} />;
}
