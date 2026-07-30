import cors from "cors";
import type { RequestHandler } from "express";

export function createCorsMiddleware(allowedOrigins: readonly string[]): RequestHandler {
  const allowedOriginSet = new Set(allowedOrigins);

  return cors({
    origin(origin, callback) {
      if (origin === undefined || allowedOriginSet.has(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
    credentials: false,
    maxAge: 600,
    optionsSuccessStatus: 204,
  });
}
