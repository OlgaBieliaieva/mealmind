import type { Server } from "node:http";

export const JSON_BODY_LIMIT = "256kb";

export const HTTP_SERVER_POLICY = Object.freeze({
  requestTimeoutMs: 30_000,
  headersTimeoutMs: 15_000,
  keepAliveTimeoutMs: 5_000,
  keepAliveTimeoutBufferMs: 1_000,
  socketTimeoutMs: 30_000,
  maxHeadersCount: 100,
});

export function configureHttpServer(server: Server): void {
  server.requestTimeout = HTTP_SERVER_POLICY.requestTimeoutMs;
  server.headersTimeout = HTTP_SERVER_POLICY.headersTimeoutMs;
  server.keepAliveTimeout = HTTP_SERVER_POLICY.keepAliveTimeoutMs;
  server.keepAliveTimeoutBuffer = HTTP_SERVER_POLICY.keepAliveTimeoutBufferMs;
  server.timeout = HTTP_SERVER_POLICY.socketTimeoutMs;
  server.maxHeadersCount = HTTP_SERVER_POLICY.maxHeadersCount;
}
