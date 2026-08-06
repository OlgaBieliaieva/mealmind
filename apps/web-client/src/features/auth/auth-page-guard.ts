import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/shared/supabase/server-client";

import { sanitizeReturnTo } from "./safe-return-to";

export async function redirectAuthenticatedUser(returnTo?: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error === null && data?.claims.sub !== undefined) {
    redirect(sanitizeReturnTo(returnTo));
  }
}
