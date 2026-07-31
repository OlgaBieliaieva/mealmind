import { describe, expect, it } from "vitest";

import {
  createSentryEventPolicy,
  createSentryRelease,
  sanitizeSentryEvent,
} from "./sentry-event-policy.js";

describe("Sentry event policy", () => {
  it("creates deterministic application releases", () => {
    expect(createSentryRelease("web-client", "abc123")).toBe("web-client@abc123");
  });

  it("creates privacy-preserving metadata tags", () => {
    const policy = createSentryEventPolicy({
      application: "api",
      runtime: "node",
      environment: "staging",
      release: "api@abc123",
      requestId: " request-123 ",
    });

    expect(policy).toEqual({
      environment: "staging",
      release: "api@abc123",
      sendDefaultPii: false,
      tracesSampleRate: 0,
      tags: {
        application: "api",
        runtime: "node",
        request_id: "request-123",
      },
    });
  });

  it("rejects releases that do not belong to the application", () => {
    expect(() =>
      createSentryEventPolicy({
        application: "web-admin",
        runtime: "browser",
        environment: "preview",
        release: "web-client@abc123",
      }),
    ).toThrow("release must follow the web-admin@<git-sha> format");
  });

  it("removes request payloads, unsafe headers, and health profile data", () => {
    const event = {
      message:
        "Failed for user olga@example.com with Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature",
      request: {
        url: "https://app.example.test/api/v1/meals?token=secret-token#fragment",
        headers: {
          accept: "application/json",
          authorization: "Bearer secret-token",
          cookie: "session=secret-cookie",
          "x-request-id": "request-123",
        },
        body: {
          email: "olga@example.com",
          weightKg: 65,
          meal: "Breakfast",
        },
        cookies: {
          session: "secret-cookie",
        },
        query: {
          token: "secret-token",
        },
      },
      contexts: {
        profile: {
          firstName: "Olga",
          allergies: ["peanut"],
          safeField: "kept",
        },
      },
      extra: {
        databaseUrl: "postgresql://user:password@localhost/mealmind",
        nested: {
          notes: "Contact olga@example.com",
        },
      },
    };

    const sanitized = sanitizeSentryEvent(event);
    const serialized = JSON.stringify(sanitized);

    expect(sanitized.request).toEqual({
      url: "https://app.example.test/api/v1/meals",
      headers: {
        accept: "application/json",
        "x-request-id": "request-123",
      },
    });
    expect(sanitized.contexts.profile).toEqual({
      safeField: "kept",
    });
    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toContain("secret-cookie");
    expect(serialized).not.toContain("postgresql://");
    expect(serialized).not.toContain("olga@example.com");
    expect(serialized).not.toContain("weightKg");
    expect(serialized).not.toContain("peanut");
    expect(serialized).toContain("[Filtered email]");
  });

  it("omits local variables and attachments", () => {
    const sanitized = sanitizeSentryEvent({
      exception: {
        values: [
          {
            stacktrace: {
              frames: [
                {
                  filename: "server.ts",
                  vars: {
                    password: "secret",
                  },
                },
              ],
            },
          },
        ],
      },
      attachments: [
        {
          filename: "request.json",
        },
      ],
    });

    expect(JSON.stringify(sanitized)).not.toContain("secret");
    expect(JSON.stringify(sanitized)).not.toContain("request.json");
  });
});
