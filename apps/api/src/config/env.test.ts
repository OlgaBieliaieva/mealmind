import { describe, expect, it } from "vitest";

import { parseApiEnv } from "./env.js";

const validEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "development",
  PORT: "3002",
  API_ORIGIN: "http://127.0.0.1:3002",
  CORS_ALLOWED_ORIGINS: "http://127.0.0.1:3000,http://127.0.0.1:3001",
  DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  SUPABASE_SECRET_KEY: "sb_secret_test",
};

describe("parseApiEnv", () => {
  it("returns a typed immutable configuration", () => {
    const config = parseApiEnv(validEnvironment);

    expect(config).toEqual({
      nodeEnv: "development",
      port: 3002,
      apiOrigin: "http://127.0.0.1:3002",
      corsAllowedOrigins: ["http://127.0.0.1:3000", "http://127.0.0.1:3001"],
      databaseUrl: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      supabase: {
        url: "http://127.0.0.1:54321",
        publishableKey: "sb_publishable_test",
        secretKey: "sb_secret_test",
      },
    });

    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.corsAllowedOrigins)).toBe(true);
    expect(Object.isFrozen(config.supabase)).toBe(true);
  });

  it("converts PORT to a number", () => {
    const config = parseApiEnv({
      ...validEnvironment,
      PORT: "4100",
    });

    expect(config.port).toBe(4100);
  });

  it("fails when a required variable is missing", () => {
    const environment = {
      ...validEnvironment,
      DATABASE_URL: undefined,
    };

    expect(() => parseApiEnv(environment)).toThrow(
      "Invalid API environment variables: DATABASE_URL",
    );
  });

  it("rejects an invalid HTTP URL", () => {
    const environment = {
      ...validEnvironment,
      SUPABASE_URL: "ftp://127.0.0.1:54321",
    };

    expect(() => parseApiEnv(environment)).toThrow(
      "Invalid API environment variables: SUPABASE_URL",
    );
  });

  it("rejects a port outside the valid range", () => {
    const environment = {
      ...validEnvironment,
      PORT: "70000",
    };

    expect(() => parseApiEnv(environment)).toThrow("Invalid API environment variables: PORT");
  });

  it("normalizes and deduplicates CORS origins", () => {
    const config = parseApiEnv({
      ...validEnvironment,
      CORS_ALLOWED_ORIGINS:
        " http://127.0.0.1:3000/ , http://127.0.0.1:3001 , http://127.0.0.1:3000 ",
    });

    expect(config.corsAllowedOrigins).toEqual(["http://127.0.0.1:3000", "http://127.0.0.1:3001"]);
  });

  it("reports variable names without exposing secret values", () => {
    const databaseUrl = "mysql://sensitive-user:sensitive-password@private-host/database";
    const secretKey = "sb_secret_must-not-appear-in-error";

    const environment = {
      ...validEnvironment,
      DATABASE_URL: databaseUrl,
      SUPABASE_URL: "not-a-valid-supabase-url",
      SUPABASE_SECRET_KEY: secretKey,
    };

    let thrownError: unknown;

    try {
      parseApiEnv(environment);
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(Error);

    const message = thrownError instanceof Error ? thrownError.message : "";

    expect(message).toContain("DATABASE_URL");
    expect(message).toContain("SUPABASE_URL");
    expect(message).not.toContain(databaseUrl);
    expect(message).not.toContain(secretKey);
    expect(message).not.toContain("sensitive-password");
  });
});
