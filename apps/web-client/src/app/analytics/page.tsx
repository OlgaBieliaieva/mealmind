import type { Metadata } from "next";
import { AnalyticalDashboard } from "@/features/analytics/dashboard";

export const metadata: Metadata = {
  title: "Аналітика",
};

export default function Home() {
  return <AnalyticalDashboard />;
}
