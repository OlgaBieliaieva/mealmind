import { readWebEnv } from "@/config/env";
import { getBrowserSupabaseClient } from "@/shared/supabase/browser-client";

import { createApiClient, type ApiClient } from "./api-client";

let browserApiClient: ApiClient | undefined;

export function getBrowserApiClient(): ApiClient {
  if (browserApiClient !== undefined) {
    return browserApiClient;
  }

  const config = readWebEnv();
  const supabase = getBrowserSupabaseClient(config);

  browserApiClient = createApiClient({
    baseUrl: config.apiUrl,

    accessTokenProvider: {
      async getAccessToken(): Promise<string | null> {
        const { data, error } = await supabase.auth.getSession();

        if (error !== null) {
          throw new Error("Unable to read the authentication session");
        }

        return data.session?.access_token ?? null;
      },
    },
  });

  return browserApiClient;
}
