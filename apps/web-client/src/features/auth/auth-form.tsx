"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { bootstrapAccount, readApplicationSessionContext } from "@/shared/api/account";
import { getBrowserSupabaseClient } from "@/shared/supabase/browser-client";
import { readWebEnv } from "@/config/env";

import { credentialsSchema, emailSchema, passwordUpdateSchema } from "./auth-schema";
import { sanitizeReturnTo } from "./safe-return-to";

export type AuthFormMode = "sign-in" | "sign-up" | "forgot-password" | "update-password";

export interface AuthFormProps {
  readonly mode: AuthFormMode;
  readonly returnTo?: string;
  readonly navigate?: (target: string) => void;
}

function formCopy(mode: AuthFormMode) {
  switch (mode) {
    case "sign-in":
      return { title: "Увійти до MealMind", submit: "Увійти" };
    case "sign-up":
      return { title: "Створити обліковий запис", submit: "Зареєструватися" };
    case "forgot-password":
      return { title: "Відновити пароль", submit: "Надіслати інструкції" };
    case "update-password":
      return { title: "Встановити новий пароль", submit: "Зберегти пароль" };
  }
}

export function AuthForm({
  mode,
  returnTo,
  navigate = (target) => window.location.assign(target),
}: AuthFormProps) {
  const copy = formCopy(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supportsGoogle = mode === "sign-in" || mode === "sign-up";

  async function handleGoogleSignIn() {
    setMessage("");
    setIsError(false);
    setIsSubmitting(true);

    try {
      const safeReturnTo = sanitizeReturnTo(returnTo);
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", safeReturnTo);
      const supabase = getBrowserSupabaseClient(readWebEnv());
      const result = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callback.toString(),
          skipBrowserRedirect: true,
        },
      });

      if (result.error !== null || result.data.url === null) {
        throw result.error ?? new Error("Google OAuth URL is unavailable");
      }

      navigate(result.data.url);
    } catch {
      setIsError(true);
      setMessage("Не вдалося продовжити через Google. Повторіть спробу пізніше.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
      const safeReturnTo = sanitizeReturnTo(returnTo);

      if (mode === "sign-in") {
        const result = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (result.error !== null) throw result.error;
        await bootstrapAccount();
        const session = await readApplicationSessionContext();
        navigate(
          session.onboardingCompleted || safeReturnTo === "/account-activation"
            ? safeReturnTo
            : "/onboarding",
        );
        return;
      }

      if (mode === "sign-up") {
        const callback = new URL("/auth/callback", window.location.origin);
        callback.searchParams.set("next", safeReturnTo);
        const result = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: callback.toString() },
        });
        if (result.error !== null) throw result.error;

        if (result.data.session !== null) {
          await bootstrapAccount();
          const session = await readApplicationSessionContext();
          navigate(
            session.onboardingCompleted || safeReturnTo === "/account-activation"
              ? safeReturnTo
              : "/onboarding",
          );
        } else {
          window.sessionStorage.setItem("mealmind.pending-confirmation-email", email.trim());
          navigate("/auth/check-email");
        }
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
      setPassword("");
      setPasswordConfirmation("");
      setMessage("Пароль оновлено. Тепер ви можете продовжити роботу.");
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
    <section className="auth-card" aria-labelledby="auth-title">
      <p className="auth-card__eyebrow">Безпечний доступ</p>
      <h1 id="auth-title">{copy.title}</h1>

      {supportsGoogle ? (
        <>
          <button
            className="auth-google-button"
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleGoogleSignIn()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M21.35 12.2c0-.64-.06-1.25-.16-1.84H12v3.48h5.25a4.49 4.49 0 0 1-1.95 2.94v2.26h3.16c1.85-1.7 2.89-4.21 2.89-6.84ZM12 21.75c2.64 0 4.86-.87 6.48-2.37l-3.16-2.45c-.88.59-2 .94-3.32.94-2.55 0-4.71-1.72-5.48-4.04H3.25v2.53A9.79 9.79 0 0 0 12 21.75ZM6.52 13.83A5.88 5.88 0 0 1 6.21 12c0-.64.11-1.25.31-1.83V7.64H3.25A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1 4.36l3.27-2.53ZM12 6.13c1.44 0 2.72.49 3.73 1.46l2.81-2.81A9.42 9.42 0 0 0 12 2.25a9.79 9.79 0 0 0-8.75 5.39l3.27 2.53C7.29 7.85 9.45 6.13 12 6.13Z"
              />
            </svg>
            Продовжити через Google
          </button>
          <div className="auth-separator" aria-hidden="true">
            <span>або через email</span>
          </div>
        </>
      ) : null}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {mode !== "update-password" ? (
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
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
              name="password"
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
              name="passwordConfirmation"
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
          {isSubmitting ? "Зачекайте…" : copy.submit}
        </button>
      </form>

      <nav className="auth-links" aria-label="Додаткові дії автентифікації">
        {mode === "sign-in" ? (
          <>
            <Link href="/auth/forgot-password">Забули пароль?</Link>
            <Link href="/auth/sign-up">Створити обліковий запис</Link>
          </>
        ) : null}
        {mode === "sign-up" || mode === "forgot-password" ? (
          <Link href="/auth/sign-in">Повернутися до входу</Link>
        ) : null}
        {mode === "update-password" && message.length > 0 && !isError ? (
          <Link href="/">Продовжити</Link>
        ) : null}
      </nav>
    </section>
  );
}
