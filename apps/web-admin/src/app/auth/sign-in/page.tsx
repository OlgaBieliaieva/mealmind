import type { Metadata } from "next";

import { AdminAuthForm } from "@/features/auth/admin-auth-form";
import { sanitizeReturnTo } from "@/features/auth/safe-return-to";

export const metadata: Metadata = { title: "Вхід" };

export default async function AdminSignInPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  return <AdminAuthForm mode="sign-in" returnTo={sanitizeReturnTo(params.returnTo)} />;
}
