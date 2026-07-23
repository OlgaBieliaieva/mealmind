import { describe, expect, it } from "vitest";

import { parseWebEnv, type PublicWebEnvironment } from "./env";

const validEnvironment: PublicWebEnvironment = {
  NEXT_PUBLIC_API_URL: "http://127.0.0.1:3002",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};

describe("parseWebEnv", () => {
  it("returns an immutable public configuration", () => {
    const config = parseWebEnv(validEnvironment);

    expect(config).toEqual({
      apiUrl: "http://127.0.0.1:3002",
      supabase: {
        url: "http://127.0.0.1:54321",
        publishableKey: "sb_publishable_test",
      },
    });

    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.supabase)).toBe(true);
  });

  it("fails when NEXT_PUBLIC_API_URL is missing", () => {
    const environment: PublicWebEnvironment = {
      ...validEnvironment,
      NEXT_PUBLIC_API_URL: undefined,
    };

    expect(() => parseWebEnv(environment)).toThrow(
      "Invalid web-client environment variables: NEXT_PUBLIC_API_URL",
    );
  });

  it("rejects an invalid Supabase URL", () => {
    const environment: PublicWebEnvironment = {
      ...validEnvironment,
      NEXT_PUBLIC_SUPABASE_URL: "ftp://127.0.0.1:54321",
    };

    expect(() => parseWebEnv(environment)).toThrow(
      "Invalid web-client environment variables: NEXT_PUBLIC_SUPABASE_URL",
    );
  });

  it("does not expose variable values in validation errors", () => {
    const publishableKey = "sb_publishable_must-not-appear-in-error";
    const invalidUrl = "invalid-sensitive-supabase-url";

    const environment: PublicWebEnvironment = {
      ...validEnvironment,
      NEXT_PUBLIC_SUPABASE_URL: invalidUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    };

    let thrownError: unknown;

    try {
      parseWebEnv(environment);
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(Error);

    const message = thrownError instanceof Error ? thrownError.message : "";

    expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(message).not.toContain(invalidUrl);
    expect(message).not.toContain(publishableKey);
  });

  it("does not include server-only variables in the result", () => {
    const serverSecret = "sb_secret_server-only";

    const environment = {
      ...validEnvironment,
      SUPABASE_SECRET_KEY: serverSecret,
    };

    const config = parseWebEnv(environment);

    expect(config).not.toHaveProperty("SUPABASE_SECRET_KEY");
    expect(config.supabase).not.toHaveProperty("secretKey");
    expect(JSON.stringify(config)).not.toContain(serverSecret);
  });
});
