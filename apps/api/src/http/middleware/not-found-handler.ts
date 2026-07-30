import type { RequestHandler } from "express";

import { RouteNotFoundError } from "../errors/route-not-found-error.js";

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new RouteNotFoundError());
};
