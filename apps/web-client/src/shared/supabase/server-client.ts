import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { readWebEnv } from "@/config/env";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const config = readWebEnv();

  return createServerClient(config.supabase.url, config.supabase.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        } catch {
          // Server Components cannot write cookies; proxy.ts performs refresh writes.
        }
      },
    },
  });
}
