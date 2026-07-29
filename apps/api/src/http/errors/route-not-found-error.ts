import { AppError } from "../../application/errors/app-error.js";

export class RouteNotFoundError extends AppError {
  constructor() {
    super({
      code: "ROUTE_NOT_FOUND",
      statusCode: 404,
      message: "Route not found",
    });
  }
}
