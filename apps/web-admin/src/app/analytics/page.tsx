import type { Metadata } from "next";

import { OverviewAnalyticsPage } from "@/features/analytics/pages/overview-analytics-page";

export const metadata: Metadata = { title: "Огляд" };

export default function AnalyticsPage() {
  return <OverviewAnalyticsPage />;
}
