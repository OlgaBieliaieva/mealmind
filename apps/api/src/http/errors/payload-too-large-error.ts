import { AppError } from "../../application/errors/app-error.js";

export class PayloadTooLargeError extends AppError {
  constructor(cause?: unknown) {
    super({
      code: "PAYLOAD_TOO_LARGE",
      statusCode: 413,
      message: "Request body exceeds the allowed size",
      cause,
    });
  }
}
