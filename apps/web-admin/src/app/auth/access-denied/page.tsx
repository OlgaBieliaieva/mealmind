import Link from "next/link";
import type { Metadata } from "next";

import { readServerWebEnv } from "@/config/server-env";
import { SignOutButton } from "@/features/auth/sign-out-button";

export const metadata: Metadata = { title: "Доступ заборонено" };

export default function AccessDeniedPage() {
  const { webClientOrigin } = readServerWebEnv();
  return (
    <section className="auth-card" aria-labelledby="access-denied-title">
      <p className="auth-card__eyebrow">Недостатньо прав</p>
      <h1 id="access-denied-title">Адміністративний доступ не надано</h1>
      <p>Вхід виконано, але цей обліковий запис не має ролі адміністратора MealMind.</p>
      <div className="auth-actions">
        <SignOutButton />
        <Link href={webClientOrigin}>Перейти до клієнтського застосунку</Link>
      </div>
    </section>
  );
}
