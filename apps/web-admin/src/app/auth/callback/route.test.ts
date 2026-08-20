import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getClaims: vi.fn(),
}));

vi.mock("@/config/server-env", () => ({
  readServerWebEnv: () => ({ appOrigin: "http://localhost:3001" }),
}));

vi.mock("@/shared/supabase/server-client", () => ({
  createServerSupabaseClient: async () => ({
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      getClaims: mocks.getClaims,
    },
  }),
}));

import { GET } from "./route";

describe("web-admin auth callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getClaims.mockResolvedValue({ data: { claims: null }, error: new Error("missing") });
  });

  it("persists the session before the proxy performs the admin role check", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "synthetic-token" } },
      error: null,
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await GET(
      new Request("http://localhost:3001/auth/callback?code=one-time&next=%2Frecipes"),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3001/recipes");
    expect(mocks.getClaims).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("recovers a repeated callback only for an existing valid session", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: new Error("code already consumed"),
    });
    mocks.getClaims.mockResolvedValue({
      data: { claims: { sub: "synthetic-subject" } },
      error: null,
    });

    const response = await GET(new Request("http://localhost:3001/auth/callback?code=one-time"));

    expect(response.headers.get("location")).toBe("http://localhost:3001/");
  });

  it("rejects a callback without a valid code or session", async () => {
    const response = await GET(new Request("http://localhost:3001/auth/callback"));

    expect(response.headers.get("location")).toBe("http://localhost:3001/auth/auth-code-error");
  });
});
