import { NextResponse } from "next/server";

import { readWebEnv } from "@/config/env";
import { readServerWebEnv } from "@/config/server-env";
import { resolveCallbackOrigin } from "@/features/auth/callback-origin";
import { sanitizeReturnTo } from "@/features/auth/safe-return-to";
import { createServerSupabaseClient } from "@/shared/supabase/server-client";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeReturnTo(requestUrl.searchParams.get("next"));
  const { appOrigin } = readServerWebEnv();
  const redirectOrigin = resolveCallbackOrigin(
    request.url,
    appOrigin,
    process.env.NODE_ENV === "development",
  );

  if (code === null) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", redirectOrigin));
  }

  const supabase = await createServerSupabaseClient();
  const exchange = await supabase.auth.exchangeCodeForSession(code);

  if (exchange.error !== null || exchange.data.session === null) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", redirectOrigin));
  }

  const apiConfig = readWebEnv();
  const bootstrapResponse = await fetch(
    `${apiConfig.apiUrl.replace(/\/+$/, "")}/api/v1/account/bootstrap`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${exchange.data.session.access_token}`,
        "content-type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    },
  );

  if (!bootstrapResponse.ok) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/auth/auth-code-error", redirectOrigin));
  }

  const sessionResponse = await fetch(`${apiConfig.apiUrl.replace(/\/+$/, "")}/api/v1/session`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${exchange.data.session.access_token}`,
    },
    cache: "no-store",
  });
  const sessionPayload = sessionResponse.ok
    ? ((await sessionResponse.json()) as { data?: { onboardingCompleted?: boolean } })
    : null;
  const target =
    next === "/auth/update-password" ||
    next === "/account-activation" ||
    sessionPayload?.data?.onboardingCompleted === true
      ? next
      : "/onboarding";
  return NextResponse.redirect(new URL(target, redirectOrigin));
}
