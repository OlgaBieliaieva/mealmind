import type { Metadata } from "next";

import { ReferencesAnalyticsPage } from "@/features/analytics/pages/references-analytics-page";

export const metadata: Metadata = { title: "Довідники — огляд" };

export default function ReferencesPage() {
  return <ReferencesAnalyticsPage />;
}
