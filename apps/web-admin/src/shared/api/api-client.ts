import { ApiClientError, type ApiErrorIssue } from "./api-error";

export interface AccessTokenProvider {
  getAccessToken(): Promise<string | null>;
}

export type FetchImplementation = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface CreateApiClientOptions {
  readonly baseUrl: string;
  readonly accessTokenProvider: AccessTokenProvider;
  readonly fetchImplementation?: FetchImplementation;
  readonly createRequestId?: () => string;
}

export interface ApiRequestOptions {
  readonly method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly body?: unknown;
  readonly headers?: HeadersInit;
  readonly signal?: AbortSignal;
}

interface ApiErrorPayload {
  readonly error?: {
    readonly code?: unknown;
    readonly message?: unknown;
    readonly issues?: unknown;
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function assertSafePath(path: string): void {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("API path must be an application-relative path");
  }
}

function parseIssues(value: unknown): readonly ApiErrorIssue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((issue): ApiErrorIssue[] => {
    if (
      typeof issue === "object" &&
      issue !== null &&
      "path" in issue &&
      "code" in issue &&
      "message" in issue &&
      typeof issue.path === "string" &&
      typeof issue.code === "string" &&
      typeof issue.message === "string"
    ) {
      return [
        {
          path: issue.path,
          code: issue.code,
          message: issue.message,
        },
      ];
    }

    return [];
  });
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const responseText = await response.text();

  if (responseText.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    throw new ApiClientError({
      statusCode: response.status,
      code: "INVALID_API_RESPONSE",
      message: "API returned invalid JSON",
      ...(() => {
        const requestId = response.headers.get("x-request-id");

        return requestId === null ? {} : { requestId };
      })(),
    });
  }
}

function createResponseError(response: Response, payload: unknown): ApiClientError {
  const errorPayload =
    typeof payload === "object" && payload !== null
      ? (payload as ApiErrorPayload).error
      : undefined;

  return new ApiClientError({
    statusCode: response.status,
    code: typeof errorPayload?.code === "string" ? errorPayload.code : "HTTP_REQUEST_FAILED",
    message:
      typeof errorPayload?.message === "string" ? errorPayload.message : "HTTP request failed",
    ...(() => {
      const requestId = response.headers.get("x-request-id");

      return requestId === null ? {} : { requestId };
    })(),
    issues: parseIssues(errorPayload?.issues),
  });
}

export function createApiClient(options: CreateApiClientOptions) {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetchImplementation = options.fetchImplementation ?? globalThis.fetch.bind(globalThis);
  const createRequestId = options.createRequestId ?? (() => globalThis.crypto.randomUUID());

  async function request<TResponse>(
    path: string,
    requestOptions: ApiRequestOptions = {},
  ): Promise<TResponse> {
    assertSafePath(path);

    const headers = new Headers(requestOptions.headers);

    // Identity and family context are never accepted from arbitrary callers.
    headers.delete("authorization");
    headers.delete("x-user-id");
    headers.delete("x-family-id");
    headers.set("accept", "application/json");
    headers.set("x-request-id", createRequestId());

    const accessToken = await options.accessTokenProvider.getAccessToken();

    if (accessToken !== null) {
      headers.set("authorization", `Bearer ${accessToken}`);
    }

    const requestInit: RequestInit = {
      method: requestOptions.method ?? "GET",
      headers,
      credentials: "omit",
    };

    if (requestOptions.body !== undefined) {
      headers.set("content-type", "application/json");
      requestInit.body = JSON.stringify(requestOptions.body);
    }

    if (requestOptions.signal !== undefined) {
      requestInit.signal = requestOptions.signal;
    }

    const response = await fetchImplementation(`${baseUrl}${path}`, requestInit);

    const payload = await parseResponseBody(response);

    if (!response.ok) {
      throw createResponseError(response, payload);
    }

    return payload as TResponse;
  }

  return Object.freeze({
    request,

    get<TResponse>(
      path: string,
      options?: Omit<ApiRequestOptions, "method" | "body">,
    ): Promise<TResponse> {
      return request<TResponse>(path, {
        ...options,
        method: "GET",
      });
    },

    post<TResponse>(
      path: string,
      body: unknown,
      options?: Omit<ApiRequestOptions, "method" | "body">,
    ): Promise<TResponse> {
      return request<TResponse>(path, {
        ...options,
        method: "POST",
        body,
      });
    },

    patch<TResponse>(
      path: string,
      body: unknown,
      options?: Omit<ApiRequestOptions, "method" | "body">,
    ): Promise<TResponse> {
      return request<TResponse>(path, {
        ...options,
        method: "PATCH",
        body,
      });
    },

    delete<TResponse>(
      path: string,
      options?: Omit<ApiRequestOptions, "method" | "body">,
    ): Promise<TResponse> {
      return request<TResponse>(path, {
        ...options,
        method: "DELETE",
      });
    },
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;
