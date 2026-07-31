import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnvironment = process.env;

describe("resolveApiRelease", () => {
  afterEach(() => {
    process.env = originalEnvironment;
    vi.resetModules();
  });

  it("uses explicit SENTRY_RELEASE when provided", async () => {
    process.env = {
      ...originalEnvironment,
      SENTRY_RELEASE: "api@manual",
      RENDER_GIT_COMMIT: "render-sha",
    };

    const { resolveApiRelease } = await import("./release.js");

    expect(resolveApiRelease()).toBe("api@manual");
  });

  it("builds API release from Render commit SHA", async () => {
    process.env = {
      ...originalEnvironment,
      SENTRY_RELEASE: "",
      RENDER_GIT_COMMIT: "render-sha",
    };

    const { resolveApiRelease } = await import("./release.js");

    expect(resolveApiRelease()).toBe("api@render-sha");
  });

  it("returns undefined when release cannot be resolved", async () => {
    process.env = {
      ...originalEnvironment,
      SENTRY_RELEASE: "",
      RENDER_GIT_COMMIT: "",
      GITHUB_SHA: "",
      VERCEL_GIT_COMMIT_SHA: "",
    };

    const { resolveApiRelease } = await import("./release.js");

    expect(resolveApiRelease()).toBeUndefined();
  });
});