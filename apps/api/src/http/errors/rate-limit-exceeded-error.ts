import { AppError } from "../../application/errors/app-error.js";

export class RateLimitExceededError extends AppError {
  constructor() {
    super({
      code: "RATE_LIMIT_EXCEEDED",
      statusCode: 429,
      message: "Too many requests",
    });
  }
}
