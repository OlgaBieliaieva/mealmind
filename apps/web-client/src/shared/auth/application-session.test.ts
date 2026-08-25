import { describe, expect, it, vi } from "vitest";

import { readOrBootstrapApplicationSession } from "./application-session";

type SessionRequest = (input: string, init: RequestInit) => Promise<Response>;

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("readOrBootstrapApplicationSession", () => {
  it("reads an existing application session without calling bootstrap", async () => {
    const request = vi.fn<SessionRequest>(async () =>
      jsonResponse(200, { data: { user: { id: "user-id" } } }),
    );

    const response = await readOrBootstrapApplicationSession(
      "http://127.0.0.1:3002/",
      "access-token",
      request,
    );

    expect(response.status).toBe(200);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0]).toBe("http://127.0.0.1:3002/api/v1/session");
  });

  it("bootstraps only when the verified identity has no local account", async () => {
    const request = vi
      .fn<SessionRequest>()
      .mockResolvedValueOnce(jsonResponse(403, { error: { code: "ACCOUNT_ACCESS_DENIED" } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { user: { id: "user-id" } } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { onboardingCompleted: false } }));

    const response = await readOrBootstrapApplicationSession(
      "http://127.0.0.1:3002",
      "access-token",
      request,
    );

    expect(response.status).toBe(200);
    expect(request.mock.calls.map(([url]) => url)).toEqual([
      "http://127.0.0.1:3002/api/v1/session",
      "http://127.0.0.1:3002/api/v1/account/bootstrap",
      "http://127.0.0.1:3002/api/v1/session",
    ]);
  });

  it("does not bootstrap for an unrelated forbidden response", async () => {
    const request = vi.fn<SessionRequest>(async () =>
      jsonResponse(403, { error: { code: "FAMILY_ACCESS_DENIED" } }),
    );

    const response = await readOrBootstrapApplicationSession(
      "http://127.0.0.1:3002",
      "access-token",
      request,
    );

    expect(response.status).toBe(403);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("returns a bootstrap rate-limit response without retrying", async () => {
    const request = vi
      .fn<SessionRequest>()
      .mockResolvedValueOnce(jsonResponse(403, { error: { code: "ACCOUNT_ACCESS_DENIED" } }))
      .mockResolvedValueOnce(jsonResponse(429, { error: { code: "RATE_LIMIT_EXCEEDED" } }));

    const response = await readOrBootstrapApplicationSession(
      "http://127.0.0.1:3002",
      "access-token",
      request,
    );

    expect(response.status).toBe(429);
    expect(request).toHaveBeenCalledTimes(2);
  });
});
