import { AppError } from "../../../application/errors/app-error.js";

export class FoodNotFoundError extends AppError {
  constructor() {
    super({
      code: "FOOD_NOT_FOUND",
      statusCode: 404,
      message: "Food item was not found",
    });
  }
}
