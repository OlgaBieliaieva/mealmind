import { NextResponse } from "next/server";

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

  const supabase = await createServerSupabaseClient();

  if (code !== null) {
    const exchange = await supabase.auth.exchangeCodeForSession(code);

    if (exchange.error === null && exchange.data.session !== null) {
      // Return immediately so the browser persists the PKCE session before
      // application bootstrap and authorization run in proxy.ts.
      return NextResponse.redirect(new URL(next, redirectOrigin));
    }
  }

  // A confirmation URL can be retried after its one-time code was consumed.
  // Continue only when this browser already owns a verified session.
  const claims = await supabase.auth.getClaims();
  if (claims.error === null && claims.data?.claims.sub !== undefined) {
    return NextResponse.redirect(new URL(next, redirectOrigin));
  }

  return NextResponse.redirect(new URL("/auth/auth-code-error", redirectOrigin));
}
