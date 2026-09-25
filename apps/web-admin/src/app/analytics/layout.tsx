import type { ReactNode } from "react";

import { AnalyticsNavigation } from "@/features/analytics/components/analytics-navigation";

export default function AnalyticsLayout({ children }: { readonly children: ReactNode }) {
  return (
    <>
      <AnalyticsNavigation />
      {children}
    </>
  );
}
