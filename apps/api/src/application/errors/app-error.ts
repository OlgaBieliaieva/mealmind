export interface AppErrorOptions {
  readonly code: string;
  readonly statusCode: number;
  readonly message: string;
  readonly cause?: unknown;
}

export abstract class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;

  protected constructor(options: AppErrorOptions) {
    super(
      options.message,
      options.cause === undefined
        ? undefined
        : {
            cause: options.cause,
          },
    );

    this.name = new.target.name;
    this.code = options.code;
    this.statusCode = options.statusCode;
  }
}
