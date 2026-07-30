import { createClient } from "@supabase/supabase-js";

import type { IdentityProvider } from "../../application/authentication/authentication-service.js";
import { IdentityProviderUnavailableError } from "../../application/errors/authentication-errors.js";

export interface SupabaseIdentityProviderOptions {
  readonly url: string;
  readonly publishableKey: string;
}

function isAuthenticationRejection(status: number | undefined): boolean {
  return status !== undefined && status >= 400 && status < 500;
}

export function createSupabaseIdentityProvider(
  options: SupabaseIdentityProviderOptions,
): IdentityProvider {
  const client = createClient(options.url, options.publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const provider: IdentityProvider = {
    async verifyAccessToken(accessToken: string) {
      try {
        const { data, error } = await client.auth.getUser(accessToken);

        if (error !== null) {
          if (isAuthenticationRejection(error.status)) {
            return null;
          }

          throw new IdentityProviderUnavailableError(error);
        }

        if (data.user === null) {
          return null;
        }

        return Object.freeze({
          subject: data.user.id,
          email: data.user.email ?? null,
        });
      } catch (error) {
        if (error instanceof IdentityProviderUnavailableError) {
          throw error;
        }

        throw new IdentityProviderUnavailableError(error);
      }
    },
  };

  return Object.freeze(provider);
}
