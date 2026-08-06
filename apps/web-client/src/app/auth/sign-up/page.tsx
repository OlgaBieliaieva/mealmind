import type { Metadata } from "next";

import { AuthForm } from "@/features/auth/auth-form";
import { redirectAuthenticatedUser } from "@/features/auth/auth-page-guard";
import { sanitizeReturnTo } from "@/features/auth/safe-return-to";

export const metadata: Metadata = { title: "Реєстрація" };

export default async function SignUpPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  const returnTo = sanitizeReturnTo(params.returnTo);
  await redirectAuthenticatedUser(returnTo);
  return <AuthForm mode="sign-up" returnTo={returnTo} />;
}
