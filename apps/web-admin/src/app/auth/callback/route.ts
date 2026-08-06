import { NextResponse } from "next/server";

import { readWebEnv } from "@/config/env";
import { readServerWebEnv } from "@/config/server-env";
import { resolveCallbackOrigin } from "@/features/auth/callback-origin";
import { sanitizeReturnTo } from "@/features/auth/safe-return-to";
import { createServerSupabaseClient } from "@/shared/supabase/server-client";

async function applicationRequest(path: string, accessToken: string) {
  const config = readWebEnv();
  return fetch(`${config.apiUrl.replace(/\/+$/, "")}${path}`, {
    method: path.endsWith("bootstrap") ? "POST" : "GET",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
      ...(path.endsWith("bootstrap") ? { "content-type": "application/json" } : {}),
    },
    ...(path.endsWith("bootstrap") ? { body: "{}" } : {}),
    cache: "no-store",
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = sanitizeReturnTo(url.searchParams.get("next"));
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

  const token = exchange.data.session.access_token;
  const bootstrap = await applicationRequest("/api/v1/account/bootstrap", token);
  if (!bootstrap.ok) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/auth/auth-code-error", redirectOrigin));
  }

  const sessionResponse = await applicationRequest("/api/v1/session", token);
  if (!sessionResponse.ok) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", redirectOrigin));
  }

  const payload = (await sessionResponse.json()) as {
    readonly data?: { readonly user?: { readonly applicationRole?: unknown } };
  };
  const destination =
    payload.data?.user?.applicationRole === "ADMIN" ? next : "/auth/access-denied";
  return NextResponse.redirect(new URL(destination, redirectOrigin));
}
