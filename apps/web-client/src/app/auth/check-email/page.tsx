import type { Metadata } from "next";

import { CheckEmailCard } from "@/features/auth/check-email-card";

export const metadata: Metadata = { title: "Підтвердження email" };

export default function CheckEmailPage() {
  return <CheckEmailCard />;
}
