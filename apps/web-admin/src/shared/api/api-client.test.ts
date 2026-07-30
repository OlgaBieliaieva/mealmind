import { describe, expect, it, vi } from "vitest";

import { createApiClient, type FetchImplementation } from "./api-client";

describe("API client", () => {
  it("adds access token and request ID without trusting identity headers", async () => {
    const fetchImplementation = vi.fn<FetchImplementation>(async (_input, init) => {
      const headers = new Headers(init?.headers);

      expect(headers.get("authorization")).toBe("Bearer verified-access-token");
      expect(headers.get("x-request-id")).toBe("request-123");
      expect(headers.get("x-user-id")).toBeNull();
      expect(headers.get("x-family-id")).toBeNull();

      return new Response(
        JSON.stringify({
          data: {
            status: "ok",
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    });

    const client = createApiClient({
      baseUrl: "https://api.example.test/",
      accessTokenProvider: {
        async getAccessToken() {
          return "verified-access-token";
        },
      },
      fetchImplementation,
      createRequestId: () => "request-123",
    });

    const result = await client.get<{
      readonly data: {
        readonly status: string;
      };
    }>("/api/v1/session", {
      headers: {
        authorization: "Bearer forged-token",
        "x-user-id": "forged-user",
        "x-family-id": "forged-family",
      },
    });

    expect(result).toEqual({
      data: {
        status: "ok",
      },
    });
  });

  it("maps the API error contract", async () => {
    const client = createApiClient({
      baseUrl: "https://api.example.test",
      accessTokenProvider: {
        async getAccessToken() {
          return null;
        },
      },
      fetchImplementation: async () =>
        new Response(
          JSON.stringify({
            error: {
              code: "AUTHENTICATION_REQUIRED",
              message: "Authentication is required",
            },
          }),
          {
            status: 401,
            headers: {
              "content-type": "application/json",
              "x-request-id": "request-401",
            },
          },
        ),
      createRequestId: () => "request-123",
    });

    await expect(client.get("/api/v1/session")).rejects.toEqual(
      expect.objectContaining({
        code: "AUTHENTICATION_REQUIRED",
        statusCode: 401,
        requestId: "request-401",
      }),
    );
  });

  it("rejects an absolute or protocol-relative path", async () => {
    const fetchImplementation = vi.fn<FetchImplementation>();

    const client = createApiClient({
      baseUrl: "https://api.example.test",
      accessTokenProvider: {
        async getAccessToken() {
          return null;
        },
      },
      fetchImplementation,
    });

    await expect(client.get("https://untrusted.example/path")).rejects.toThrow(
      "API path must be an application-relative path",
    );

    await expect(client.get("//untrusted.example/path")).rejects.toThrow(
      "API path must be an application-relative path",
    );

    expect(fetchImplementation).not.toHaveBeenCalled();
  });
});
