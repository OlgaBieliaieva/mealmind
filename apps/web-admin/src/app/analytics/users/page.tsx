import type { Metadata } from "next";

import { UsersAnalyticsPage } from "@/features/analytics/pages/users-analytics-page";

export const metadata: Metadata = { title: "Користувачі — огляд" };

export default function UsersPage() {
  return <UsersAnalyticsPage />;
}
