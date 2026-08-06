import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Помилка підтвердження" };

export default function AuthCodeErrorPage() {
  return (
    <section className="auth-card" aria-labelledby="auth-error-title">
      <p className="auth-card__eyebrow">Посилання недійсне</p>
      <h1 id="auth-error-title">Не вдалося підтвердити сесію</h1>
      <p>Посилання могло завершити дію або вже бути використаним. Спробуйте увійти ще раз.</p>
      <div className="auth-links">
        <Link href="/auth/sign-in">Перейти до входу</Link>
      </div>
    </section>
  );
}
