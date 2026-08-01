import { describe, expect, it } from "vitest";

import { resolveSentryRuntimeConfig } from "./sentry-runtime-config.js";

describe("Sentry runtime config", () => {
  it("disables Sentry when DSN is missing", () => {
    expect(
      resolveSentryRuntimeConfig({
        application: "web-client",
        runtime: "browser",
        dsn: undefined,
        environment: undefined,
        release: undefined,
      }),
    ).toEqual({
      enabled: false,
    });
  });

  it("enables Sentry with validated DSN and policy metadata", () => {
    expect(
      resolveSentryRuntimeConfig({
        application: "api",
        runtime: "node",
        dsn: " https://public@example.ingest.sentry.io/123 ",
        environment: "staging",
        release: "api@abc123",
        requestId: "request-123",
      }),
    ).toEqual({
      enabled: true,
      dsn: "https://public@example.ingest.sentry.io/123",
      policy: {
        environment: "staging",
        release: "api@abc123",
        sendDefaultPii: false,
        tracesSampleRate: 0,
        tags: {
          application: "api",
          runtime: "node",
          request_id: "request-123",
        },
      },
    });
  });

  it("rejects invalid environment names without exposing configuration values", () => {
    expect(() =>
      resolveSentryRuntimeConfig({
        application: "api",
        runtime: "node",
        dsn: "https://public@example.ingest.sentry.io/123",
        environment: "local-secret-value",
        release: "api@abc123",
      }),
    ).toThrow("Invalid Sentry runtime configuration: environment");
  });

  it("rejects non-HTTPS DSN values", () => {
    expect(() =>
      resolveSentryRuntimeConfig({
        application: "api",
        runtime: "node",
        dsn: "http://public@example.ingest.sentry.io/123",
        environment: "staging",
        release: "api@abc123",
      }),
    ).toThrow("Invalid Sentry runtime configuration: dsn");
  });

  it("rejects enabled Sentry config without release", () => {
    expect(() =>
      resolveSentryRuntimeConfig({
        application: "api",
        runtime: "node",
        dsn: "https://public@example.ingest.sentry.io/123",
        environment: "staging",
        release: "",
      }),
    ).toThrow("Invalid Sentry runtime configuration: release");
  });
});
