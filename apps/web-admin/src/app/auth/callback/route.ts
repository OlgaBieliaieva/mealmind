import { NextResponse } from "next/server";

import { readServerWebEnv } from "@/config/server-env";
import { resolveCallbackOrigin } from "@/features/auth/callback-origin";
import { sanitizeReturnTo } from "@/features/auth/safe-return-to";
import { createServerSupabaseClient } from "@/shared/supabase/server-client";

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

  const supabase = await createServerSupabaseClient();

  if (code !== null) {
    const exchange = await supabase.auth.exchangeCodeForSession(code);
    if (exchange.error === null && exchange.data.session !== null) {
      // Let proxy.ts perform the application-role check after session cookies
      // have reached the browser.
      return NextResponse.redirect(new URL(next, redirectOrigin));
    }
  }

  const claims = await supabase.auth.getClaims();
  if (claims.error === null && claims.data?.claims.sub !== undefined) {
    return NextResponse.redirect(new URL(next, redirectOrigin));
  }

  return NextResponse.redirect(new URL("/auth/auth-code-error", redirectOrigin));
}
