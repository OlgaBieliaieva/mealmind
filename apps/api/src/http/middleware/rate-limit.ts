import type { Options } from "express-rate-limit";

import { RateLimitExceededError } from "../errors/rate-limit-exceeded-error.js";

export const API_RATE_LIMIT_WINDOW_MS = 60_000;
export const API_RATE_LIMIT_LIMIT = 120;

export interface ApiRateLimitOverrides {
  readonly windowMs?: number;
  readonly limit?: number;
}

export function createApiRateLimitOptions(overrides: ApiRateLimitOverrides = {}): Partial<Options> {
  return {
    windowMs: overrides.windowMs ?? API_RATE_LIMIT_WINDOW_MS,
    limit: overrides.limit ?? API_RATE_LIMIT_LIMIT,
    identifier: "mealmind-api",
    standardHeaders: "draft-8",
    legacyHeaders: false,
    passOnStoreError: false,

    handler(_request, _response, next): void {
      next(new RateLimitExceededError());
    },
  };
}
