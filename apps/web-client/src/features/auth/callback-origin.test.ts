import { describe, expect, it } from "vitest";

import { resolveCallbackOrigin } from "./callback-origin";

describe("resolveCallbackOrigin", () => {
  it("keeps an allowlisted loopback alias during local PKCE callback", () => {
    expect(
      resolveCallbackOrigin(
        "http://127.0.0.1:3000/auth/callback?code=secret",
        "http://localhost:3000",
        true,
      ),
    ).toBe("http://127.0.0.1:3000");
  });

  it("uses the configured origin in production", () => {
    expect(
      resolveCallbackOrigin(
        "https://attacker.example/auth/callback",
        "https://app.mealmind.example",
        false,
      ),
    ).toBe("https://app.mealmind.example");
  });
});
