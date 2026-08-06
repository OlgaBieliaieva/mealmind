import type { Metadata } from "next";

import { AdminAuthForm } from "@/features/auth/admin-auth-form";

export const metadata: Metadata = { title: "Новий пароль" };

export default function UpdatePasswordPage() {
  return <AdminAuthForm mode="update-password" />;
}
