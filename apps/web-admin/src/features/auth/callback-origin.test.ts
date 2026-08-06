import { describe, expect, it } from "vitest";

import { resolveCallbackOrigin } from "./callback-origin";

describe("admin resolveCallbackOrigin", () => {
  it("allows the configured local loopback alias only in development", () => {
    expect(
      resolveCallbackOrigin("http://127.0.0.1:3001/auth/callback", "http://localhost:3001", true),
    ).toBe("http://127.0.0.1:3001");
    expect(
      resolveCallbackOrigin(
        "https://attacker.example/auth/callback",
        "https://admin.mealmind.example",
        false,
      ),
    ).toBe("https://admin.mealmind.example");
  });
});
