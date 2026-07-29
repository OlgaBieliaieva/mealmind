import { AppError } from "../../application/errors/app-error.js";

export class InvalidJsonError extends AppError {
  constructor(cause?: unknown) {
    super({
      code: "INVALID_JSON",
      statusCode: 400,
      message: "Request body contains invalid JSON",
      cause,
    });
  }
}
