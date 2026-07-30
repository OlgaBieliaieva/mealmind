import { describe, expect, it } from "vitest";

import { ApiClientError } from "@/shared/api/api-error";

import { makeQueryClient, shouldRetryQuery } from "./query-client";

describe("query client policy", () => {
  it("retries network and server failures at most twice", () => {
    expect(shouldRetryQuery(0, new TypeError("Network error"))).toBe(true);
    expect(shouldRetryQuery(1, new TypeError("Network error"))).toBe(true);
    expect(shouldRetryQuery(2, new TypeError("Network error"))).toBe(false);

    const serverError = new ApiClientError({
      statusCode: 503,
      code: "SERVICE_UNAVAILABLE",
      message: "Service unavailable",
    });

    expect(shouldRetryQuery(0, serverError)).toBe(true);
    expect(shouldRetryQuery(2, serverError)).toBe(false);
  });

  it("does not retry client, authentication or rate-limit errors", () => {
    for (const statusCode of [400, 401, 403, 404, 409, 422, 429]) {
      const error = new ApiClientError({
        statusCode,
        code: "REQUEST_FAILED",
        message: "Request failed",
      });

      expect(shouldRetryQuery(0, error)).toBe(false);
    }
  });

  it("disables mutation retries", () => {
    const queryClient = makeQueryClient();

    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false);
  });
});
