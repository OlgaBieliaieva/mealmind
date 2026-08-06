"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { readWebEnv } from "@/config/env";
import { bootstrapAccount, readApplicationSession } from "@/shared/api/account";
import { getBrowserSupabaseClient } from "@/shared/supabase/browser-client";

import { credentialsSchema, emailSchema, passwordUpdateSchema } from "./auth-schema";
import { sanitizeReturnTo } from "./safe-return-to";

type Mode = "sign-in" | "forgot-password" | "update-password";

export function AdminAuthForm({
  mode,
  returnTo,
  navigate = (target) => window.location.assign(target),
}: {
  readonly mode: Mode;
  readonly returnTo?: string;
  readonly navigate?: (target: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const title =
    mode === "sign-in"
      ? "Вхід для адміністратора"
      : mode === "forgot-password"
        ? "Відновлення пароля"
        : "Новий пароль";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    const validation =
      mode === "forgot-password"
        ? emailSchema.safeParse(email)
        : mode === "update-password"
          ? passwordUpdateSchema.safeParse({ password, passwordConfirmation })
          : credentialsSchema.safeParse({ email, password });

    if (!validation.success) {
      setIsError(true);
      setMessage(validation.error.issues[0]?.message ?? "Перевірте введені дані");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getBrowserSupabaseClient(readWebEnv());

      if (mode === "sign-in") {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error !== null) throw result.error;
        await bootstrapAccount();
        const session = await readApplicationSession();
        navigate(
          session.applicationRole === "ADMIN" ? sanitizeReturnTo(returnTo) : "/auth/access-denied",
        );
        return;
      }

      if (mode === "forgot-password") {
        const callback = new URL("/auth/callback", window.location.origin);
        callback.searchParams.set("next", "/auth/update-password");
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: callback.toString(),
        });
        setMessage("Якщо обліковий запис існує, ми надіслали інструкції для відновлення пароля.");
        return;
      }

      const currentUser = await supabase.auth.getUser();
      if (currentUser.error !== null || currentUser.data.user === null) {
        throw new Error("Recovery session is unavailable");
      }
      const result = await supabase.auth.updateUser({ password });
      if (result.error !== null) throw result.error;
      setMessage("Пароль оновлено. Увійдіть до адміністративного застосунку.");
    } catch {
      setIsError(true);
      setMessage(
        mode === "forgot-password"
          ? "Якщо обліковий запис існує, ми надіслали інструкції для відновлення пароля."
          : "Не вдалося виконати дію. Перевірте дані або повторіть спробу пізніше.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-card" aria-labelledby="admin-auth-title">
      <p className="auth-card__eyebrow">MealMind Admin</p>
      <h1 id="admin-auth-title">{title}</h1>
      {mode === "sign-in" ? (
        <p>Доступ мають лише користувачі з призначеною application role ADMIN.</p>
      ) : null}

      <form className="auth-form" onSubmit={submit} noValidate>
        {mode !== "update-password" ? (
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </label>
        ) : null}
        {mode !== "forgot-password" ? (
          <label className="auth-field">
            <span>{mode === "update-password" ? "Новий пароль" : "Пароль"}</span>
            <input
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              minLength={8}
              required
            />
          </label>
        ) : null}
        {mode === "update-password" ? (
          <label className="auth-field">
            <span>Повторіть новий пароль</span>
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              disabled={isSubmitting}
              minLength={8}
              required
            />
          </label>
        ) : null}
        {mode !== "forgot-password" ? (
          <label className="auth-password-visibility">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
              disabled={isSubmitting}
            />
            <span>Показати пароль</span>
          </label>
        ) : null}
        {message.length > 0 ? (
          <p
            className={isError ? "auth-message auth-message--error" : "auth-message"}
            role="status"
          >
            {message}
          </p>
        ) : null}
        <button className="auth-button" type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Зачекайте…"
            : mode === "sign-in"
              ? "Увійти"
              : mode === "forgot-password"
                ? "Надіслати інструкції"
                : "Зберегти пароль"}
        </button>
      </form>

      <nav className="auth-links" aria-label="Додаткові дії автентифікації">
        {mode === "sign-in" ? <Link href="/auth/forgot-password">Забули пароль?</Link> : null}
        {mode !== "sign-in" ? <Link href="/auth/sign-in">Повернутися до входу</Link> : null}
      </nav>
    </section>
  );
}
