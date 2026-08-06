import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { readWebEnv } from "@/config/env";
import { sanitizeReturnTo } from "@/features/auth/safe-return-to";

const PUBLIC_PATHS = new Set([
  "/auth/callback",
  "/auth/access-denied",
  "/auth/auth-code-error",
  "/auth/forgot-password",
  "/auth/update-password",
]);

function copyCookies(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie);
  return target;
}

async function readRole(apiUrl: string, token: string): Promise<"ADMIN" | "USER" | null> {
  try {
    const response = await fetch(`${apiUrl.replace(/\/+$/, "")}/api/v1/session`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      readonly data?: { readonly user?: { readonly applicationRole?: unknown } };
    };
    const role = payload.data?.user?.applicationRole;
    return role === "ADMIN" || role === "USER" ? role : null;
  } catch {
    return null;
  }
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
        for (const cookie of cookiesToSet)
          response.cookies.set(cookie.name, cookie.value, cookie.options);
      },
    },
  });

  const claims = await supabase.auth.getClaims();
  const authenticated = claims.error === null && claims.data?.claims.sub !== undefined;
  const pathname = request.nextUrl.pathname;
  const isSignIn = pathname === "/auth/sign-in";

  if (!authenticated) {
    if (isSignIn || PUBLIC_PATHS.has(pathname)) return response;
    const target = new URL("/auth/sign-in", request.url);
    target.searchParams.set("returnTo", sanitizeReturnTo(`${pathname}${request.nextUrl.search}`));
    return copyCookies(response, NextResponse.redirect(target));
  }

  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  const role = token === undefined ? null : await readRole(config.apiUrl, token);

  if (role === "ADMIN") {
    if (isSignIn || pathname === "/auth/access-denied") {
      return copyCookies(response, NextResponse.redirect(new URL("/", request.url)));
    }
    return response;
  }

  if (pathname !== "/auth/access-denied" && !PUBLIC_PATHS.has(pathname)) {
    return copyCookies(
      response,
      NextResponse.redirect(new URL("/auth/access-denied", request.url)),
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
