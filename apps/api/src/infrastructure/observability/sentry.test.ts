import { beforeEach, describe, expect, it, vi } from "vitest";

const init = vi.fn();
const flush = vi.fn(async () => true);
const captureException = vi.fn();
const withScope = vi.fn((callback: (scope: unknown) => void) => {
  callback({
    setTags: vi.fn(),
    setLevel: vi.fn(),
  });
});

vi.mock("@sentry/node", () => ({
  init,
  flush,
  captureException,
  withScope,
}));

describe("API Sentry integration", () => {
  beforeEach(() => {
    init.mockClear();
    flush.mockClear();
    captureException.mockClear();
    withScope.mockClear();
  });

  it("disables Sentry when DSN is not configured", async () => {
    const { initializeApiSentry } = await import("./sentry.js");

    initializeApiSentry({
      dsn: undefined,
      environment: undefined,
      release: undefined,
    });

    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        sendDefaultPii: false,
        tracesSampleRate: 0,
        enableLogs: false,
      }),
    );
  });

  it("enables Sentry with sanitized policy when DSN is configured", async () => {
    const { initializeApiSentry } = await import("./sentry.js");

    initializeApiSentry({
      dsn: "https://public@example.ingest.sentry.io/123",
      environment: "staging",
      release: "api@abc123",
    });

    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://public@example.ingest.sentry.io/123",
        enabled: true,
        environment: "staging",
        release: "api@abc123",
        sendDefaultPii: false,
        tracesSampleRate: 0,
        enableLogs: false,
        attachStacktrace: true,
      }),
    );
  });

  it("captures API exceptions without attaching request payloads", async () => {
    const { captureApiException } = await import("./sentry.js");
    const error = new Error("Unexpected failure");

    captureApiException(error, {
      level: "error",
      tags: {
        component: "api",
      },
    });

    expect(withScope).toHaveBeenCalledOnce();
    expect(captureException).toHaveBeenCalledWith(error);
  });

  it("flushes pending events during shutdown", async () => {
    const { flushApiSentry } = await import("./sentry.js");

    await flushApiSentry();

    expect(flush).toHaveBeenCalledWith(2_000);
  });
});
