import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getClaims: vi.fn(),
}));

vi.mock("@/config/server-env", () => ({
  readServerWebEnv: () => ({ appOrigin: "http://localhost:3000" }),
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

describe("web-client auth callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getClaims.mockResolvedValue({ data: { claims: null }, error: new Error("missing") });
  });

  it("redirects immediately after a successful code exchange", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "synthetic-token" } },
      error: null,
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await GET(
      new Request("http://localhost:3000/auth/callback?code=one-time&next=%2Frecipes"),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/recipes");
    expect(mocks.getClaims).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("continues a repeated callback when the browser already has a valid session", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: new Error("code already consumed"),
    });
    mocks.getClaims.mockResolvedValue({
      data: { claims: { sub: "synthetic-subject" } },
      error: null,
    });

    const response = await GET(
      new Request("http://localhost:3000/auth/callback?code=one-time&next=%2Ffamily"),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/family");
  });

  it("shows the stable error state without a valid code or session", async () => {
    const response = await GET(new Request("http://localhost:3000/auth/callback"));

    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost:3000/auth/auth-code-error");
  });
});
