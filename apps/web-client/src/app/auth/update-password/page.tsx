import type { Metadata } from "next";

import { AuthForm } from "@/features/auth/auth-form";

export const metadata: Metadata = { title: "Новий пароль" };

export default function UpdatePasswordPage() {
  return <AuthForm mode="update-password" />;
}
