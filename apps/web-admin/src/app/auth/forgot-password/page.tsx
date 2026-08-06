import type { Metadata } from "next";

import { AdminAuthForm } from "@/features/auth/admin-auth-form";

export const metadata: Metadata = { title: "Відновлення пароля" };

export default function ForgotPasswordPage() {
  return <AdminAuthForm mode="forgot-password" />;
}
