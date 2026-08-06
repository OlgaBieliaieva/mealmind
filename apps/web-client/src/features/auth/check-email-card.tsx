"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { readWebEnv } from "@/config/env";
import { getBrowserSupabaseClient } from "@/shared/supabase/browser-client";

export function CheckEmailCard() {
  const email = useSyncExternalStore(
    () => () => {},
    () => window.sessionStorage.getItem("mealmind.pending-confirmation-email") ?? "",
    () => "",
  );
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <section className="auth-card" aria-labelledby="check-email-title">
      <p className="auth-card__eyebrow">Підтвердження email</p>
      <h1 id="check-email-title">Перевірте поштову скриньку</h1>
      <p>Якщо реєстрацію прийнято, Supabase надіслав лист із посиланням для підтвердження.</p>

      {message.length > 0 ? <p role="status">{message}</p> : null}

      {email.length > 0 ? (
        <button
          className="auth-button"
          type="button"
          disabled={isSubmitting}
          onClick={async () => {
            setIsSubmitting(true);
            const callback = new URL("/auth/callback", window.location.origin);
            const supabase = getBrowserSupabaseClient(readWebEnv());
            await supabase.auth.resend({
              type: "signup",
              email,
              options: { emailRedirectTo: callback.toString() },
            });
            setMessage(
              "Якщо це дозволено, новий лист надіслано. Повторіть не раніше ніж за хвилину.",
            );
            window.setTimeout(() => setIsSubmitting(false), 60_000);
          }}
        >
          {isSubmitting ? "Лист надіслано" : "Надіслати лист повторно"}
        </button>
      ) : null}

      <div className="auth-links">
        <Link href="/auth/sign-in">Повернутися до входу</Link>
      </div>
    </section>
  );
}
