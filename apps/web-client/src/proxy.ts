import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { readWebEnv } from "@/config/env";
import { sanitizeReturnTo } from "@/features/auth/safe-return-to";

const PUBLIC_AUTH_PATHS = new Set([
  "/auth/callback",
  "/auth/check-email",
  "/auth/auth-code-error",
  "/auth/forgot-password",
  "/auth/update-password",
]);

function copyCookies(source: NextResponse, target: NextResponse): NextResponse {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
  return target;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = readWebEnv();
  const supabase = createServerClient(config.supabase.url, config.supabase.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) request.cookies.set(cookie.name, cookie.value);
        response = NextResponse.next({ request });
        for (const cookie of cookiesToSet) {
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });

  const claimsResult = await supabase.auth.getClaims();
  const isAuthenticated =
    claimsResult.error === null && claimsResult.data?.claims.sub !== undefined;
  const pathname = request.nextUrl.pathname;
  const isEntryPage = pathname === "/auth/sign-in" || pathname === "/auth/sign-up";

  if (isAuthenticated && isEntryPage) {
    const target = sanitizeReturnTo(request.nextUrl.searchParams.get("returnTo"));
    return copyCookies(response, NextResponse.redirect(new URL(target, request.url)));
  }

  if (!isAuthenticated && !isEntryPage && !PUBLIC_AUTH_PATHS.has(pathname)) {
    const signInUrl = new URL("/auth/sign-in", request.url);
    signInUrl.searchParams.set(
      "returnTo",
      sanitizeReturnTo(`${pathname}${request.nextUrl.search}`),
    );
    return copyCookies(response, NextResponse.redirect(signInUrl));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
