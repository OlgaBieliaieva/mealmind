"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card, PageState, Typography } from "@/shared/ui";

type Status =
  | "LOADING"
  | "PENDING"
  | "ACCEPTED"
  | "REVOKED"
  | "EXPIRED"
  | "INVALID"
  | "WRONG_ACCOUNT"
  | "CONFLICT"
  | "ERROR";

export function AccountActivation() {
  const [status, setStatus] = useState<Status>("LOADING");
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  useEffect(() => {
    void fetch("/api/account-activation", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("inspect failed");
        const payload = (await response.json()) as {
          data?: { status?: Status; recipientEmailHint?: string | null };
        };
        setEmailHint(payload.data?.recipientEmailHint ?? null);
        setStatus(payload.data?.status ?? "INVALID");
      })
      .catch(() => setStatus("ERROR"));
  }, []);
  if (status === "LOADING")
    return (
      <PageState kind="loading" title="Перевіряємо запрошення" description="Це займе лише мить." />
    );
  if (status === "ERROR")
    return (
      <PageState
        kind="error"
        title="Не вдалося перевірити запрошення"
        description="Повторіть спробу пізніше."
      />
    );
  if (status === "WRONG_ACCOUNT")
    return (
      <PageState
        kind="error"
        title="Увійдіть з іншою адресою"
        description={`Потрібен обліковий запис, підтверджена адреса якого відповідає ${emailHint ?? "адресі із запрошення"}.`}
      />
    );
  if (status === "CONFLICT")
    return (
      <PageState
        kind="error"
        title="Активація конфліктує з поточним профілем"
        description="Цей обліковий запис уже має сімейний контекст. Приєднання наявних облікових записів поки не підтримується."
      />
    );
  if (status !== "PENDING") {
    const copy =
      status === "EXPIRED"
        ? "Термін дії запрошення минув."
        : status === "REVOKED"
          ? "Запрошення відкликано власником сім’ї."
          : status === "ACCEPTED"
            ? "Це запрошення вже використано."
            : "Посилання недійсне.";
    return <PageState kind="error" title="Активація недоступна" description={copy} />;
  }
  return (
    <section className="auth-card" aria-labelledby="activation-title">
      <p className="auth-card__eyebrow">Запрошення до MealMind</p>
      <h1 id="activation-title">Активуйте власний профіль</h1>
      <p>
        Увійдіть або зареєструйтеся з адресою {emailHint ?? "із запрошення"}. Дані профілю та
        історія збережуться.
      </p>
      <Card>
        <Typography variant="supporting">
          MealMind перевірить підтверджену email-адресу. Запрошення не дає доступу без
          автентифікації.
        </Typography>
      </Card>
      <div className="auth-links">
        <Link href="/auth/sign-up?returnTo=%2Faccount-activation">Створити обліковий запис</Link>
        <Link href="/auth/sign-in?returnTo=%2Faccount-activation">Увійти</Link>
      </div>
      <Button
        isLoading={claiming}
        onClick={async () => {
          setClaiming(true);
          const response = await fetch("/api/account-activation", { method: "POST" });
          if (response.ok) window.location.assign("/family");
          else if (response.status === 401)
            window.location.assign("/auth/sign-up?returnTo=%2Faccount-activation");
          else {
            const payload = (await response.json().catch(() => null)) as {
              error?: { code?: string };
            } | null;
            if (payload?.error?.code === "INVITATION_EMAIL_MISMATCH") setStatus("WRONG_ACCOUNT");
            else if (
              payload?.error?.code === "INVITATION_ACCOUNT_CONTEXT_CONFLICT" ||
              payload?.error?.code === "EXISTING_ACCOUNT_NOT_SUPPORTED"
            )
              setStatus("CONFLICT");
            else setStatus(response.status === 404 ? "INVALID" : "ERROR");
          }
          setClaiming(false);
        }}
      >
        Завершити активацію
      </Button>
    </section>
  );
}
