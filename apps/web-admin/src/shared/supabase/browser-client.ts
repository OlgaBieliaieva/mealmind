import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { WebConfig } from "@/config/env";

let browserClient: SupabaseClient | undefined;

export function getBrowserSupabaseClient(config: WebConfig): SupabaseClient {
  browserClient ??= createBrowserClient(config.supabase.url, config.supabase.publishableKey);

  return browserClient;
}
