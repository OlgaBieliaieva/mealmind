import { type Request, type RequestHandler, type Response } from "express";
import { z } from "zod";

import { RequestValidationError } from "../errors/request-validation-error.js";

export interface RequestEnvelope {
  readonly params: unknown;
  readonly query: unknown;
  readonly body: unknown;
}

export type ValidatedRequestHandler<TInput> = (
  input: TInput,
  request: Request,
  response: Response,
) => void | Promise<void>;

export function validateRequest<TSchema extends z.ZodType>(
  schema: TSchema,
  handler: ValidatedRequestHandler<z.output<TSchema>>,
): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const result = await schema.safeParseAsync({
        params: request.params,
        query: request.query,
        body: request.body,
      } satisfies RequestEnvelope);

      if (!result.success) {
        next(RequestValidationError.fromZodError(result.error));
        return;
      }

      await handler(result.data, request, response);
    } catch (error) {
      next(error);
    }
  };
}
